import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMemoOverlayStore } from '@/features/memo-overlay';
import {
  customEventKeys,
  eventKeys,
  matchKeys,
  playerKeys,
} from '@/lib/query-keys';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';

/**
 * useDataSync
 *
 * 責務: 拡張機能から送信される `footics-action` メッセージ（window.postMessage）を購読し、
 * `REFRESH_DATA` 受信時に TanStack Query のキャッシュを無効化して UI を自動更新する。
 *
 * 配置: `QueryClientProvider` の内側にあるコンポーネントから呼び出すこと。
 */
export function useDataSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleDetail = (detail: unknown) => {
      if (!detail || typeof detail !== 'object') return;
      const { action, matchId } = detail as {
        action?: unknown;
        matchId?: unknown;
      };
      if (action !== SHORTCUT_ACTIONS.REFRESH_DATA) return;

      // 保存中フラグが立っている場合のみリセットして副作用を最小化
      if (useMemoOverlayStore.getState().isSaving) {
        useMemoOverlayStore.getState().setIsSaving(false);
      }

      // 選手マスターのクエリを常に無効化
      queryClient.invalidateQueries({ queryKey: playerKeys.all });

      const safeMatchId = typeof matchId === 'string' ? matchId : undefined;
      if (safeMatchId) {
        // 特定の試合に関連するクエリを無効化
        queryClient.invalidateQueries({
          queryKey: customEventKeys.byMatch(safeMatchId),
        });
        queryClient.invalidateQueries({
          queryKey: eventKeys.all,
        });
        queryClient.invalidateQueries({
          queryKey: matchKeys.detail(safeMatchId),
        });
        queryClient.invalidateQueries({
          queryKey: matchKeys.memo(safeMatchId),
        });
      } else {
        // matchId が不明な場合はすべてのデータ系クエリを無効化
        queryClient.invalidateQueries({ queryKey: customEventKeys.all });
        queryClient.invalidateQueries({ queryKey: eventKeys.all });
        queryClient.invalidateQueries({ queryKey: matchKeys.all });
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'footics-action'
      ) {
        handleDetail(event.data.detail);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [queryClient]);
}
