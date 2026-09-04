'use client';

/**
 * use-tactical-capture-bridge.ts
 * Extension -> Footics Tactical Direct Import Bridge Listener
 *
 * 拡張機能から送信されたキャプチャフレーム画像を受信し、
 * 現在の戦術ボード（Canvas）の背景画像として即時自動配置します。
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  TACTICAL_BRIDGE_CHANNEL,
  TACTICAL_CAPTURE_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  type TacticalCaptureEventPayload,
  TacticalCapturePayloadSchema,
} from '@/lib/types/capture-protocol';

export type { TacticalCaptureEventPayload };

export function useTacticalCaptureBridge() {
  const setImageBackground = useTacticalUnifiedStore(
    (s) => s.setImageBackground,
  );
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleCaptureData = (rawPayload: unknown) => {
      const parsed = TacticalCapturePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return;
      }
      const payload = parsed.data;
      if (!payload.dataUrl || processedIdsRef.current.has(payload.id)) {
        return;
      }
      processedIdsRef.current.add(payload.id);

      console.log(
        '🎯 [TacticalBridge] Applying capture image to background:',
        payload.id,
      );
      setImageBackground(payload.dataUrl);
      toast.success('🎯 キャプチャ画像を背景として適用しました', {
        description:
          payload.title || '動画フレームから直接インポートされました',
      });
    };

    // 1. window.addEventListener('message') による受信 (Isolated World -> Main World)
    const handleWindowMessage = (event: MessageEvent) => {
      if (
        event.data?.type === TACTICAL_CAPTURE_WINDOW_MESSAGE &&
        event.data?.payload
      ) {
        console.log(
          '🎯 [TacticalBridge] Received FOOTICS_TACTICAL_CAPTURE_PAYLOAD via window.message:',
          event.data.payload.id,
        );
        handleCaptureData(event.data.payload);
      }
    };
    window.addEventListener('message', handleWindowMessage);

    // 2. CustomEvent からの受信（Content Script -> Main World）
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<unknown>;
      if (customEvent.detail) {
        console.log(
          '🎯 [TacticalBridge] Received capture via footics-tactical-capture-received CustomEvent',
        );
        handleCaptureData(customEvent.detail);
      }
    };
    window.addEventListener(TACTICAL_CAPTURE_CUSTOM_EVENT, handleCustomEvent);

    // 3. 拡張機能 (Content Script) へ「最新キャプチャデータ」を能動的に Pull 要求
    const requestPendingCapture = () => {
      window.dispatchEvent(new CustomEvent(TACTICAL_CAPTURE_PULL_CUSTOM_EVENT));
      window.postMessage({ type: TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE }, '*');
    };

    // マウント直後、および 100ms, 300ms, 800ms, 1500ms 後に能動的に Pull 要求を送信
    requestPendingCapture();
    const t1 = setTimeout(requestPendingCapture, 100);
    const t2 = setTimeout(requestPendingCapture, 300);
    const t3 = setTimeout(requestPendingCapture, 800);
    const t4 = setTimeout(requestPendingCapture, 1500);

    // ウィンドウがフォーカスされた際（別タブから戻ってきた際）にも Pull 要求
    const handleFocus = () => {
      requestPendingCapture();
    };
    window.addEventListener('focus', handleFocus);

    // 4. 同一オリジンの BroadcastChannel からの受信（念のためのフォールバック）
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(TACTICAL_BRIDGE_CHANNEL);
        channel.onmessage = (event) => {
          if (
            event.data?.type === 'TACTICAL_CAPTURE_RECEIVED' &&
            event.data?.payload
          ) {
            handleCaptureData(event.data.payload);
          }
        };
      }
    } catch {}

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (channel) {
        channel.close();
      }
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener(
        TACTICAL_CAPTURE_CUSTOM_EVENT,
        handleCustomEvent,
      );
      window.removeEventListener('focus', handleFocus);
    };
  }, [setImageBackground]);
}
