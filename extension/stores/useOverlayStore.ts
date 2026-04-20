import { create } from 'zustand';
import { OVERLAY_TRANSITION_DURATION } from '../constants';
import type { MemoMode } from '../types/schemas';

interface ToastState {
  message: string;
  visible: boolean;
}

interface OverlayState {
  isVisible: boolean;
  mode: MemoMode;
  matchId: string | undefined;
  initialError: string | undefined;
  toast: ToastState;

  // Actions
  open: (params: { mode: MemoMode; matchId?: string; error?: string }) => void;
  close: () => void;
  setToast: (message: string) => void;
  hideToast: () => void;
  updateMatchInfo: (matchId: string | undefined) => void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
  isVisible: false,
  mode: 'MATCH',
  matchId: undefined,
  initialError: undefined,
  toast: {
    message: '',
    visible: false,
  },

  open: ({ mode, matchId, error }) =>
    set({
      isVisible: true,
      mode,
      matchId,
      initialError: error,
    }),

  close: () => set({ isVisible: false }),

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
}));
