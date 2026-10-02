import apiClient from '@/lib/api-client';

export interface Position {
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

export interface Portfolio {
  positions: Position[];
  cash: number;
  totalValue: number;
}

export const investmentApi = {
  getPositions: async (): Promise<Portfolio> => {
    const response = await apiClient.get<Portfolio>('/investment/positions');
    return response.data;
  },
};
