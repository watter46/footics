import { create } from 'zustand';

interface UIState {
  highlightEventId: string | null;

  // Actions
  setHighlightEventId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  highlightEventId: null,

  setHighlightEventId: (id) => set({ highlightEventId: id }),
}));
