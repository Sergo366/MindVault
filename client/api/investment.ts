import apiClient from '@/lib/api-client';

export interface Position {
  ticker: string;
  name: string;
  quantity: number;

  // Market-price dependent: live price and today's move vs the previous close.
  // Note: `changePercent` is the DAILY change, not the total return.
  price: number;
  changePercent: number;
  dailyPnl: number;

  // Computed from the user's own trade history.
  avgPrice: number;
  costBasis: number;

  // Market-price dependent: position value at the current price, and the
  // profit/loss relative to `costBasis` (absolute and in percent). The percent
  // is the TOTAL return ("how much am I up overall"), unlike `changePercent`.
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;

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

  // Aggregate total return across priced positions. Optional because the
  // create/update portfolio endpoints return a summary without positions.
  costBasis?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
}

export interface UploadStatementsResult {
  message: string;
  total: number;
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

  createPortfolio: async (name: string): Promise<PortfolioSummary> => {
    const response = await apiClient.post<PortfolioSummary>(
      '/investment/portfolios',
      { name },
    );
    return response.data;
  },

  updatePortfolio: async (
    id: string,
    name: string,
  ): Promise<PortfolioSummary> => {
    const response = await apiClient.patch<PortfolioSummary>(
      `/investment/portfolios`,
      { name, portfolioId: id },
    );
    return response.data;
  },

  deletePortfolio: async (id: string): Promise<void> => {
    await apiClient.delete(`/investment/portfolios`, { data: { portfolioId: id } });
  },

  // The statement is imported into `portfolioId`, so the backend can attach
  // every parsed record to that portfolio (StatementRecord.portfolioId is
  // NOT NULL).
  uploadStatements: async (
    files: File[],
    portfolioId: string,
  ): Promise<UploadStatementsResult> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    formData.append('portfolioId', portfolioId);
    const response = await apiClient.post<UploadStatementsResult>(
      '/investment/upload-statements',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
