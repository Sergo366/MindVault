/**
 * Response shapes for GET /investment/positions.
 *
 * `PositionDto` intentionally mirrors the client `Position` type
 * (client/api/investment.ts) so the payload can be rendered directly.
 *
 * Fields that depend on a live market price are currently returned as 0,
 * because there is no quotes/market-data provider yet. Once a quotes API is
 * wired up, only these fields need real values: price, changePercent,
 * dailyPnl, marketValue, unrealizedPnl. `allocation` will also switch from
 * cost-basis weighting to market-value weighting at that point.
 */
export interface PositionDto {
  ticker: string;
  name: string;
  quantity: number;

  // Market-price dependent (0 until a quotes API exists)
  price: number;
  changePercent: number;
  dailyPnl: number;

  // Computed from the user's own trade history
  avgPrice: number;
  costBasis: number;

  // Market-price dependent (0 until a quotes API exists)
  marketValue: number;
  unrealizedPnl: number;

  // Share of this position in the total portfolio value, in percent.
  allocation: number;
}

export interface PortfolioDto {
  positions: PositionDto[];

  // Free cash balance, extracted from the IBKR "Cash Report" section.
  cash: number;

  // Total portfolio value = sum(open positions cost basis) + cash, used as the
  // denominator for `allocation` until live market prices are available.
  totalValue: number;
}
