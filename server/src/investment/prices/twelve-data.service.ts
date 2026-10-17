import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

/**
 * Fetches current market prices from Twelve Data
 * (https://api.twelvedata.com/price) and caches each ticker's price in Redis
 * for 10 minutes.
 *
 * Design notes:
 * - Caching is per-ticker (key `prices:<ticker>`), so:
 *   * a cache hit for one ticker doesn't invalidate unrelated tickers;
 *   * adding a new ticker only fetches the missing ones;
 *   * the cache survives process restarts and expires after the TTL.
 * - All cache misses are fetched in a single batched request to reduce API
 *   calls (Twelve Data accepts a comma-separated `symbol` list).
 * - Any failure (missing API key, rate limit, network error) is non-fatal:
 *   the caller receives an empty map for the affected tickers and can fall
 *   back to cost basis.
 */
@Injectable()
export class TwelveDataService {
  private readonly logger = new Logger(TwelveDataService.name);
  private readonly baseUrl = 'https://api.twelvedata.com/price';
  private readonly cacheTtlSeconds = 10 * 60; // 10 minutes
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

    const prices: Record<string, number> = {};
    const missing: string[] = [];

    // 1. Read every ticker from the cache first.
    await Promise.all(
      uniqueTickers.map(async (ticker) => {
        const cached = await this.redisService.get(this.cacheKey(ticker));
        if (cached === null) {
          missing.push(ticker);
          return;
        }
        const price = Number(cached);
        if (Number.isFinite(price) && price > 0) {
          prices[ticker] = price;
        } else {
          // Cached value is corrupt/unusable; force a refresh.
          missing.push(ticker);
        }
      }),
    );

    if (missing.length === 0) return prices;

    // 2. Fetch every cache miss in a single batched request.
    const fetched = await this.fetchPrices(missing);

    // 3. Persist successes (with TTL) and merge them into the result.
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
   * Failed symbols inside a batch are silently skipped.
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
      const price = Number((entry as Record<string, unknown>).price);
      if (Number.isFinite(price) && price > 0) {
        prices[ticker] = price;
      }
    }

    return prices;
  }
}
