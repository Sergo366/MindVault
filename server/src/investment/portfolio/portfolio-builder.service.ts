import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { StatementRecord } from '../entities/statement-record.entity';
import { PortfolioDto, PositionDto } from '../dtos/position.dto';
import { CashReportService } from '../cash/cash-report.service';
import {
  BASIS_KEYS,
  CURRENCY_PAIR_PATTERN,
  QUANTITY_KEYS,
  SYMBOL_KEYS,
  TRADE_PRICE_KEYS,
  parseNumber,
  readField,
  round,
  roundQuantity,
} from '../utils/ibkr.util';

interface AggregatedPosition {
  ticker: string;
  quantity: number;
  buyCost: number;
  buyQuantity: number;
}

/**
 * Aggregates raw IBKR statement rows into a portfolio view (positions + cash).
 *
 * This service only reads statement records; it does not own the portfolio
 * lifecycle (create/rename/delete) nor the CSV parsing itself.
 */
@Injectable()
export class PortfolioBuilderService {
  constructor(
    @InjectRepository(StatementRecord)
    private readonly statementRecordRepository: Repository<StatementRecord>,
    private readonly cashReportService: CashReportService,
  ) {}

  /**
   * Builds the aggregated portfolio for a user, optionally restricted to a set
   * of portfolios.
   *
   * Notes / simplifications:
   * - `portfolioIds === undefined` means "no filter" (all portfolios);
   *   an empty array means "nothing selected" (empty result).
   * - Positions are aggregated per ticker (no FIFO lot tracking). Quantity is
   *   the net of buys and sells; avgPrice is the weighted average of BUY trades.
   * - Fully closed positions (net quantity === 0) are omitted.
   * - Cost is taken from the IBKR "Basis" column when present (it already
   *   includes commissions), falling back to Quantity x "T. Price".
   * - Currency-pair symbols (e.g. "USD.PLN") are skipped: they are FX
   *   conversions, not portfolio holdings.
   * - `allocation` is currently weighted by cost basis, because there is no
   *   quotes API yet. Once live prices exist it should use marketValue.
   */
  async buildPortfolio(
    userId: string,
    portfolioIds?: string[],
  ): Promise<PortfolioDto> {
    // An explicit empty selection means "nothing selected" -> empty portfolio.
    if (portfolioIds && portfolioIds.length === 0) {
      return { positions: [], cash: 0, totalValue: 0 };
    }

    const tradesWhere: FindOptionsWhere<StatementRecord> = {
      userId,
      section: 'Trades',
    };
    if (portfolioIds) {
      tradesWhere.portfolioId = In(portfolioIds);
    }

    const records = await this.statementRecordRepository.find({
      where: tradesWhere,
      order: { createdAt: 'ASC' },
    });

    const positions = new Map<string, AggregatedPosition>();

    for (const record of records) {
      const data = (record.rawData ?? {}) as Record<string, unknown>;

      const ticker = String(readField(data, SYMBOL_KEYS) ?? '').trim();
      if (!ticker) continue;

      // Skip IBKR currency-pair rows (e.g. "USD.PLN") - they are not holdings.
      if (CURRENCY_PAIR_PATTERN.test(ticker)) continue;

      const quantity = parseNumber(readField(data, QUANTITY_KEYS));

      let position = positions.get(ticker);
      if (!position) {
        position = { ticker, quantity: 0, buyCost: 0, buyQuantity: 0 };
        positions.set(ticker, position);
      }

      position.quantity += quantity;

      // Only buys (positive quantity) feed the average-cost calculation.
      if (quantity > 0) {
        const basisValue = readField(data, BASIS_KEYS);
        const tradePrice = parseNumber(readField(data, TRADE_PRICE_KEYS));

        // "Basis" already includes the commission, so prefer it when it is a
        // usable positive number; otherwise fall back to quantity x fill price.
        const basis =
          basisValue !== undefined ? Math.abs(parseNumber(basisValue)) : 0;
        const cost = basis > 0 ? basis : quantity * tradePrice;

        position.buyCost += cost;
        position.buyQuantity += quantity;
      }
    }

    // First pass: total cost basis of open positions, combined with cash it
    // becomes the denominator for the allocation column.
    let positionsCostBasis = 0;
    for (const position of positions.values()) {
      if (position.quantity === 0) continue;
      const avgPrice =
        position.buyQuantity > 0 ? position.buyCost / position.buyQuantity : 0;
      positionsCostBasis += position.quantity * avgPrice;
    }

    const cash = await this.cashReportService.getCashBalance(
      userId,
      portfolioIds,
    );
    const totalValue = positionsCostBasis + cash;

    const result: PositionDto[] = [];

    for (const position of positions.values()) {
      // A position that was fully closed out is not a holding.
      if (position.quantity === 0) continue;

      const avgPrice =
        position.buyQuantity > 0 ? position.buyCost / position.buyQuantity : 0;
      const costBasis = position.quantity * avgPrice;
      const allocation = totalValue > 0 ? (costBasis / totalValue) * 100 : 0;

      // -------------------------------------------------------------------
      // NOTE: There is no market-data / quotes provider yet, so every field
      // that depends on the *current* market price is returned as 0. Once a
      // quotes API is wired up, compute and fill in: price, changePercent,
      // dailyPnl, marketValue, unrealizedPnl. `allocation` should then be
      // calculated from marketValue instead of costBasis.
      // -------------------------------------------------------------------
      result.push({
        ticker: position.ticker,
        name: position.ticker, // no company-name source available yet
        quantity: roundQuantity(position.quantity),
        price: 0,
        changePercent: 0,
        dailyPnl: 0,
        avgPrice: round(avgPrice),
        costBasis: round(costBasis),
        marketValue: 0,
        unrealizedPnl: 0,
        allocation: round(allocation),
      });
    }

    // Show the largest positions first.
    result.sort((a, b) => b.allocation - a.allocation);

    return {
      positions: result,
      cash: round(cash),
      totalValue: round(totalValue),
    };
  }
}
