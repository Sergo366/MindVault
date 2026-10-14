'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentApi, type UploadStatementsResult } from '@/api/investment';

/**
 * Uploads IBKR statement CSV files.
 *
 * Loading and error state come from react-query (`isPending` / `error`) instead
 * of hand-rolled `useState` flags, and on success the portfolio cards and the
 * positions table are refreshed automatically.
 */
export function useUploadStatements() {
  const queryClient = useQueryClient();

  return useMutation<UploadStatementsResult, unknown, File[]>({
    mutationFn: (files) => investmentApi.uploadStatements(files),
    onSuccess: () => {
      // A new statement changes both the totals and the positions, so refresh
      // both queries (active ones refetch immediately).
      queryClient.invalidateQueries({ queryKey: ['investment', 'portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['investment', 'positions'] });
    },
  });
}
