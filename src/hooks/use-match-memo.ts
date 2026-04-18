'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMatchMemo, putMatchMemo } from '@/lib/db';
import { type MatchMemo, MatchMemoSchema } from '@/lib/schema';

/**
 * useMatchMemo - 試合全体の自由記述メモを管理するフック
 *
 * 取得・保存・キャッシュ更新をカプセル化します。
 */
export function useMatchMemo(matchId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['match-memo', matchId];

  // 1. フェッチ
  const { data: matchMemo, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const stored = await getMatchMemo(matchId);
      return stored || { matchId, memo: '', updatedAt: Date.now() };
    },
  });

  // 2. 保存 (Mutation)
  const mutation = useMutation({
    mutationFn: async (newMemo: string) => {
      const data = {
        matchId,
        memo: newMemo,
        updatedAt: Date.now(),
      };
      // バリデーション
      const validated = MatchMemoSchema.parse(data);
      await putMatchMemo(validated);
      return validated;
    },
    onSuccess: (data) => {
      // キャッシュを直接更新して即時反映
      queryClient.setQueryData(queryKey, data);
    },
  });

  return {
    memo: matchMemo?.memo ?? '',
    saveMemo: mutation.mutate,
    isSaving: mutation.isPending,
    isLoading,
  };
}
