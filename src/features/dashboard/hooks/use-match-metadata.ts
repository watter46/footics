'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getMatch } from '@/lib/db';

export type DashboardStatus =
  | 'idle'
  | 'initializing'
  | 'loading-data'
  | 'error'
  | 'ready';

export function useMatchMetadata(matchId: string) {
  const {
    data: metadata,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['matchData', matchId],
    queryFn: () => getMatch(matchId),
  });

  const status = useMemo<DashboardStatus>(() => {
    if (isLoading) return 'loading-data';
    if (queryError || !metadata) return 'error';
    return 'ready';
  }, [isLoading, queryError, metadata]);

  const error = queryError
    ? (queryError as Error).message
    : !metadata && !isLoading
      ? 'Metadata not found'
      : null;
  const cacheMissing = !metadata && !isLoading;

  return { metadata, status, error, cacheMissing, isLoading };
}
