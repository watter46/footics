import { create } from 'zustand';

export interface PilotState {
  showGrid: boolean;
  toggleGrid: () => void;
  setShowGrid: (show: boolean) => void;
  reset: () => void;
}

export const usePilotStore = create<PilotState>()((set, _get, store) => ({
  showGrid: false,

  toggleGrid: () =>
    set((state) => ({
      showGrid: !state.showGrid,
    })),

  setShowGrid: (show: boolean) =>
    set({
      showGrid: show,
    }),

  reset: () => set(store.getInitialState()),
}));

// Atomic selector hooks for convenience and render optimization
export const useShowGrid = () => usePilotStore((state) => state.showGrid);
export const useToggleGrid = () => usePilotStore((state) => state.toggleGrid);
