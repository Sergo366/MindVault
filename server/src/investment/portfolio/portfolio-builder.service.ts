import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { StatementRecord } from '../entities/statement-record.entity';
import { PortfolioDto, PositionDto } from '../dtos/position.dto';
import { CashReportService } from '../cash/cash-report.service';
import { TwelveDataService } from '../prices/twelve-data.service';
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
  avgPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnl: number;
}

/**
 * Aggregates raw IBKR statement rows into a portfolio view (positions + cash),
 * enriched with live prices pulled from Twelve Data.
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

    const positions = this.aggregateTrades(records);

    // Only ask for prices for tickers that are actually held.
    const openTickers: string[] = [];
    for (const position of positions.values()) {
      if (position.quantity !== 0 || position.quantity < 0) {
        openTickers.push(position.ticker);
      }
    }

    const prices = await this.twelveDataService.getPrices(openTickers);

    const priced: PricedPosition[] = [];
    let positionsMarketValue = 0;

    for (const position of positions.values()) {
      // A position that was fully closed out is not a holding.
      if (position.quantity === 0 || position.quantity < 0) continue;

      const avgPrice =
        position.buyQuantity > 0 ? position.buyCost / position.buyQuantity : 0;
      const costBasis = position.quantity * avgPrice;
      const marketPrice = prices[position.ticker] ?? 0;
      const hasPrice = marketPrice > 0;

      // Without a live price we fall back to cost basis (see class docstring).
      const marketValue = hasPrice
        ? position.quantity * marketPrice
        : costBasis;
      const unrealizedPnl = hasPrice ? marketValue - costBasis : 0;

      positionsMarketValue += marketValue;
      priced.push({
        ticker: position.ticker,
        quantity: position.quantity,
        price: hasPrice ? marketPrice : 0,
        avgPrice,
        costBasis,
        marketValue,
        unrealizedPnl,
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
        name: p.ticker, // no company-name source available from /price
        quantity: roundQuantity(p.quantity),
        price: round(p.price),
        // Requires previous close, which /price does not expose.
        changePercent: 0,
        dailyPnl: 0,
        avgPrice: round(p.avgPrice),
        costBasis: round(p.costBasis),
        marketValue: round(p.marketValue),
        unrealizedPnl: round(p.unrealizedPnl),
        allocation: round(allocation),
      };
    });

    // Show the largest positions first.
    result.sort((a, b) => b.allocation - a.allocation);

    return {
      positions: result,
      cash: round(cash),
      totalValue: round(totalValue),
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
