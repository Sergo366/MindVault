import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

/**
 * Fetches current market prices from Twelve Data
 * (https://api.twelvedata.com/price) and caches each ticker's price in Redis.
 *
 * getPrices() flow:
 *   1. read every requested ticker from Redis first;
 *   2. keep only the tickers that are not cached (or whose cached value is
 *      unusable) in `missing`;
 *   3. skip the network entirely when `missing` is empty;
 *   4. otherwise fetch just the misses in a single batched request and write
 *      the results back to Redis with a TTL.
 *
 * Properties that fall out of this design:
 * - Cache hits never trigger an HTTP request.
 * - Adding a new ticker only fetches that ticker, not the whole portfolio.
 * - Failed symbols are not cached, so the next call retries them.
 * - Redis being unavailable is non-fatal: get() returns null, every ticker
 *   becomes a miss, and the request falls through to Twelve Data.
 */
@Injectable()
export class TwelveDataService {
  private readonly logger = new Logger(TwelveDataService.name);
  private readonly baseUrl = 'https://api.twelvedata.com/price';
  private readonly cacheTtlSeconds = 3600; // 1 hour
  private readonly cacheKeyPrefix = 'prices:';

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns the latest price for each of the given tickers.
   *
   * Result keys are exactly the tickers that have a known price. Tickers that
   * couldn't be resolved are simply omitted from the map.
   */
  async getPrices(tickers: string[]): Promise<Record<string, number>> {
    const uniqueTickers = Array.from(
      new Set(tickers.map((t) => t.trim()).filter(Boolean)),
    );
    if (uniqueTickers.length === 0) return {};

    // Step 1 — cache-first lookup. Read every requested ticker from Redis
    // before any network call, so we know exactly which ones are missing.
    const lookups = await Promise.all(
      uniqueTickers.map(async (ticker) => {
        const value = await this.redisService.get(this.cacheKey(ticker));
        return { ticker, value } as const;
      }),
    );

    const prices: Record<string, number> = {};
    const missing: string[] = [];

    for (const { ticker, value } of lookups) {
      if (value === null) {
        missing.push(ticker);
        continue;
      }
      const price = Number(value);
      if (Number.isFinite(price) && price > 0) {
        prices[ticker] = price;
      } else {
        // Corrupt or unusable cached value: treat as a miss and refresh it.
        missing.push(ticker);
      }
    }

    this.logger.debug(
      `getPrices: ${prices.length} cache hit(s), ${missing.length} miss(es) of ${uniqueTickers.length}`,
    );

    // Step 2 — nothing to fetch: return what Redis gave us, no API call.
    if (missing.length === 0) return prices;

    // Step 3 — fetch ONLY the misses, in a single batched request.
    this.logger.debug(
      `getPrices: requesting ${missing.length} ticker(s): ${missing.join(', ')}`,
    );
    const fetched = await this.fetchPrices(missing);

    // Step 4 — write fresh prices back to Redis (with TTL) and merge them in.
    //          Failed symbols are absent from `fetched`, so they stay uncached
    //          and will be retried on the next call.
    await Promise.all(
      Object.entries(fetched).map(async ([ticker, price]) => {
        prices[ticker] = price;
        await this.redisService.set(
          this.cacheKey(ticker),
          String(price),
          this.cacheTtlSeconds,
        );
      }),
    );

    return prices;
  }

  private cacheKey(ticker: string): string {
    return `${this.cacheKeyPrefix}${ticker}`;
  }

  private async fetchPrices(
    tickers: string[],
  ): Promise<Record<string, number>> {
    const apiKey = this.configService.get<string>('TWELVE_DATA_API_KEY') ?? '';
    if (!apiKey) {
      this.logger.warn(
        'TWELVE_DATA_API_KEY is not configured; skipping price fetch',
      );
      return {};
    }

    // Twelve Data expects a single comma-separated `symbol` value. Encode each
    // ticker on its own so dots (e.g. BRK.B) and hyphens pass through
    // untouched while the commas stay meaningful as separators.
    const symbols = tickers.map((t) => encodeURIComponent(t)).join(',');
    const url = `${this.baseUrl}?symbol=${symbols}&apikey=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `Twelve Data request failed: HTTP ${response.status}`,
        );
        return {};
      }
      const payload: unknown = await response.json();
      return this.normalizeResponse(payload, tickers);
    } catch (error) {
      this.logger.error(
        `Twelve Data request threw: ${(error as Error).message}`,
      );
      return {};
    }
  }

  /**
   * Normalises the two response shapes Twelve Data returns for `/price`:
   *
   *   Single symbol: { "price": "123.45" }
   *   Batch:         { "AAPL": { "price": "123.45" }, "MSFT": { ... } }
   *   Error:         { "code": 401, "message": "...", "status": "error" }
   *
   * Failed symbols inside a batch are logged per-symbol and skipped without
   * dropping the successful ones.
   */
  private normalizeResponse(
    payload: unknown,
    requestedTickers: string[],
  ): Record<string, number> {
    const prices: Record<string, number> = {};
    if (!payload || typeof payload !== 'object') return prices;

    const root = payload as Record<string, unknown>;

    if (root.status === 'error' || typeof root.code === 'number') {
      this.logger.error(
        `Twelve Data error: ${String(root.message ?? 'unknown error')}`,
      );
      return prices;
    }

    // Single-symbol response.
    if (requestedTickers.length === 1 && 'price' in root) {
      const price = Number(root.price);
      if (Number.isFinite(price) && price > 0) {
        prices[requestedTickers[0]] = price;
      }
      return prices;
    }

    // Batch response.
    for (const [ticker, entry] of Object.entries(root)) {
      if (!entry || typeof entry !== 'object') continue;
      const entryObj = entry as Record<string, unknown>;
      const price = Number(entryObj.price);
      if (Number.isFinite(price) && price > 0) {
        prices[ticker] = price;
      } else {
        this.logger.warn(
          `Twelve Data returned no price for ${ticker}: ${String(entryObj.message ?? 'unknown')}`,
        );
      }
    }

    return prices;
  }
}
