import { create } from 'zustand';

type BooleanSetter = boolean | ((prev: boolean) => boolean);

interface UIState {
  isTacticalBoardOpen: boolean;
  highlightEventId: string | null;

  // Actions
  setTacticalBoardOpen: (open: BooleanSetter) => void;
  setHighlightEventId: (id: string | null) => void;

  // Helpers
  toggleTacticalBoard: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isTacticalBoardOpen: false,
  highlightEventId: null,

  setTacticalBoardOpen: (open) =>
    set((state) => ({
      isTacticalBoardOpen:
        typeof open === 'function' ? open(state.isTacticalBoardOpen) : open,
    })),

  setHighlightEventId: (id) => set({ highlightEventId: id }),

  toggleTacticalBoard: () =>
    set((state) => ({ isTacticalBoardOpen: !state.isTacticalBoardOpen })),
}));
