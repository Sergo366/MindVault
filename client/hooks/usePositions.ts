'use client';

import { useQuery } from '@tanstack/react-query';
import { investmentApi, type Position } from '@/api/investment';

interface UsePositionsOptions {
  enabled?: boolean;
}

export function usePositions({ enabled = true }: UsePositionsOptions = {}) {
  return useQuery<Position[]>({
    queryKey: ['investment', 'positions'],
    queryFn: investmentApi.getPositions,
    enabled,
  });
}
