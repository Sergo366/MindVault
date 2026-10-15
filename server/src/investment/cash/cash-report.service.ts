import { Injectable } from '@nestjs/common';
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
   *     "Total": "1120", "Securities": "1120", "Futures": "0" }
   *
   * Multi-currency accounts contain one "Ending Cash" row per currency plus a
   * "Base Currency" total row, so the base-currency row is preferred to avoid
   * mixing currencies (e.g. PLN cash into a USD portfolio). Returns 0 when no
   * ending-cash row exists.
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

    const records = await this.statementRecordRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });

    // Prefer the most recent statement if several were uploaded.
    let fallback = 0;

    for (let i = records.length - 1; i >= 0; i--) {
      const data = (records[i].rawData ?? {}) as Record<string, unknown>;

      const summary = String(data[CASH_SUMMARY_KEY] ?? '').toLowerCase();
      if (!summary.includes('ending cash')) continue;

      const total = parseNumber(data[CASH_TOTAL_KEY]);
      const currency = String(data[CASH_CURRENCY_KEY] ?? '').toLowerCase();

      // The base-currency summary is the one that reconciles with the rest of
      // the (USD-denominated) portfolio, so take it straight away.
      if (currency.includes('base')) {
        return total;
      }

      // Otherwise remember the first per-currency value we saw as a fallback.
      if (fallback === 0) {
        fallback = total;
      }
    }

    return fallback;
  }
}
