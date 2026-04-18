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
) {
  useEffect(() => {
    const handleFooticsAction = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        action: string;
        categoryIndex?: number;
        key?: string;
        shiftKey?: boolean;
      };
      const { action } = detail;

      // Zustandストアから最新の状態を取得
      const store = useMemoOverlayStore.getState();

      switch (action) {
        case 'CLOSE_OVERLAY':
          onClose();
          break;

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
