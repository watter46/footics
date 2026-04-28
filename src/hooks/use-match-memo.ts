'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMatchMemo } from '@/lib/db';
import { matchKeys } from '@/lib/query-keys';

/**
 * useMatchMemo - 試合全体の自由記述メモを管理するフック
 *
 * 取得: IndexedDB から直接読み込む。
 * 保存: `footics-save-request` イベント経由で拡張機能の Save Queue に委譲する。
 *       実際のDB書き込みは Content Script が担い、完了後に `REFRESH_DATA` で
 *       TanStack Query のキャッシュが無効化されてUIが自動更新される。
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

  // 2. 保存 (拡張機能の Save Queue に委譲)
  const mutation = useMutation({
    mutationFn: async (newMemo: string) => {
      // footics-save-request イベントを発火 → Main Bridge → Isolated Bridge → Save Queue
      window.dispatchEvent(
        new CustomEvent('footics-save-request', {
          detail: {
            mode: 'MATCH',
            matchId,
            memo: newMemo,
          },
        }),
      );
    },
    onSuccess: () => {
      // UIの即時反映のため楽観的にキャッシュを更新する
      // 実際のDBへの反映は REFRESH_DATA イベントで再度行われる
      queryClient.setQueryData(queryKey, {
        matchId,
        memo: mutation.context as string,
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
