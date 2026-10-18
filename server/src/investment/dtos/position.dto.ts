/**
 * Response shapes for GET /investment/positions and /investment/portfolios.
 *
 * `PositionDto` intentionally mirrors the client `Position` type
 * (client/api/investment.ts) so the payload can be rendered directly.
 *
 * Market-price dependent fields come from the Twelve Data `/quote` endpoint:
 * `price`, `changePercent`, `dailyPnl`, `marketValue`, `unrealizedPnl` and
 * `unrealizedPnlPercent`.
 *
 * Note that TWO different percentages are returned — they answer different
 * questions and must not be confused:
 *
 * - `changePercent` — today's move of the price against the previous close
 *   ("how did this ticker do today"). Can be negative while the position is
 *   deeply in profit.
 * - `unrealizedPnlPercent` — total return of the position against its own
 *   cost basis ("how much am I up overall").
 *
 * When a live quote (or its previous close) is unavailable, these fields fall
 * back to 0 and `marketValue` falls back to cost basis, so the client can
 * still render the row.
 */
export interface PositionDto {
  ticker: string;
  name: string;
  quantity: number;

  // Market-price dependent: live price and today's move against prev close.
  price: number;
  changePercent: number;
  dailyPnl: number;

  // Computed from the user's own trade history.
  avgPrice: number;
  costBasis: number;

  // Market-price dependent: position value at the current price, and the
  // profit/loss relative to `costBasis` (absolute and in percent).
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;

  // Share of this position in the total portfolio value, in percent.
  allocation: number;
}

export interface PortfolioDto {
  positions: PositionDto[];

  // Free cash balance, extracted from the IBKR "Cash Report" section.
  cash: number;

  // Total portfolio value = sum(open positions market value) + cash, used as
  // the denominator for `allocation`. Positions without a live quote fall back
  // to their cost basis.
  totalValue: number;
}

/**
 * Lightweight per-portfolio summary used to render the portfolio cards on the
 * Investments page (id, name, and the aggregate value incl. cash).
 *
 * The aggregate return fields are OPTIONAL because the same shape is also
 * returned by the create/update portfolio endpoints, which do not compute any
 * aggregates (a freshly created portfolio has no positions yet).
 *
 * When present, they are aggregated only over positions that have a live
 * quote: a position without a price has `unrealizedPnl = 0`, and including it
 * would drag the portfolio-wide percentage toward zero.
 */
export interface PortfolioSummaryDto {
  id: string;
  name: string;
  cash: number;
  totalValue: number;

  // Aggregate cost basis of the priced positions.
  costBasis?: number;
  // Aggregate unrealized P&L of the priced positions.
  unrealizedPnl?: number;
  // Total return of the portfolio = unrealizedPnl / costBasis * 100.
  unrealizedPnlPercent?: number;
}

export interface CreatedPortfolioDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
