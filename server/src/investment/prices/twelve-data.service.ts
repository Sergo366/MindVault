import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

interface RequestOutcome {
  prices: Record<string, number>;
  skipped: boolean;
}

interface JoinedLookup {
  ticker: string;
  promise: Promise<number | null>;
}

interface Deferred {
  promise: Promise<number | null>;
  resolve: (value: number | null) => void;
}

/**
 * Fetches current market prices from Twelve Data
 * (https://api.twelvedata.com/price) and caches each ticker's price in Redis.
 *
 * getPrices() flow:
 *   1. read every requested ticker from Redis first;
 *   2. keep only the tickers that are not cached (or whose cached value is
 *      unusable) in `missing`;
 *   3. skip the network entirely when `missing` is empty;
 *   4. otherwise fetch just the misses and write the results back to Redis
 *      with a TTL.
 *
 * Rate limiting / resilience:
 * - A single Twelve Data request is capped at `maxSymbolsPerRequest` symbols
 *   (8 by default, matching the free tier's 8 credits per minute).
 * - A sliding-window credit counter prevents starting a request when the
 *   per-minute budget is already spent. If the wait would be short, we wait;
 *   if it would exceed `maxCallWaitMs`, the request returns partial results
 *   and the remaining tickers are retried on a later call. This keeps the
 *   caller from blocking for a full minute.
 * - HTTP 429 responses set a cooldown (`rateLimitedUntil`) based on the
 *   `Retry-After` header, so subsequent calls back off instead of hammering
 *   the API.
 * - Concurrent calls for the same ticker share one in-flight request, and
 *   requests are serialized, so two callers cannot burn credits twice for the
 *   same symbol.
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
  private readonly rateWindowMs = 60_000;
  private readonly defaultRateLimitBackoffMs = 60_000;

  private readonly maxSymbolsPerRequest: number;
  private readonly creditsPerMinute: number;
  private readonly maxCallWaitMs: number;
  private readonly requestTimeoutMs: number;

  /** Timestamps (ms) of credits consumed within the current sliding window. */
  private readonly creditUsage: number[] = [];
  /** When > Date.now(), outbound requests are deferred until then. */
  private rateLimitedUntil = 0;
  /** Serializes network calls so credit accounting stays accurate. */
  private requestChain: Promise<void> = Promise.resolve();
  /** In-flight price lookups shared between concurrent getPrices() calls. */
  private readonly inFlight = new Map<string, Promise<number | null>>();

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.maxSymbolsPerRequest = this.readPositiveInt(
      'TWELVE_DATA_MAX_SYMBOLS_PER_REQUEST',
      8,
    );
    this.creditsPerMinute = this.readPositiveInt(
      'TWELVE_DATA_CREDITS_PER_MINUTE',
      8,
    );
    this.maxCallWaitMs = this.readPositiveInt(
      'TWELVE_DATA_MAX_CALL_WAIT_MS',
      10_000,
    );
    this.requestTimeoutMs = this.readPositiveInt(
      'TWELVE_DATA_REQUEST_TIMEOUT_MS',
      15_000,
    );
  }

  /**
   * Returns the latest price for each of the given tickers.
   *
   * Result keys are exactly the tickers that have a known price. Tickers that
   * couldn't be resolved (API failure, rate-limit budget exhausted, unknown
   * symbol) are simply omitted from the map.
   */
  async getPrices(tickers: string[]): Promise<Record<string, number>> {
    const uniqueTickers = Array.from(
      new Set(tickers.map((t) => t.trim()).filter(Boolean)),
    );
    if (uniqueTickers.length === 0) return {};

    // Step 1 — cache-first lookup. Read every requested ticker from Redis
    // before any network call, so we know exactly which ones are missing.
    const prices: Record<string, number> = {};
    const missing: string[] = [];

    const lookups = await Promise.all(
      uniqueTickers.map(async (ticker) => {
        const value = await this.redisService.get(this.cacheKey(ticker));
        return { ticker, value } as const;
      }),
    );

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

    const cacheHits = Object.keys(prices).length;
    this.logger.debug(
      `getPrices: ${cacheHits} cache hit(s), ${missing.length} miss(es) of ${uniqueTickers.length}`,
    );

    // Step 2 — nothing to fetch: return what Redis gave us, no API call.
    if (missing.length === 0) return prices;

    // Step 3 — split the misses into "join an existing request" and
    // "start a new one". This prevents two concurrent callers from fetching
    // (and paying for) the same symbol.
    const joins: JoinedLookup[] = [];
    const toFetch: string[] = [];
    const deferred = new Map<string, Deferred>();

    for (const ticker of missing) {
      const existing = this.inFlight.get(ticker);
      if (existing) {
        joins.push({ ticker, promise: existing });
        continue;
      }

      let resolveFn!: (value: number | null) => void;
      const promise = new Promise<number | null>((resolve) => {
        resolveFn = resolve;
      });
      deferred.set(ticker, { promise, resolve: resolveFn });
      this.inFlight.set(ticker, promise);
      toFetch.push(ticker);
      joins.push({ ticker, promise });
    }

    if (toFetch.length > 0) {
      this.logger.debug(
        `getPrices: requesting ${toFetch.length} ticker(s): ${toFetch.join(', ')}`,
      );

      try {
        const fetched = await this.fetchInBatches(toFetch);

        // Step 4 — write fresh prices back to Redis (with TTL) before
        // resolving waiters, so a joiner that arrives right after us sees the
        // cache. Failed symbols are absent from `fetched`, so they stay
        // uncached and will be retried on the next call.
        await Promise.all(
          Object.entries(fetched).map(([ticker, price]) =>
            this.redisService.set(
              this.cacheKey(ticker),
              String(price),
              this.cacheTtlSeconds,
            ),
          ),
        );

        for (const ticker of toFetch) {
          const price = fetched[ticker];
          deferred
            .get(ticker)!
            .resolve(
              typeof price === 'number' &&
                Number.isFinite(price) &&
                price > 0
                ? price
                : null,
            );
        }
      } catch (error) {
        this.logger.error(
          `getPrices: batch fetch failed: ${(error as Error).message}`,
        );
        for (const ticker of toFetch) deferred.get(ticker)!.resolve(null);
      } finally {
        for (const ticker of toFetch) this.inFlight.delete(ticker);
      }
    }

    const resolved = await Promise.all(joins.map((join) => join.promise));
    resolved.forEach((price, index) => {
      if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
        prices[joins[index].ticker] = price;
      }
    });

    this.logger.debug(
      `getPrices: resolved ${Object.keys(prices).length} of ${uniqueTickers.length} ticker(s)`,
    );

    return prices;
  }

  private cacheKey(ticker: string): string {
    return `${this.cacheKeyPrefix}${ticker}`;
  }

  private async fetchInBatches(
    tickers: string[],
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    if (!this.hasApiKey()) {
      this.logger.warn(
        'TWELVE_DATA_API_KEY is not configured; skipping price fetch',
      );
      return result;
    }

    for (let i = 0; i < tickers.length; i += this.maxSymbolsPerRequest) {
      const batch = tickers.slice(i, i + this.maxSymbolsPerRequest);
      const outcome = await this.enqueueRequest(() =>
        this.executeRequest(batch),
      );
      Object.assign(result, outcome.prices);
      if (outcome.skipped) break;
    }

    return result;
  }

  /**
   * Serializes outbound requests. Without this, two concurrent calls could
   * each pass the credit check before either consumed its budget.
   */
  private enqueueRequest<T>(task: () => Promise<T>): Promise<T> {
    const run = this.requestChain.then(task, task);
    this.requestChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async executeRequest(batch: string[]): Promise<RequestOutcome> {
    // Computed inside the serialized task, so it sees the latest credit usage.
    const waitMs = this.computeWaitMs(batch.length);

    if (waitMs > this.maxCallWaitMs) {
      this.logger.warn(
        `Twelve Data rate-limit budget exhausted; skipping ${batch.length} ticker(s). Next slot in ~${Math.ceil(
          waitMs / 1000,
        )}s.`,
      );
      return { prices: {}, skipped: true };
    }

    if (waitMs > 0) {
      this.logger.debug(
        `Waiting ${waitMs}ms for Twelve Data rate-limit budget`,
      );
      await this.sleep(waitMs);
    }

    this.consumeCredits(batch.length);
    const prices = await this.fetchPrices(batch);
    return { prices, skipped: false };
  }

  /** Milliseconds until `credits` more credits can be spent (0 = now). */
  private computeWaitMs(credits: number): number {
    const now = Date.now();

    if (this.rateLimitedUntil > now) {
      return this.rateLimitedUntil - now;
    }

    this.pruneCreditUsage(now);
    const available = this.creditsPerMinute - this.creditUsage.length;
    if (available >= credits) return 0;

    const needed = credits - available;
    const index = needed - 1;
    if (index < 0 || index >= this.creditUsage.length) return 0;

    const expireAt = this.creditUsage[index] + this.rateWindowMs;
    return Math.max(0, expireAt - now + 50);
  }

  private pruneCreditUsage(now: number): void {
    const cutoff = now - this.rateWindowMs;
    while (this.creditUsage.length > 0 && this.creditUsage[0] <= cutoff) {
      this.creditUsage.shift();
    }
  }

  private consumeCredits(count: number): void {
    const now = Date.now();
    for (let i = 0; i < count; i += 1) {
      this.creditUsage.push(now);
    }
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
    const url = `${this.baseUrl}?symbol=${symbols}&apikey=${encodeURIComponent(
      apiKey,
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(
          response.headers.get('retry-after'),
        );
        const backoff = retryAfter ?? this.defaultRateLimitBackoffMs;
        this.rateLimitedUntil = Date.now() + backoff;
        this.logger.error(
          `Twelve Data rate limit exceeded (HTTP 429); pausing API calls for ${Math.ceil(
            backoff / 1000,
          )}s`,
        );
        return {};
      }

      if (!response.ok) {
        this.logger.error(
          `Twelve Data request failed: HTTP ${response.status}`,
        );
        return {};
      }

      const payload: unknown = await response.json();
      return this.normalizeResponse(payload, tickers);
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        this.logger.error(
          `Twelve Data request timed out after ${this.requestTimeoutMs}ms`,
        );
      } else {
        this.logger.error(`Twelve Data request threw: ${err.message}`);
      }
      return {};
    } finally {
      clearTimeout(timeout);
    }
  }

  /** `Retry-After` may be a number of seconds or an HTTP date. */
  private parseRetryAfter(value: string | null): number | null {
    if (!value) return null;

    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return Math.max(0, timestamp - Date.now());
    }

    return null;
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
          `Twelve Data returned no price for ${ticker}: ${String(
            entryObj.message ?? 'unknown',
          )}`,
        );
      }
    }

    return prices;
  }

  private hasApiKey(): boolean {
    const key = this.configService.get<string>('TWELVE_DATA_API_KEY');
    return typeof key === 'string' && key.trim().length > 0;
  }

  private readPositiveInt(name: string, fallback: number): number {
    const raw = this.configService.get<string | number>(name);
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return fallback;
    }
    const parsed = Number.parseInt(String(raw), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
