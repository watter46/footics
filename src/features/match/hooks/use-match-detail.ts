'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getMatch, setKeyValue } from '@/lib/db';
import { matchKeys } from '@/lib/query-keys';
import type { Match } from '@/types';

/**
 * useMatchDetail - 試合詳細の取得と直近アクティブ試合の記録を行うフック
 */
export function useMatchDetail(matchId: string): {
  match: Match | null | undefined;
  isLoading: boolean;
  recordRecentMatch: (id: string) => Promise<void>;
} {
  const { data: match, isLoading } = useQuery({
    queryKey: matchKeys.detail(matchId),
    queryFn: () => getMatch(matchId),
    enabled: Boolean(matchId),
  });

  const recordRecentMatch = useCallback(async (id: string) => {
    if (!id) return;
    await setKeyValue('lastActiveMatchId', id);
  }, []);

  return {
    match,
    isLoading,
    recordRecentMatch,
  };
}
