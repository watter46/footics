import { useEffect } from 'react';
import { useMemoOverlayStore } from '../stores/memo-overlay-store';
import {
  EVENT_BRIDGE_HANDLERS,
  type EventBridgeContext,
  type FooticsActionDetail,
} from './event-bridge-handlers';

export function useMemoOverlayEventBridge(
  onClose: () => void,
  onSave: () => void,
  onOpen?: EventBridgeContext['onOpen'],
  isActive = true,
) {
  useEffect(() => {
    const handleAction = (action: string, detail?: FooticsActionDetail) => {
      const isToggle =
        action === 'TOGGLE_MATCH_MEMO' || action === 'TOGGLE_EVENT_MEMO';
      if (!isActive && !isToggle) return;
      const handler = EVENT_BRIDGE_HANDLERS[action];
      if (handler) {
        handler(detail ?? { action }, {
          onClose,
          onSave,
          onOpen,
          store: useMemoOverlayStore.getState(),
        });
      }
    };

    const handleMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'FOOTICS_ACTION' && typeof d.action === 'string') {
        handleAction(d.action, d.payload ?? d.detail ?? { action: d.action });
      } else if (
        d.type === 'footics-action' &&
        typeof d.detail?.action === 'string'
      ) {
        handleAction(d.detail.action, d.detail);
      }
    };

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | FooticsActionDetail
        | undefined;
      if (detail?.action) handleAction(detail.action, detail);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('footics-action', handleCustom);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('footics-action', handleCustom);
    };
  }, [onClose, onSave, onOpen, isActive]);
}
