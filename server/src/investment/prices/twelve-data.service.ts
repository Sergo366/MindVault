import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

/**
 * A single price lookup request.
 *
 * `quantity` is the current position size. When provided and <= 0 (or not a
 * finite number) the ticker is treated as a closed/sold position and is
 * skipped completely: no Redis read, no Twelve Data request, no cache write,
 * no entry in the result. Omit `quantity` to always look the ticker up
 * (backwards-compatible behaviour).
 */
export interface PriceLookup {
  ticker: string;
  quantity?: number;
}

/** Either a bare ticker or a ticker with its position quantity. */
export type PriceLookupInput = string | PriceLookup;

/**
 * A resolved quote for one ticker.
 *
 * `previousClose` is the reference close used to compute the day's percent
 * change and daily P/L. It is `null` when Twelve Data did not supply a usable
 * value (unknown symbol, newly listed security, partial outage).
 */
export interface TickerQuote {
  price: number;
  previousClose: number | null;
}

interface RequestOutcome {
  quotes: Record<string, TickerQuote>;
  skipped: boolean;
}

interface JoinedLookup {
  ticker: string;
  promise: Promise<TickerQuote | null>;
}

interface Deferred {
  promise: Promise<TickerQuote | null>;
  resolve: (value: TickerQuote | null) => void;
}

