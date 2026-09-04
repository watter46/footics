import { create } from 'zustand';
import { OVERLAY_TRANSITION_DURATION, STORAGE_KEYS } from '../../../constants';
import type { MemoMode } from '../../../types/schemas';

export type OverlayDisplayMode = 'full' | 'mini';

interface ToastState {
  message: string;
  visible: boolean;
}

interface OverlayState {
  isVisible: boolean;
  displayMode: OverlayDisplayMode;
  mode: MemoMode;
  matchId: string | undefined;
  initialData?: {
    id?: string;
    period?: number;
    minute?: number;
    second?: number;
    labels?: string[];
    memo?: string;
  };
  initialError: string | undefined;
  toast: ToastState;
  autoPauseVideo: boolean;

  // Actions
  open: (params: {
    mode: MemoMode;
    matchId?: string;
    error?: string;
    initialData?: OverlayState['initialData'];
    displayMode?: OverlayDisplayMode;
  }) => void;
  close: () => void;
  setDisplayMode: (displayMode: OverlayDisplayMode) => void;
  toggleDisplayMode: () => void;
  setToast: (message: string) => void;
  hideToast: () => void;
  updateMatchInfo: (matchId: string | undefined) => void;
  setAutoPauseVideo: (autoPause: boolean) => void;
}

export const useOverlayStore = create<OverlayState>((set) => {
  // 初期設定を browser.storage.local から非同期で読み込み
  if (typeof browser !== 'undefined' && browser.storage?.local) {
    browser.storage.local
      .get(STORAGE_KEYS.AUTO_PAUSE_VIDEO)
      .then((result) => {
        const stored = result[STORAGE_KEYS.AUTO_PAUSE_VIDEO];
        if (typeof stored === 'boolean') {
          set({ autoPauseVideo: stored });
        }
      })
      .catch((err) => {
        console.warn(
          '[Footics Overlay] Failed to load autoPauseVideo preference:',
          err,
        );
      });
  }

  return {
    isVisible: false,
    displayMode: 'full',
    mode: 'MATCH',
    matchId: undefined,
    initialData: undefined,
    initialError: undefined,
    autoPauseVideo: true,
    toast: {
      message: '',
      visible: false,
    },

    open: ({ mode, matchId, error, initialData, displayMode }) =>
      set((state) => ({
        isVisible: true,
        mode,
        matchId,
        initialError: error,
        initialData,
        displayMode: displayMode ?? state.displayMode,
      })),

    close: () => set({ isVisible: false, initialData: undefined }),

    setDisplayMode: (displayMode) => set({ displayMode }),

    toggleDisplayMode: () =>
      set((state) => ({
        displayMode: state.displayMode === 'full' ? 'mini' : 'full',
      })),

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

    updateMatchInfo: (matchId) => set({ matchId }),

    setAutoPauseVideo: (autoPauseVideo: boolean) => {
      set({ autoPauseVideo });
      if (typeof browser !== 'undefined' && browser.storage?.local) {
        browser.storage.local
          .set({ [STORAGE_KEYS.AUTO_PAUSE_VIDEO]: autoPauseVideo })
          .catch((err) => {
            console.warn(
              '[Footics Overlay] Failed to save autoPauseVideo preference:',
              err,
            );
          });
      }
    },
  };
});
