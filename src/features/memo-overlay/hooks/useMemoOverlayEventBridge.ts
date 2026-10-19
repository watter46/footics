import { useEffect } from 'react';
import { useMemoOverlayStore } from '../stores/memo-overlay-store';
import {
  EVENT_BRIDGE_HANDLERS,
  type EventBridgeContext,
  type FooticsActionDetail,
} from './event-bridge-handlers';

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
  onOpen?: EventBridgeContext['onOpen'],
  isActive = true,
) {
  useEffect(() => {
    const handleFooticsAction = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | FooticsActionDetail
        | undefined;
      if (!detail?.action) return;

      // 開く操作 (TOGGLE_*) 以外は、isActive が false の場合は無視する
      const isToggleAction =
        detail.action === 'TOGGLE_MATCH_MEMO' ||
        detail.action === 'TOGGLE_EVENT_MEMO';
      if (!isActive && !isToggleAction) return;

      const handler = EVENT_BRIDGE_HANDLERS[detail.action];
      if (handler) {
        const store = useMemoOverlayStore.getState();
        handler(detail, { onClose, onSave, onOpen, store });
      }
    };

    window.addEventListener('footics-action', handleFooticsAction);
    return () =>
      window.removeEventListener('footics-action', handleFooticsAction);
  }, [onClose, onSave, onOpen, isActive]);
}
