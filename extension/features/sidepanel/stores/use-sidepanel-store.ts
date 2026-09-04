import { useEffect } from 'react';
import { create } from 'zustand';
import { OVERLAY_TRANSITION_DURATION, STORAGE_KEYS } from '../../../constants';
import { addToSaveQueue } from '../../storage-sync/save-queue';

export interface SidepanelToastState {
  message: string;
  visible: boolean;
}

export interface SidepanelState {
  text: string;
  matchId: string | undefined;
  isSaving: boolean;
  toast: SidepanelToastState;
  errorMessage: string | undefined;

  // Actions
  setText: (text: string) => void;
  setMatchId: (matchId: string | undefined) => void;
  setError: (error: string | undefined) => void;
  setToast: (message: string) => void;
  hideToast: () => void;
  reset: () => void;
  save: () => Promise<void>;
}

export const useSidepanelStore = create<SidepanelState>((set, get) => ({
  text: '',
  matchId: undefined,
  isSaving: false,
  errorMessage: undefined,
  toast: {
    message: '',
    visible: false,
  },

  setText: (text) => set({ text }),
  setMatchId: (matchId) => set({ matchId, errorMessage: undefined }),
  setError: (errorMessage) => set({ errorMessage }),
  setToast: (message) => {
    set({ toast: { message, visible: true } });
    setTimeout(() => {
      set((state) => ({
        toast: { ...state.toast, visible: false },
      }));
    }, OVERLAY_TRANSITION_DURATION);
  },
  hideToast: () =>
    set((state) => ({
      toast: { ...state.toast, visible: false },
    })),
  reset: () => set({ text: '', errorMessage: undefined }),
  save: async () => {
    const { text, matchId, isSaving, reset, setToast, setError } = get();
    if (isSaving) return;

    if (!matchId) {
      setError('保存先の試合情報が見つかりません。');
      return;
    }

    set({ isSaving: true, errorMessage: undefined });
    try {
      await addToSaveQueue({
        mode: 'MATCH',
        matchId,
        memo: text,
      });
      reset();
      setToast('Match Memo Saved');
    } catch (err) {
      console.error('[Sidepanel] Failed to save memo to queue:', err);
      setError('保存キューへの書き込みに失敗しました。');
    } finally {
      set({ isSaving: false });
    }
  },
}));

/**
 * useSidepanelStorageSync
 *
 * サイドパネル初期化時に storage.local から latest matchId を読み込み、
 * storage.onChanged で matchId の変更に追従するカスタムフック。
 */
export function useSidepanelStorageSync() {
  const setMatchId = useSidepanelStore((s) => s.setMatchId);

  useEffect(() => {
    // 1. 初回ロード時に storage.local から取得
    browser.storage.local
      .get(STORAGE_KEYS.LAST_ACTIVE_MATCH_ID)
      .then((stored) => {
        const id = stored[STORAGE_KEYS.LAST_ACTIVE_MATCH_ID];
        if (typeof id === 'string') {
          setMatchId(id);
        }
      })
      .catch((err) => {
        console.warn('[Sidepanel] Failed to read last active matchId:', err);
      });

    // 2. storage.onChanged で追従
    const handleStorageChange = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (STORAGE_KEYS.LAST_ACTIVE_MATCH_ID in changes) {
        const newId = changes[STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]?.newValue;
        setMatchId(typeof newId === 'string' ? newId : undefined);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [setMatchId]);
}
