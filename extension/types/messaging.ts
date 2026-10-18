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

    /** ミニモード/フルモードのトグル（Background -> Content Script） */
    TOGGLE_MINI_MODE: Record<string, never>;

    /** サイドパネルを閉じるリクエスト（Escキー等） */
    CLOSE_SIDEPANEL: Record<string, never>;

    /** Dashboard を開く、または既存タブにフォーカスする */
    OPEN_DASHBOARD: ProtocolWithReturn<
      Record<string, never>,
      { success: boolean }
    >;

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

    /** キャプチャ保存＆Quick Canvasタブオープン要求 */
    SAVE_AND_OPEN_CANVAS: ProtocolWithReturn<
      {
        imageDataUrl: string;
        videoUrl?: string;
        videoTitle?: string;
        videoTime?: number;
      },
      { success: boolean; id?: string; tabId?: number; error?: string }
    >;

    /** 動画URL別のスクリーンショット一覧取得（将来連携API） */
    GET_SCREENSHOTS_BY_VIDEO: ProtocolWithReturn<
      { videoUrl: string },
      {
        success: boolean;
        screenshots: import('../features/capture/db/screenshot-db').CapturedScreenshot[];
        error?: string;
      }
    >;

    /** 単体スクリーンショット取得（将来連携API） */
    GET_SCREENSHOT_DATA: ProtocolWithReturn<
      { id: string },
      {
        success: boolean;
        screenshot?: import('../features/capture/db/screenshot-db').CapturedScreenshot;
        error?: string;
      }
    >;

    /** スクリーンショット削除（将来連携API） */
    DELETE_SCREENSHOT: ProtocolWithReturn<
      { id: string },
      { success: boolean; error?: string }
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
