import { create } from 'zustand';

export interface PlayerState {
  playerId: number;
  shirtNo?: string;
  x: number;
  y: number;
  team: 'home' | 'away';
  area: 'pitch' | 'bench';
}

export type BoardOrientation = 'horizontal' | 'vertical';

interface TacticalState {
  orientation: BoardOrientation;
  isFlipped: boolean;
  benchTeam: 'home' | 'away';
  savedSettings: Record<number, PlayerState>;
  ballPos: { x: number; y: number };
  homeColor: string;
  awayColor: string;
  activeId: string | null;

  // Actions
  setOrientation: (orientation: BoardOrientation) => void;
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
  orientation: 'horizontal',
  isFlipped: false,
  benchTeam: 'home',
  savedSettings: {},
  ballPos: { x: 50, y: 50 },
  homeColor: '#3b82f6',
  awayColor: '#ef4444',
  activeId: null,

  setOrientation: (newOrientation) =>
    set((state) => {
      if (state.orientation === newOrientation) return state;

      const fromHorizontalToVertical =
        state.orientation === 'horizontal' && newOrientation === 'vertical';

      const updatedSettings = { ...state.savedSettings };
      Object.entries(updatedSettings).forEach(([pIdStr, p]) => {
        if (p.area === 'pitch') {
          const pId = Number(pIdStr);
          if (fromHorizontalToVertical) {
            // 横 -> 縦: x_v = y_h, y_v = 100 - x_h
            updatedSettings[pId] = {
              ...p,
              x: Math.max(0, Math.min(100, p.y)),
              y: Math.max(0, Math.min(100, 100 - p.x)),
            };
          } else {
            // 縦 -> 横: x_h = 100 - y_v, y_h = x_v
            updatedSettings[pId] = {
              ...p,
              x: Math.max(0, Math.min(100, 100 - p.y)),
              y: Math.max(0, Math.min(100, p.x)),
            };
          }
        }
      });

      let updatedBallPos = { ...state.ballPos };
      if (fromHorizontalToVertical) {
        updatedBallPos = {
          x: Math.max(0, Math.min(100, state.ballPos.y)),
          y: Math.max(0, Math.min(100, 100 - state.ballPos.x)),
        };
      } else {
        updatedBallPos = {
          x: Math.max(0, Math.min(100, 100 - state.ballPos.y)),
          y: Math.max(0, Math.min(100, state.ballPos.x)),
        };
      }

      return {
        orientation: newOrientation,
        savedSettings: updatedSettings,
        ballPos: updatedBallPos,
      };
    }),

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
