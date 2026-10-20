import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { StatementRecord } from '../entities/statement-record.entity';
import {
  PortfolioDto,
  PortfolioTotalsDto,
  PositionDto,
} from '../dtos/position.dto';
import { CashReportService } from '../cash/cash-report.service';
import {
  PriceLookup,
  TwelveDataService,
} from '../prices/twelve-data.service';
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

interface PricedPosition {
  ticker: string;
  quantity: number;
  price: number;
  changePercent: number;
  dailyPnl: number;
  avgPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

/**
 * Aggregates raw IBKR statement rows into a portfolio view (positions + cash),
 * enriched with live quotes pulled from Twelve Data.
 *
 * Two different percentages are produced and they must not be confused:
 *
 * - `changePercent` — today's move of the price against the quote's reference
 *   close (`previous_close`). It can be negative while the position is in
 *   profit, because it only describes the current session.
 * - `unrealizedPnlPercent` — total return of the position against its cost
 *   basis (`unrealizedPnl / costBasis`), i.e. "how much am I up overall".
 *
 * When Twelve Data does not supply a quote (or a usable previous close), the
 * affected fields fall back to 0 and `marketValue` falls back to cost basis.
 *
 * Besides per-position rows the view exposes a `totals` block, aggregated over
 * the positions that were actually priced (see `computeTotals`). The client
 * renders it as the summary row under the positions table.
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
    private readonly twelveDataService: TwelveDataService,
  ) {}

  async buildPortfolio(
    userId: string,
    portfolioIds?: string[],
  ): Promise<PortfolioDto> {
    // An explicit empty selection means "nothing selected" -> empty portfolio.
    if (portfolioIds && portfolioIds.length === 0) {
      return {
        positions: [],
        cash: 0,
        totalValue: 0,
        totals: { costBasis: 0, unrealizedPnl: 0, unrealizedPnlPercent: 0 },
      };
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

    const positions = this.aggregateTrades(records);

    // Only ask for quotes for tickers that are actually held right now.
    // Sold-out or short positions (quantity <= 0) must never reach Twelve
    // Data: each symbol costs one credit, and a closed position has no price
    // worth showing. The quantity is passed along as well so the price service
    // can apply the same rule defensively.
    const lookups: PriceLookup[] = [];
    for (const position of positions.values()) {
      if (position.quantity > 0) {
        lookups.push({ ticker: position.ticker, quantity: position.quantity });
      }
    }

    const quotes = await this.twelveDataService.getQuotes(lookups);

    const priced: PricedPosition[] = [];
    let positionsMarketValue = 0;

    for (const position of positions.values()) {
      // A position that was fully closed out (or is short) is not a holding.
      if (position.quantity <= 0) continue;

      const avgPrice =
        position.buyQuantity > 0 ? position.buyCost / position.buyQuantity : 0;
      const costBasis = position.quantity * avgPrice;

      const quote = quotes[position.ticker];
      const hasPrice = quote !== undefined && quote.price > 0;
      const marketPrice = hasPrice ? quote.price : 0;
      const previousClose = hasPrice ? quote.previousClose : null;
      const hasPreviousClose =
        previousClose !== null &&
        Number.isFinite(previousClose) &&
        previousClose > 0;

      // Without a live price we fall back to cost basis (see class docstring).
      const marketValue = hasPrice
        ? position.quantity * marketPrice
        : costBasis;
      const unrealizedPnl = hasPrice ? marketValue - costBasis : 0;

      // Total return of the holding against what was paid for it. Guarded on
      // costBasis > 0 so a position with unknown basis yields 0, not Infinity.
      const unrealizedPnlPercent =
        costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

      // Day's percent change and daily P/L come from the reference close.
      // Without one we cannot say anything about today, so both stay 0.
      const changePercent =
        hasPrice && hasPreviousClose
          ? ((marketPrice - previousClose) / previousClose) * 100
          : 0;
      const dailyPnl =
        hasPrice && hasPreviousClose
          ? position.quantity * (marketPrice - previousClose)
          : 0;

      positionsMarketValue += marketValue;
      priced.push({
        ticker: position.ticker,
        quantity: position.quantity,
        price: hasPrice ? marketPrice : 0,
        changePercent,
        dailyPnl,
        avgPrice,
        costBasis,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
      });
    }

    const cash = await this.cashReportService.getCashBalance(
      userId,
      portfolioIds,
    );
    const totalValue = positionsMarketValue + cash;

    const result: PositionDto[] = priced.map((p) => {
      const allocation =
        totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0;
      return {
        ticker: p.ticker,
        name: p.ticker, // no company-name source available from /quote
        quantity: roundQuantity(p.quantity),
        price: round(p.price),
        changePercent: round(p.changePercent),
        dailyPnl: round(p.dailyPnl),
        avgPrice: round(p.avgPrice),
        costBasis: round(p.costBasis),
        marketValue: round(p.marketValue),
        unrealizedPnl: round(p.unrealizedPnl),
        unrealizedPnlPercent: round(p.unrealizedPnlPercent),
        allocation: round(allocation),
      };
    });

    // Show the largest positions first.
    result.sort((a, b) => b.allocation - a.allocation);

    return {
      positions: result,
      cash: round(cash),
      totalValue: round(totalValue),
      totals: this.computeTotals(result),
    };
  }

  /**
   * Aggregates total return across the rows the portfolio view actually counts.
   *
   * Only positions with a live quote (`price > 0`), a known cost basis and a
   * non-negative allocation are included. An unpriced position reports
   * `unrealizedPnl = 0`, so including it would drag the portfolio-wide
   * percentage toward zero and understate the real result.
   *
   * Percent is computed from the unrounded sums and rounded once at the end so
   * it matches the per-position math.
   */
  private computeTotals(positions: PositionDto[]): PortfolioTotalsDto {
    let costBasis = 0;
    let unrealizedPnl = 0;

    for (const position of positions) {
      if (!(position.price > 0)) continue;
      if (!(position.costBasis > 0)) continue;
      if (!(position.allocation >= 0)) continue;
      costBasis += position.costBasis;
      unrealizedPnl += position.unrealizedPnl;
    }

    const unrealizedPnlPercent =
      costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    return {
      costBasis: round(costBasis),
      unrealizedPnl: round(unrealizedPnl),
      unrealizedPnlPercent: round(unrealizedPnlPercent),
    };
  }

  /**
   * Collapses the raw "Trades" rows into a per-ticker running aggregate.
   * Only positive quantities (buys) contribute to the weighted average price.
   */
  private aggregateTrades(
    records: StatementRecord[],
  ): Map<string, AggregatedPosition> {
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

    return positions;
  }
}
