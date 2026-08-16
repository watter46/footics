import { create } from 'zustand';

type BooleanSetter = boolean | ((prev: boolean) => boolean);

interface UIState {
  isTacticalBoardOpen: boolean;
  isTacticalAnimationOpen: boolean;
  highlightEventId: string | null;

  // Actions
  setTacticalBoardOpen: (open: BooleanSetter) => void;
  setTacticalAnimationOpen: (open: BooleanSetter) => void;
  setHighlightEventId: (id: string | null) => void;

  // Helpers
  toggleTacticalBoard: () => void;
  toggleTacticalAnimation: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isTacticalBoardOpen: false,
  isTacticalAnimationOpen: false,
  highlightEventId: null,

  setTacticalBoardOpen: (open) =>
    set((state) => ({
      isTacticalBoardOpen:
        typeof open === 'function' ? open(state.isTacticalBoardOpen) : open,
    })),

  setTacticalAnimationOpen: (open) =>
    set((state) => ({
      isTacticalAnimationOpen:
        typeof open === 'function' ? open(state.isTacticalAnimationOpen) : open,
    })),

  setHighlightEventId: (id) => set({ highlightEventId: id }),

  toggleTacticalBoard: () =>
    set((state) => ({ isTacticalBoardOpen: !state.isTacticalBoardOpen })),

  toggleTacticalAnimation: () =>
    set((state) => ({
      isTacticalAnimationOpen: !state.isTacticalAnimationOpen,
    })),
}));
