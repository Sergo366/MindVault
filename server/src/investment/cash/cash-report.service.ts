import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { StatementRecord } from '../entities/statement-record.entity';
import {
  CASH_CURRENCY_KEY,
  CASH_REPORT_SECTION,
  CASH_SUMMARY_KEY,
  CASH_TOTAL_KEY,
  parseNumber,
} from '../utils/ibkr.util';

/**
 * Reads the free cash balance out of the user's IBKR "Cash Report" rows.
 */
@Injectable()
export class CashReportService {
  private readonly logger = new Logger(CashReportService.name);

  constructor(
    @InjectRepository(StatementRecord)
    private readonly statementRecordRepository: Repository<StatementRecord>,
  ) {}

  /**
   * Extracts the free cash balance from the user's IBKR "Cash Report" rows,
   * optionally restricted to a set of portfolios.
   *
   * Rows look like:
   *   { "Cash Report": "Cash Report", "Header": "Data",
   *     "Currency Summary": "Ending Cash", "Currency": "Base Currency",
   *     "Total": "1066.56", ... }
   *   { "Cash Report": "Cash Report", "Header": "Data",
   *     "Currency Summary": "Ending Cash", "Currency": "USD",
   *     "Total": "81.27", ... }
   *
   * A multi-currency account has one "Ending Cash" row per currency plus a
   * "Base Currency" row that is the sum converted into the account base
   * currency. The app is USD-denominated (positions/prices are in USD), so the
   * USD row is the correct cash figure; the base-currency total would silently
   * mix in foreign-currency balances and inflate the portfolio denominator
   * (and therefore understate every position's allocation). The base-currency
   * row is only used when no USD row exists at all.
   *
   * Returns 0 when no usable ending-cash row exists.
   */
  async getCashBalance(
    userId: string,
    portfolioIds?: string[],
  ): Promise<number> {
    const where: FindOptionsWhere<StatementRecord> = {
      userId,
      section: CASH_REPORT_SECTION,
    };
    if (portfolioIds) {
      where.portfolioId = In(portfolioIds);
    }

    // Newest first, so within each portfolio the latest statement wins.
    const records = await this.statementRecordRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (records.length === 0) return 0;

    // Group by portfolio so multiple portfolios are summed correctly and each
    // portfolio's cash is read from its own most recent statement.
    const byPortfolio = new Map<string, StatementRecord[]>();
    for (const record of records) {
      const list = byPortfolio.get(record.portfolioId);
      if (list) {
        list.push(record);
      } else {
        byPortfolio.set(record.portfolioId, [record]);
      }
    }

    let total = 0;
    for (const portfolioRecords of byPortfolio.values()) {
      total += this.extractEndingCash(portfolioRecords);
    }
    return total;
  }

  /**
   * Picks the ending-cash figure from a single portfolio's records.
   *
   * Preference order:
   *   1. the "USD" ending-cash row (the app is USD-denominated);
   *   2. the "Base Currency" ending-cash row (only if no USD row exists);
   *   3. 0 (never an arbitrary foreign-currency row).
   *
   * `records` are expected newest-first; the first match of each kind is thus
   * taken from the latest statement.
   */
  private extractEndingCash(records: StatementRecord[]): number {
    let usd: number | null = null;
    let base: number | null = null;

    for (const record of records) {
      const data = (record.rawData ?? {}) as Record<string, unknown>;

      // Exact match: skip "Ending Settled Cash" and other similar summaries.
      const summary = String(data[CASH_SUMMARY_KEY] ?? '')
        .trim()
        .toLowerCase();
      if (summary !== 'ending cash') continue;

      const currency = String(data[CASH_CURRENCY_KEY] ?? '')
        .trim()
        .toLowerCase();
      const value = parseNumber(data[CASH_TOTAL_KEY]);

      if (usd === null && currency === 'usd') {
        usd = value;
      }
      if (base === null && currency.includes('base')) {
        base = value;
      }
      if (usd !== null && base !== null) break;
    }

    if (usd !== null) return usd;
    if (base !== null) return base;

    this.logger.warn(
      'No USD or base-currency "Ending Cash" row found; reporting 0 cash',
    );
    return 0;
  }
}
