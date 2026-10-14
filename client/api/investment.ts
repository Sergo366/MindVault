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

export interface PortfolioSummary {
  id: string;
  name: string;
  cash: number;
  totalValue: number;
}

export const investmentApi = {
  // Passing an empty array means "no portfolios selected"; omitting the
  // argument entirely returns positions across all portfolios.
  getPositions: async (portfolioIds?: string[]): Promise<Portfolio> => {
    const response = await apiClient.get<Portfolio>('/investment/positions', {
      params:
        portfolioIds === undefined
          ? undefined
          : { portfolioIds: portfolioIds.join(',') },
    });
    return response.data;
  },

  getPortfolios: async (): Promise<PortfolioSummary[]> => {
    const response = await apiClient.get<PortfolioSummary[]>(
      '/investment/portfolios',
    );
    return response.data;
  },
};
