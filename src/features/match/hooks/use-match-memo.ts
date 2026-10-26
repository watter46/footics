'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getMatchMemo, putMatchMemo } from '@/lib/db';
import { matchKeys } from '@/lib/query-keys';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';

interface FooticsRefreshMessage {
  type?: string;
  action?: string;
  detail?: { action?: string; matchId?: string | number };
  payload?: { matchId?: string | number };
}

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

  // 2. 外部更新通知の購読 (Extension や Batch Import からの変更同期)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as FooticsRefreshMessage | undefined;
      if (!data || typeof data !== 'object') return;

      const isLegacyAction =
        data.type === 'footics-action' &&
        data.detail?.action === SHORTCUT_ACTIONS.REFRESH_DATA &&
        (!data.detail.matchId ||
          String(data.detail.matchId) === String(matchId));

      const isNewAction =
        data.type === 'FOOTICS_ACTION' &&
        data.action === SHORTCUT_ACTIONS.REFRESH_DATA &&
        (!data.payload?.matchId ||
          String(data.payload.matchId) === String(matchId));

      if (isLegacyAction || isNewAction) {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [matchId, queryClient, queryKey]);

  // 3. 保存 (IndexedDB へ直接保存)
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
