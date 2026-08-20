'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  customEventKeys,
  eventKeys,
  matchKeys,
  playerKeys,
} from '@/lib/query-keys';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { useMemoOverlayStore } from '@/stores/memo-overlay-store';

/**
 * useDataSync
 *
 * 責務: 拡張機能から発火される `footics-action` イベントを購読し、
 * `REFRESH_DATA` 受信時に TanStack Query のキャッシュを無効化して UI を自動更新する。
 *
 * 配置: `QueryClientProvider` の内側にあるコンポーネントから呼び出すこと。
 */
export function useDataSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleAction = (event: Event) => {
      const customEvent = event as CustomEvent<{
        action: string;
        matchId?: string;
      }>;
      const { action, matchId } = customEvent.detail ?? {};

      if (action !== SHORTCUT_ACTIONS.REFRESH_DATA) return;
      console.log('[useDataSync] REFRESH_DATA received, matchId:', matchId);

      // 保存フラグをリセット
      useMemoOverlayStore.getState().setIsSaving(false);

      // 選手マスターのクエリを常に無効化
      queryClient.invalidateQueries({ queryKey: playerKeys.all });

      if (matchId) {
        // 特定の試合に関連するクエリを無効化
        queryClient.invalidateQueries({
          queryKey: customEventKeys.byMatch(matchId),
        });
        queryClient.invalidateQueries({
          queryKey: eventKeys.all,
        });
        queryClient.invalidateQueries({
          queryKey: matchKeys.detail(matchId),
        });
        queryClient.invalidateQueries({
          queryKey: matchKeys.memo(matchId),
        });
      } else {
        // matchId が不明な場合はすべてのデータ系クエリを無効化
        queryClient.invalidateQueries({ queryKey: customEventKeys.all });
        queryClient.invalidateQueries({ queryKey: eventKeys.all });
        queryClient.invalidateQueries({ queryKey: matchKeys.all });
      }
    };

    window.addEventListener('footics-action', handleAction);
    return () => {
      window.removeEventListener('footics-action', handleAction);
    };
  }, [queryClient]);
}
