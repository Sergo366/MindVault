/**
 * Response shape for GET /investment/positions.
 *
 * This intentionally mirrors the `Position` interface on the client
 * (client/components/investments/PositionsTable.tsx) so the payload can be
 * rendered directly without any mapping.
 *
 * Fields typed as `number | null` depend on a live market price and are
 * returned as null until a quotes/market-data provider is wired up.
 */
export interface PositionDto {
  ticker: string;
  name: string;
  quantity: number;

  // Market-price dependent fields (no quotes API yet -> null)
  price: number | null;
  changePercent: number | null;
  dailyPnl: number | null;

  // Fields computed from the user's own trade history
  avgPrice: number;
  costBasis: number;

  // Market-price dependent fields (no quotes API yet -> null)
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlAllocation: number | null;
}
