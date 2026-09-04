/**
 * capture-protocol.ts
 * Shared Capture Protocol & Contracts between Web App and Extension
 *
 * Web本体 (src/) とブラウザ拡張機能 (extension/) の間で交換される
 * キャプチャ画像ペイロード、メッセージング、イベント名の単一情報源 (SSOT)。
 */

import { z } from 'zod';

// ─────────────────────────────────────────
// § 1. Bridge Channel & Event Constants
// ─────────────────────────────────────────

/** BroadcastChannel 名（同一オリジン間通信） */
export const TACTICAL_BRIDGE_CHANNEL = 'footics-tactical-bridge' as const;

/** window.postMessage で Web アプリへ送信するキャプチャ通知イベント型 */
export const TACTICAL_CAPTURE_WINDOW_MESSAGE =
  'FOOTICS_TACTICAL_CAPTURE_PAYLOAD' as const;

/** window.dispatchEvent で発火する CustomEvent 名 */
export const TACTICAL_CAPTURE_CUSTOM_EVENT =
  'footics-tactical-capture-received' as const;

/** Web アプリ側から最新キャプチャを要求する window.postMessage 型 */
export const TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE =
  'FOOTICS_REQUEST_PENDING_CAPTURE' as const;

/** Web アプリ側から最新キャプチャを要求する CustomEvent 名 */
export const TACTICAL_CAPTURE_PULL_CUSTOM_EVENT =
  'footics-request-pending-capture' as const;

/** Extension Background / Content 間のメッセージ識別子 */
export const TACTICAL_BRIDGE_MESSAGE_TYPES = {
  SEND_CAPTURE_TO_TACTICAL: 'SEND_CAPTURE_TO_TACTICAL',
  TACTICAL_CAPTURE_RECEIVED: 'TACTICAL_CAPTURE_RECEIVED',
  REQUEST_TAB_CAPTURE: 'REQUEST_TAB_CAPTURE',
  TRIGGER_CAPTURE: 'TRIGGER_CAPTURE',
} as const;

/** キャプチャ関連のストレージキー */
export const TACTICAL_STORAGE_KEYS = {
  PENDING_CAPTURE: 'tactical_pending_capture',
  RECENT_CAPTURES: 'tactical_recent_captures',
} as const;

// ─────────────────────────────────────────
// § 2. Schemas & Types
// ─────────────────────────────────────────

/**
 * 戦術ボードへのダイレクトインポート用キャプチャペイロードスキーマ
 */
export const TacticalCapturePayloadSchema = z.object({
  /** キャプチャの一意ID (例: capture_1725330000000_abc123) */
  id: z.string().min(1),
  /** 画像のDataURL (base64) */
  dataUrl: z.string().min(1),
  /** キャプチャ取得時のUNIXミリ秒タイムスタンプ */
  timestamp: z.number().int().positive(),
  /** キャプチャ元ページのURL（YouTube等の動画URL） */
  sourceUrl: z.string().optional(),
  /** キャプチャ元ページのタイトルまたは試合名 */
  title: z.string().optional(),
});

export type TacticalCapturePayload = z.infer<
  typeof TacticalCapturePayloadSchema
>;

/** 後方互換性およびイベントペイロードのエイリアス型 */
export type TacticalCaptureEventPayload = TacticalCapturePayload;
export const TacticalCaptureEventPayloadSchema = TacticalCapturePayloadSchema;

/**
 * Background への転送要求ペイロード
 */
export const SendCaptureToTacticalRequestSchema = z.object({
  payload: TacticalCapturePayloadSchema,
});

export type SendCaptureToTacticalRequest = z.infer<
  typeof SendCaptureToTacticalRequestSchema
>;

/**
 * Background からの転送結果レスポンス
 */
export const SendCaptureToTacticalResponseSchema = z.object({
  success: z.boolean(),
  tabId: z.number().optional(),
  created: z.boolean().optional(),
  error: z.string().optional(),
});

export type SendCaptureToTacticalResponse = z.infer<
  typeof SendCaptureToTacticalResponseSchema
>;

/**
 * タブキャプチャ要求レスポンス
 */
export const RequestTabCaptureResponseSchema = z.object({
  success: z.boolean(),
  dataUrl: z.string().optional(),
  error: z.string().optional(),
});

export type RequestTabCaptureResponse = z.infer<
  typeof RequestTabCaptureResponseSchema
>;

/**
 * window.postMessage 形式のキャプチャ通知メッセージ
 */
export const FooticsTacticalCaptureMessageSchema = z.object({
  type: z.literal(TACTICAL_CAPTURE_WINDOW_MESSAGE),
  payload: TacticalCapturePayloadSchema,
});

export type FooticsTacticalCaptureMessage = z.infer<
  typeof FooticsTacticalCaptureMessageSchema
>;

/**
 * window.postMessage 形式の Pull 要求メッセージ
 */
export const FooticsRequestPendingCaptureMessageSchema = z.object({
  type: z.literal(TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE),
});

export type FooticsRequestPendingCaptureMessage = z.infer<
  typeof FooticsRequestPendingCaptureMessageSchema
>;

/**
 * BroadcastChannel 形式のキャプチャ受信メッセージ
 */
export const TacticalBroadcastMessageSchema = z.object({
  type: z.literal('TACTICAL_CAPTURE_RECEIVED'),
  payload: TacticalCapturePayloadSchema,
});

export type TacticalBroadcastMessage = z.infer<
  typeof TacticalBroadcastMessageSchema
>;

// ─────────────────────────────────────────
// § 3. Validation & Utility Helpers
// ─────────────────────────────────────────

/**
 * 未知のデータが TacticalCapturePayload に合致するか検証
 */
export function isTacticalCapturePayload(
  data: unknown,
): data is TacticalCapturePayload {
  return TacticalCapturePayloadSchema.safeParse(data).success;
}

/**
 * 未知のデータを TacticalCapturePayloadSchema で安全にパース
 */
export function safeParseTacticalCapturePayload(
  data: unknown,
): ReturnType<typeof TacticalCapturePayloadSchema.safeParse> {
  return TacticalCapturePayloadSchema.safeParse(data);
}

/**
 * データを検証し、成功時は型安全なペイロードを、失敗時は null を返す
 */
export function validateTacticalCapturePayload(
  data: unknown,
): TacticalCapturePayload | null {
  const result = TacticalCapturePayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * キャプチャペイロードの新規生成ユーティリティ
 */
export function createTacticalCapturePayload(
  dataUrl: string,
  meta?: { sourceUrl?: string; title?: string },
): TacticalCapturePayload {
  const id = `capture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    dataUrl,
    timestamp: Date.now(),
    sourceUrl:
      meta?.sourceUrl ||
      (typeof window !== 'undefined' ? window.location.href : undefined),
    title:
      meta?.title ||
      (typeof document !== 'undefined' ? document.title : undefined),
  };
}
