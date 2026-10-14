'use client';

import { useQuery } from '@tanstack/react-query';
import { investmentApi, type PortfolioSummary } from '@/api/investment';

export function usePortfolios() {
  return useQuery<PortfolioSummary[]>({
    queryKey: ['investment', 'portfolios'],
    queryFn: investmentApi.getPortfolios,
  });
}
