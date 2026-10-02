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
  unrealizedPnlAllocation: number;
}

export const investmentApi = {
  getPositions: async (): Promise<Position[]> => {
    const response = await apiClient.get<Position[]>('/investment/positions');
    return response.data;
  },
};
