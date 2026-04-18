import { create } from 'zustand';

type BooleanSetter = boolean | ((prev: boolean) => boolean);

interface UIState {
  isMatchMemoOpen: boolean;
  isTacticalBoardOpen: boolean;
  isCentralFocusOpen: boolean;
  highlightEventId: string | null;

  // Actions
  setMatchMemoOpen: (open: BooleanSetter) => void;
  setTacticalBoardOpen: (open: BooleanSetter) => void;
  setCentralFocusOpen: (open: BooleanSetter) => void;
  setHighlightEventId: (id: string | null) => void;

  // Helpers
  toggleMatchMemo: () => void;
  toggleTacticalBoard: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMatchMemoOpen: false,
  isTacticalBoardOpen: false,
  isCentralFocusOpen: false,
  highlightEventId: null,

  setMatchMemoOpen: (open) =>
    set((state) => ({
      isMatchMemoOpen:
        typeof open === 'function' ? open(state.isMatchMemoOpen) : open,
    })),

  setTacticalBoardOpen: (open) =>
    set((state) => ({
      isTacticalBoardOpen:
        typeof open === 'function' ? open(state.isTacticalBoardOpen) : open,
    })),

  setCentralFocusOpen: (open) =>
    set((state) => ({
      isCentralFocusOpen:
        typeof open === 'function' ? open(state.isCentralFocusOpen) : open,
    })),

  setHighlightEventId: (id) => set({ highlightEventId: id }),

  toggleMatchMemo: () =>
    set((state) => ({ isMatchMemoOpen: !state.isMatchMemoOpen })),
  toggleTacticalBoard: () =>
    set((state) => ({ isTacticalBoardOpen: !state.isTacticalBoardOpen })),
}));
