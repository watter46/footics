'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMatchMemo, putMatchMemo } from '@/lib/db';
import { matchKeys } from '@/lib/query-keys';

/**
 * useMatchMemo - 試合全体の自由記述メモを管理するフック
 *
 * 取得: IndexedDB から直接読み込む。
 * 保存: IndexedDB へ直接保存する。
 */
export function useMatchMemo(matchId: string) {
  const queryClient = useQueryClient();
  const queryKey = matchKeys.memo(matchId);

  // 1. フェッチ
  const { data: matchMemo, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const stored = await getMatchMemo(matchId);
      return stored || { matchId, memo: '', updatedAt: Date.now() };
    },
  });

  // 2. 保存 (IndexedDB へ直接保存)
  const mutation = useMutation({
    mutationFn: async (newMemo: string) => {
      await putMatchMemo({ matchId, memo: newMemo, updatedAt: Date.now() });
    },
    onSuccess: (_data, newMemo) => {
      queryClient.setQueryData(queryKey, {
        matchId,
        memo: newMemo,
        updatedAt: Date.now(),
      });
    },
  });

  return {
    memo: matchMemo?.memo ?? '',
    saveMemo: (newMemo: string) => mutation.mutate(newMemo),
    isSaving: mutation.isPending,
    isLoading,
  };
}
