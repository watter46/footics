import type { ProtocolWithReturn } from 'webext-bridge';
import type { CustomEvent } from '@/lib/schema';
import type { MatchInfoResponse, MemoMode, SaveMemoResponse } from './schemas';

/**
 * Footics Extension Messaging Protocol
 *
 * webext-bridge の ProtocolMap を拡張し、メッセージごとの
 * リクエスト/レスポンス型を定義します。
 */

// ペイロード用の型を抽出（スキーマから個別に抽出）
export interface SaveMemoRelayPayload {
  mode: MemoMode;
  matchId: string;
  memo: string;
  minute?: number;
  second?: number;
  labels?: string[];
}

export interface OpenOverlayPayload {
  mode: MemoMode;
  matchId?: string;
  error?: string;
}

declare module 'webext-bridge' {
  export interface ProtocolMap {
    /** Footics本体タブから現在の試合情報を取得する */
    GET_ACTIVE_MATCH_INFO: ProtocolWithReturn<
      Record<string, never>,
      MatchInfoResponse
    >;

    /** オーバーレイからのメモ保存リクエストを本体タブへ転送する */
    SAVE_MEMO_RELAY: ProtocolWithReturn<SaveMemoRelayPayload, SaveMemoResponse>;

    /** オーバーレイを表示する */
    OPEN_OVERLAY: OpenOverlayPayload;

    /** サイドパネルを閉じるリクエスト（Escキー等） */
    CLOSE_SIDEPANEL: Record<string, never>;

    /** カスタムイベントを直接保存する */
    SAVE_CUSTOM_EVENT: ProtocolWithReturn<
      { event: CustomEvent },
      SaveMemoResponse
    >;

    /** 本体アプリのデータ更新を要求（Main Worldへの通知） */
    REFRESH_APP: { matchId: string };
  }
}

export type {
  ExtensionMessage,
  MatchInfoResponse,
  MemoMode,
  SaveMemoResponse,
} from './schemas';
