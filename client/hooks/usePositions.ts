'use client';

import { useQuery } from '@tanstack/react-query';
import { investmentApi, type Portfolio } from '@/api/investment';

interface UsePositionsOptions {
  enabled?: boolean;
  // When provided, only these portfolios are included (empty = none).
  // When omitted, positions across all portfolios are returned.
  portfolioIds?: string[];
}

export function usePositions({
  enabled = true,
  portfolioIds,
}: UsePositionsOptions = {}) {
  return useQuery<Portfolio>({
    queryKey: ['investment', 'positions', portfolioIds ?? 'all'],
    queryFn: () => investmentApi.getPositions(portfolioIds),
    enabled,
  });
}
