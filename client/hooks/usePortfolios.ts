'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { investmentApi, type PortfolioSummary } from '@/api/investment';

export function usePortfolios() {
  return useQuery<PortfolioSummary[]>({
    queryKey: ['investment', 'portfolios'],
    queryFn: investmentApi.getPortfolios,
  });
}

// Creating, renaming or deleting a portfolio changes both the cards and the
// aggregated positions table, so both queries are invalidated on success.
function useInvalidateInvestment() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['investment', 'portfolios'] });
    queryClient.invalidateQueries({ queryKey: ['investment', 'positions'] });
  };
}

export function useCreatePortfolio() {
  const invalidate = useInvalidateInvestment();

  return useMutation<PortfolioSummary, unknown, string>({
    mutationFn: (name) => investmentApi.createPortfolio(name),
    onSuccess: invalidate,
  });
}

export function useUpdatePortfolio() {
  const invalidate = useInvalidateInvestment();

  return useMutation<PortfolioSummary, unknown, { id: string; name: string }>({
    mutationFn: ({ id, name }) => investmentApi.updatePortfolio(id, name),
    onSuccess: invalidate,
  });
}

export function useDeletePortfolio() {
  const invalidate = useInvalidateInvestment();

  return useMutation<void, unknown, string>({
    mutationFn: (id) => investmentApi.deletePortfolio(id),
    onSuccess: invalidate,
  });
}