/**
 * Fetches current market quotes from Twelve Data
 * (https://api.twelvedata.com/quote) and caches each ticker's quote in Redis.
 *
 * The `/quote` endpoint is used (rather than `/price`) because it returns both
 * the current price (`close`) and a reference close (`previous_close`), which
 * the portfolio view needs to compute `changePercent` and `dailyPnl`. The
 * per-symbol credit cost is the same on the free tier.
 *
 * getQuotes() flow:
 *   1. drop requests whose position quantity is <= 0 (sold/empty positions);
 *   2. read every remaining ticker from Redis first;
 *   3. keep only the tickers that are not cached (or whose cached value is
 *      unusable) in `missing`;
 *   4. skip the network entirely when `missing` is empty;
 *   5. otherwise fetch just the misses and write the results back to Redis
 *      with a TTL.
 *
 * getPrices() is a thin wrapper around getQuotes() that returns only the
 * price, kept for callers that do not care about the reference close.
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
  private readonly baseUrl = 'https://api.twelvedata.com/quote';
  private readonly cacheTtlSeconds = 3600; // 1 hour
  private readonly cacheKeyPrefix = 'quotes:';
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
  /** In-flight quotes shared between concurrent getQuotes() calls. */
  private readonly inFlight = new Map<string, Promise<TickerQuote | null>>();

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
   * Returns the latest quote (price + reference close) for each ticker.
   *
   * Accepts either bare tickers (`['AAPL']`) or tickers with a position size
   * (`[{ ticker: 'AAPL', quantity: 10 }]`). Requests with `quantity <= 0` are
   * skipped entirely — no cache read, no API call — because a sold position
   * has no price to show.
   *
   * Result keys are exactly the tickers that have a known price and an open
   * position. Tickers that couldn't be resolved (API failure, rate-limit
   * budget exhausted, unknown symbol) are simply omitted from the map.
   */
  async getQuotes(
    inputs: PriceLookupInput[],
  ): Promise<Record<string, TickerQuote>> {
    const { wanted, closed } = this.splitByPositionSize(inputs);

    if (closed.length > 0) {
      this.logger.debug(
        `getQuotes: skipping ${closed.length} closed position(s): ${closed.join(', ')}`,
      );
    }

    if (wanted.length === 0) return {};

    // Step 1 — cache-first lookup. Read every requested ticker from Redis
    // before any network call, so we know exactly which ones are missing.
    const quotes: Record<string, TickerQuote> = {};
    const missing: string[] = [];

    const lookups = await Promise.all(
      wanted.map(async (ticker) => {
        const value = await this.redisService.get(this.cacheKey(ticker));
        return { ticker, value } as const;
      }),
    );

    for (const { ticker, value } of lookups) {
      if (value === null) {
        missing.push(ticker);
        continue;
      }
      const quote = this.parseCachedQuote(value);
      if (quote) {
        quotes[ticker] = quote;
      } else {
        // Corrupt or legacy-format cached value: treat as a miss and refresh.
        missing.push(ticker);
      }
    }

    const cacheHits = Object.keys(quotes).length;
    this.logger.debug(
      `getQuotes: ${cacheHits} cache hit(s), ${missing.length} miss(es) of ${wanted.length}`,
    );

    // Step 2 — nothing to fetch: return what Redis gave us, no API call.
    if (missing.length === 0) return quotes;

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

      let resolveFn!: (value: TickerQuote | null) => void;
      const promise = new Promise<TickerQuote | null>((resolve) => {
        resolveFn = resolve;
      });
      deferred.set(ticker, { promise, resolve: resolveFn });
      this.inFlight.set(ticker, promise);
      toFetch.push(ticker);
      joins.push({ ticker, promise });
    }

    if (toFetch.length > 0) {
      this.logger.debug(
        `getQuotes: requesting ${toFetch.length} ticker(s): ${toFetch.join(', ')}`,
      );

      try {
        const fetched = await this.fetchInBatches(toFetch);

        // Step 4 — write fresh quotes back to Redis (with TTL) before
        // resolving waiters, so a joiner that arrives right after us sees the
        // cache. Failed symbols are absent from `fetched`, so they stay
        // uncached and will be retried on the next call.
        await Promise.all(
          Object.entries(fetched).map(([ticker, quote]) =>
            this.redisService.set(
              this.cacheKey(ticker),
              JSON.stringify({ p: quote.price, pc: quote.previousClose }),
              this.cacheTtlSeconds,
            ),
          ),
        );

        for (const ticker of toFetch) {
          const quote = fetched[ticker];
          deferred
            .get(ticker)!
            .resolve(
              quote && Number.isFinite(quote.price) && quote.price > 0
                ? quote
                : null,
            );
        }
      } catch (error) {
        this.logger.error(
          `getQuotes: batch fetch failed: ${(error as Error).message}`,
        );
        for (const ticker of toFetch) deferred.get(ticker)!.resolve(null);
      } finally {
        for (const ticker of toFetch) this.inFlight.delete(ticker);
      }
    }

    const resolved = await Promise.all(joins.map((join) => join.promise));
    resolved.forEach((quote, index) => {
      if (quote && Number.isFinite(quote.price) && quote.price > 0) {
        quotes[joins[index].ticker] = quote;
      }
    });

    this.logger.debug(
      `getQuotes: resolved ${Object.keys(quotes).length} of ${wanted.length} ticker(s)`,
    );

    return quotes;
  }

  /**
   * Convenience wrapper for callers that only need the current price.
   * Delegates to getQuotes() so caching and rate limiting behave identically.
   */
  async getPrices(
    inputs: PriceLookupInput[],
  ): Promise<Record<string, number>> {
    const quotes = await this.getQuotes(inputs);
    const prices: Record<string, number> = {};
    for (const [ticker, quote] of Object.entries(quotes)) {
      prices[ticker] = quote.price;
    }
    return prices;
  }

  /**
   * Splits the incoming requests into "should be looked up" and "closed
   * positions to skip".
   *
   * A ticker is considered closed when a `quantity` is supplied and it is not
   * a finite positive number (i.e. 0, negative, NaN, Infinity). Bare ticker
   * strings have no quantity and are always kept, which keeps the previous
   * behaviour for callers that have not (yet) been updated.
   *
   * If the same ticker appears both open and closed (e.g. a sold lot and a
   * still-held lot), the open one wins and the ticker is looked up.
   */
  private splitByPositionSize(inputs: PriceLookupInput[]): {
    wanted: string[];
    closed: string[];
  } {
    const wanted = new Set<string>();
    const closed = new Set<string>();

    for (const input of inputs) {
      if (input === null || input === undefined) continue;

      const rawTicker = typeof input === 'string' ? input : input.ticker;
      const ticker = typeof rawTicker === 'string' ? rawTicker.trim() : '';
      if (!ticker) continue;

      const quantity = typeof input === 'string' ? undefined : input.quantity;

      if (
        typeof quantity === 'number' &&
        (!Number.isFinite(quantity) || quantity <= 0)
      ) {
        // Sold / empty position: never spend a credit on it.
        closed.add(ticker);
        continue;
      }

      wanted.add(ticker);
    }

    // Open positions always win over closed ones.
    for (const ticker of wanted) closed.delete(ticker);

    return { wanted: Array.from(wanted), closed: Array.from(closed) };
  }

  private cacheKey(ticker: string): string {
    return `${this.cacheKeyPrefix}${ticker}`;
  }

  /**
   * Decodes a cached quote. New entries are stored as JSON
   * `{"p":<price>,"pc":<previousClose|null>}`. Anything else (a legacy plain
   * number, or corrupt JSON) is treated as a miss so the entry is refreshed
   * in the new format.
   */
  private parseCachedQuote(raw: string): TickerQuote | null {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;

    try {
      const obj = JSON.parse(trimmed) as { p?: unknown; pc?: unknown };
      const price = Number(obj.p);
      if (!Number.isFinite(price) || price <= 0) return null;

      const previousCloseRaw = Number(obj.pc);
      const previousClose =
        Number.isFinite(previousCloseRaw) && previousCloseRaw > 0
          ? previousCloseRaw
          : null;

      return { price, previousClose };
    } catch {
      return null;
    }
  }

  private async fetchInBatches(
    tickers: string[],
  ): Promise<Record<string, TickerQuote>> {
    const result: Record<string, TickerQuote> = {};

    if (!this.hasApiKey()) {
      this.logger.warn(
        'TWELVE_DATA_API_KEY is not configured; skipping quote fetch',
      );
      return result;
    }

    for (let i = 0; i < tickers.length; i += this.maxSymbolsPerRequest) {
      const batch = tickers.slice(i, i + this.maxSymbolsPerRequest);
      const outcome = await this.enqueueRequest(() =>
        this.executeRequest(batch),
      );
      Object.assign(result, outcome.quotes);
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
      return { quotes: {}, skipped: true };
    }

    if (waitMs > 0) {
      this.logger.debug(
        `Waiting ${waitMs}ms for Twelve Data rate-limit budget`,
      );
      await this.sleep(waitMs);
    }

    this.consumeCredits(batch.length);
    const quotes = await this.fetchQuotes(batch);
    return { quotes, skipped: false };
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

  private async fetchQuotes(
    tickers: string[],
  ): Promise<Record<string, TickerQuote>> {
    const apiKey = this.configService.get<string>('TWELVE_DATA_API_KEY') ?? '';
    if (!apiKey) {
      this.logger.warn(
        'TWELVE_DATA_API_KEY is not configured; skipping quote fetch',
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
      return this.normalizeQuoteResponse(payload, tickers);
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
   * Normalises the two response shapes Twelve Data returns for `/quote`:
   *
   *   Single symbol: { "symbol": "AAPL", "close": "123.45",
   *                    "previous_close": "121.10", ... }
   *   Batch:         { "AAPL": { "close": "123.45", ... }, "MSFT": { ... } }
   *   Error:         { "code": 401, "message": "...", "status": "error" }
   *
   * Failed symbols inside a batch are logged per-symbol and skipped without
   * dropping the successful ones.
   */
  private normalizeQuoteResponse(
    payload: unknown,
    requestedTickers: string[],
  ): Record<string, TickerQuote> {
    const quotes: Record<string, TickerQuote> = {};
    if (!payload || typeof payload !== 'object') return quotes;

    const root = payload as Record<string, unknown>;

    if (root.status === 'error' || typeof root.code === 'number') {
      this.logger.error(
        `Twelve Data error: ${String(root.message ?? 'unknown error')}`,
      );
      return quotes;
    }

    // Single-symbol response (the quote fields sit at the top level).
    if (
      requestedTickers.length === 1 &&
      ('close' in root || 'price' in root || 'previous_close' in root)
    ) {
      const quote = this.extractQuote(root);
      if (quote) {
        quotes[requestedTickers[0]] = quote;
      } else {
        this.logger.warn(
          `Twelve Data returned no quote for ${requestedTickers[0]}: ${String(
            root.message ?? 'unknown',
          )}`,
        );
      }
      return quotes;
    }

    // Batch response: { TICKER: { close, previous_close, ... } }.
    for (const [ticker, entry] of Object.entries(root)) {
      if (!entry || typeof entry !== 'object') continue;
      const entryObj = entry as Record<string, unknown>;
      const quote = this.extractQuote(entryObj);
      if (quote) {
        quotes[ticker] = quote;
      } else {
        this.logger.warn(
          `Twelve Data returned no quote for ${ticker}: ${String(
            entryObj.message ?? 'unknown',
          )}`,
        );
      }
    }

    return quotes;
  }

  /**
   * Pulls price + previous close out of one quote entry. Returns null when
   * the entry has no usable price, which the caller treats as a miss.
   */
  private extractQuote(entry: Record<string, unknown>): TickerQuote | null {
    // /quote uses `close`; `price` is kept as a fallback in case Twelve Data
    // returns the /price shape or an alternative payload.
    const rawPrice = entry.close ?? entry.price;
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price <= 0) return null;

    const previousCloseRaw = Number(entry.previous_close);
    const previousClose =
      Number.isFinite(previousCloseRaw) && previousCloseRaw > 0
        ? previousCloseRaw
        : null;

    return { price, previousClose };
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
