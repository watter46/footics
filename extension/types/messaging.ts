import type { MemoMode } from '@/hooks/features/MemoOverlay/useMemoOverlay';

/**
 * Footics Extension Messaging Protocol
 */

export type ExtensionMessage =
  | {
      type: 'OPEN_OVERLAY';
      mode: MemoMode;
      matchId?: string;
      error?: string;
    }
  | {
      type: 'GET_ACTIVE_MATCH_INFO';
    }
  | {
      type: 'CLOSE_SIDEPANEL';
    }
  | {
      type: 'footics-action';
      detail: any;
    }
  | {
      type: 'SAVE_MEMO_RELAY';
      mode: MemoMode;
      matchId: string;
      memo: string;
      minute?: number;
      second?: number;
      labels?: string[];
    }
  | {
      type: 'SAVE_CUSTOM_EVENT';
      event: {
        id: string;
        match_id: string;
        minute: number;
        second: number;
        labels: string[];
        memo: string;
        created_at: number;
      };
    };

export interface SaveMemoResponse {
  success: boolean;
  error?: string;
}

export interface MatchInfoResponse {
  matchId?: string;
  memo?: string;
}
