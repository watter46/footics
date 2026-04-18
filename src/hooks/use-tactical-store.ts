import { create } from 'zustand';

export interface PlayerState {
  playerId: number;
  x: number;
  y: number;
  team: 'home' | 'away';
  area: 'pitch' | 'bench';
}

interface TacticalState {
  isFlipped: boolean;
  benchTeam: 'home' | 'away';
  savedSettings: Record<number, PlayerState>;
  ballPos: { x: number; y: number };
  homeColor: string;
  awayColor: string;
  activeId: string | null;

  // Actions
  setIsFlipped: (flipped: boolean) => void;
  setBenchTeam: (team: 'home' | 'away') => void;
  setSavedSettings: (settings: Record<number, PlayerState>) => void;
  updatePlayer: (playerId: number, data: Partial<PlayerState>) => void;
  setBallPos: (pos: { x: number; y: number }) => void;
  setHomeColor: (color: string) => void;
  setAwayColor: (color: string) => void;
  setActiveId: (id: string | null) => void;

  // Reset/Heleprs
  toggleFlipped: () => void;
  resetTactical: () => void;
}

export const useTacticalStore = create<TacticalState>((set) => ({
  isFlipped: false,
  benchTeam: 'home',
  savedSettings: {},
  ballPos: { x: 50, y: 50 },
  homeColor: '#3b82f6',
  awayColor: '#ef4444',
  activeId: null,

  setIsFlipped: (flipped) => set({ isFlipped: flipped }),
  setBenchTeam: (team) => set({ benchTeam: team }),
  setSavedSettings: (settings) => set({ savedSettings: settings }),
  updatePlayer: (playerId, data) =>
    set((state) => ({
      savedSettings: {
        ...state.savedSettings,
        [playerId]: { ...state.savedSettings[playerId], ...data },
      },
    })),
  setBallPos: (pos) => set({ ballPos: pos }),
  setHomeColor: (color) => set({ homeColor: color }),
  setAwayColor: (color) => set({ awayColor: color }),
  setActiveId: (id) => set({ activeId: id }),

  toggleFlipped: () => set((state) => ({ isFlipped: !state.isFlipped })),
  resetTactical: () =>
    set({
      isFlipped: false,
      ballPos: { x: 50, y: 50 },
      // note: savedSettings reset logic is more complex and depends on metadata
    }),
}));
