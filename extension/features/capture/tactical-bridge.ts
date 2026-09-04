/**
 * tactical-bridge.ts
 * Extension -> Footics Tactical Direct Import Bridge
 *
 * キャプチャしたフレーム画像を Footics 本体アプリの Tactical 画面（/tactical）へ
 * 直接転送し、バックグラウンドストレージおよびメッセージングで連携します。
 */

import { sendMessage } from 'webext-bridge/content-script';
import { STORAGE_KEYS, TACTICAL_BRIDGE_CHANNEL } from '../../constants';
import {
  createTacticalCapturePayload,
  type TacticalCapturePayload,
} from '../../types/schemas';

/**
 * キャプチャペイロードを生成
 */
export function createCapturePayload(
  dataUrl: string,
  meta?: { sourceUrl?: string; title?: string },
): TacticalCapturePayload {
  return createTacticalCapturePayload(dataUrl, meta);
}

/**
 * キャプチャデータをストレージへ永続化し、Tactical 画面へ転送を指示
 */
export async function sendCaptureToTactical(
  dataUrl: string,
  meta?: { sourceUrl?: string; title?: string },
): Promise<{
  success: boolean;
  payload: TacticalCapturePayload;
  tabId?: number;
  created?: boolean;
}> {
  const payload = createCapturePayload(dataUrl, meta);

  // 1. chrome.storage.local に未処理キャプチャとして保存（新規タブ起動時にも即座に復元可能にする）
  try {
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      await browser.storage.local.set({
        [STORAGE_KEYS.TACTICAL_PENDING_CAPTURE]: payload,
      });

      // 直近キャプチャ履歴にも追記（最大10件）
      const existing = await browser.storage.local.get(
        STORAGE_KEYS.TACTICAL_RECENT_CAPTURES,
      );
      const rawRecent = existing[STORAGE_KEYS.TACTICAL_RECENT_CAPTURES];
      const recentList: TacticalCapturePayload[] = Array.isArray(rawRecent)
        ? (rawRecent as TacticalCapturePayload[])
        : [];

      const updatedRecent = [
        payload,
        ...recentList.filter((item) => item.id !== payload.id),
      ].slice(0, 10);
      await browser.storage.local.set({
        [STORAGE_KEYS.TACTICAL_RECENT_CAPTURES]: updatedRecent,
      });
    }
  } catch (err) {
    console.warn(
      '[TacticalBridge] Failed to write capture payload to browser.storage:',
      err,
    );
  }

  // 2. 同一オリジンの BroadcastChannel へブロードキャスト
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(TACTICAL_BRIDGE_CHANNEL);
      channel.postMessage({
        type: 'TACTICAL_CAPTURE_RECEIVED',
        payload,
      });
      channel.close();
    }
  } catch (err) {
    console.warn('[TacticalBridge] BroadcastChannel postMessage failed:', err);
  }

  // 3. Background へメッセージを送信し、Tactical タブの探索・アクティブ化・通知を実行
  try {
    const res = await sendMessage(
      'SEND_CAPTURE_TO_TACTICAL',
      { payload },
      'background',
    );
    return {
      success: res?.success ?? true,
      payload,
      tabId: res?.tabId,
      created: res?.created,
    };
  } catch (err) {
    console.error(
      '[TacticalBridge] Failed to send SEND_CAPTURE_TO_TACTICAL to background:',
      err,
    );
    return {
      success: false,
      payload,
    };
  }
}
