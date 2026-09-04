import type { ProtocolWithReturn } from 'webext-bridge';
import type {
  MatchInfoResponse,
  MemoMode,
  RequestTabCaptureResponse,
  SendCaptureToTacticalResponse,
  TacticalCapturePayload,
} from './schemas';

/**
 * Footics Extension Messaging Protocol
 *
 * webext-bridge の ProtocolMap を拡張し、メッセージごとの
 * リクエスト/レスポンス型を定義します。
 */

export interface OpenOverlayPayload {
  mode: MemoMode;
  matchId?: string;
  error?: string;
  initialData?: {
    id?: string;
    period?: number;
    minute?: number;
    second?: number;
    labels?: string[];
    memo?: string;
  };
}

declare module 'webext-bridge' {
  export interface ProtocolMap {
    /** Footics本体タブから現在の試合情報を取得する */
    GET_ACTIVE_MATCH_INFO: ProtocolWithReturn<
      Record<string, never>,
      MatchInfoResponse
    >;

    /** オーバーレイを表示する */
    OPEN_OVERLAY: OpenOverlayPayload;

    /** サイドパネルを閉じるリクエスト（Escキー等） */
    CLOSE_SIDEPANEL: Record<string, never>;

    /** 本体アプリのデータ更新を要求（Main Worldへの通知） */
    REFRESH_APP: { matchId: string };

    /** 動画キャプチャトリガー（Background -> Content Script） */
    TRIGGER_CAPTURE: Record<string, never>;

    /** タブキャプチャ要求（Content Script -> Background） */
    REQUEST_TAB_CAPTURE: ProtocolWithReturn<
      Record<string, never>,
      RequestTabCaptureResponse
    >;

    /** キャプチャデータを Tactical 画面へ転送（Content Script -> Background） */
    SEND_CAPTURE_TO_TACTICAL: ProtocolWithReturn<
      { payload: TacticalCapturePayload },
      SendCaptureToTacticalResponse
    >;

    /** キャプチャデータ受信通知（Background -> Content Script） */
    TACTICAL_CAPTURE_RECEIVED: TacticalCapturePayload;

    /** オフラインキューのリプレイ同期を要求 */
    REPLAY_OFFLINE_QUEUE: ProtocolWithReturn<
      Record<string, never>,
      { replayedSaves: number; replayedCaptures: number }
    >;
  }
}

export type {
  ExtensionMessage,
  MatchInfoResponse,
  MemoMode,
  RequestTabCaptureResponse,
  SendCaptureToTacticalRequest,
  SendCaptureToTacticalResponse,
  TacticalCaptureEventPayload,
  TacticalCapturePayload,
} from './schemas';
