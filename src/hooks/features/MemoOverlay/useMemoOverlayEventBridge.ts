import { useEffect } from 'react';
import { useMemoOverlayStore } from '@/stores/useMemoOverlayStore';

/**
 * useMemoOverlayEventBridge
 *
 * 責務: `window` の `footics-action` カスタムイベントを監視し、
 * `useMemoOverlayStore` のアクションへ橋渡しする。
 *
 * このHookは拡張機能・本体アプリ問わず、イベント駆動の操作連携を提供する。
 */
export function useMemoOverlayEventBridge(
  onClose: () => void,
  onSave: () => void,
  onOpen?: (params: {
    mode: 'MATCH' | 'EVENT';
    matchId?: string;
    data?: any;
  }) => void,
) {
  useEffect(() => {
    const handleFooticsAction = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        action: string;
        categoryIndex?: number;
        key?: string;
        shiftKey?: boolean;
        matchId?: string;
        id?: string;
        period?: number;
        minute?: number;
        second?: number;
        labels?: string[];
        memo?: string;
      };
      const { action } = detail;

      // Zustandストアから最新の状態を取得
      const store = useMemoOverlayStore.getState();

      switch (action) {
        case 'TOGGLE_MATCH_MEMO':
          if (onOpen) {
            onOpen({
              mode: 'MATCH',
              matchId: detail.matchId,
              data: { memo: detail.memo },
            });
          }
          break;

        case 'TOGGLE_EVENT_MEMO':
          if (onOpen) {
            onOpen({
              mode: 'EVENT',
              matchId: detail.matchId,
              data: {
                id: detail.id,
                period: detail.period,
                minute: detail.minute,
                second: detail.second,
                labels: detail.labels,
                memo: detail.memo,
              },
            });
          }
          break;

        case 'CLOSE_OVERLAY':
          onClose();
          break;
        // ... (rest of the switch remains the same)

        case 'SAVE_MEMO':
          onSave();
          break;

        case 'NEXT_PHASE': {
          if (store.mode === 'EVENT') {
            const result = store.nextPhase();
            if (result === 'BLOCKED') return;
          } else {
            onSave();
          }
          break;
        }

        case 'PREV_PHASE':
          store.prevPhase();
          break;

        case 'BACKSPACE':
          if (store.mode === 'EVENT') {
            if (store.phase === 0) {
              store.backspaceTimeStr();
            } else if (store.phase === 1) {
              store.backspaceLabel();
            }
          }
          break;

        case 'NAVIGATE_SUGGESTION':
          if (store.mode === 'EVENT' && store.phase === 1) {
            const direction = detail.key === 'ArrowDown' ? 1 : -1;
            store.navigateSuggestion(direction);
          }
          break;

        case 'FILTER_CATEGORY':
          if (
            store.mode === 'EVENT' &&
            typeof detail.categoryIndex === 'number'
          ) {
            store.filterByCategory(detail.categoryIndex);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('footics-action', handleFooticsAction);
    return () =>
      window.removeEventListener('footics-action', handleFooticsAction);
  }, [onClose, onSave]); // onClose, onSave のみが依存関係
}
