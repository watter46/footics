import { create } from 'zustand';

interface SidepanelState {
  text: string;

  // Actions
  setText: (text: string) => void;
  reset: () => void;
}

export const useSidepanelStore = create<SidepanelState>((set) => ({
  text: '',

  setText: (text) => set({ text }),
  reset: () => set({ text: '' }),
}));
