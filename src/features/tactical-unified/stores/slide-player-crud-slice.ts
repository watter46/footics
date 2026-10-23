import type { StateCreator } from 'zustand';
import type { Player } from '@/lib/types/tactical-unified';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { getSlide, recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlidePlayerCrudSlice {
  addPlayer: (player: Player) => void;
  addPlayerFromPalette: (
    team: 'home' | 'away' | 'neutral',
    x: number,
    y: number,
    markerType?: 'circle' | 'ring',
  ) => string;
  addCustomPlayer: (
    slideId: string,
    team: 'home' | 'away' | 'neutral',
    name?: string,
    shirtNo?: string,
    position?: string,
    area?: 'pitch' | 'bench',
  ) => string;
  updatePlayer: (
    slideId: string,
    playerId: string,
    patch: Partial<Player>,
  ) => void;
  removePlayer: (slideId: string, playerId: string) => void;
}

export const createSlidePlayerCrudSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlidePlayerCrudSlice
> = (set, get) => ({
  addPlayer: (player) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, s.activeSlideId, (sl) => ({
        ...sl,
        players: [...sl.players, player],
      })),
      isDirty: true,
    })),

  addPlayerFromPalette: (team, x, y, markerType = 'circle') => {
    const p = get().project;
    const color =
      team === 'home'
        ? p.homeColor.primary
        : team === 'away'
          ? p.awayColor.primary
          : '#6b7280';
    const player = createDefaultPlayer(team, x, y, color);
    player.style = { ...player.style, markerType };
    if (markerType === 'ring') {
      player.style.sizeScale = 1.5;
    }
    get().addPlayer(player);
    return player.id;
  },

  addCustomPlayer: (slideId, team, name, shirtNo, position, area = 'bench') => {
    const p = get().project;
    const color =
      team === 'home'
        ? p.homeColor.primary
        : team === 'away'
          ? p.awayColor.primary
          : '#6b7280';
    const player = createDefaultPlayer(team, 50, 50, color);
    if (name) player.name = name;
    if (shirtNo) player.shirtNo = shirtNo;
    if (position) player.position = position;
    player.area = area;

    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        players: [...sl.players, player],
      })),
      isDirty: true,
    }));
    return player.id;
  },

  updatePlayer: (slideId, playerId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingPlayer = slide?.players.find((p) => p.id === playerId);
      if (existingPlayer?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, ...patch } : p,
          ),
        })),
        isDirty: true,
      };
    }),

  removePlayer: (slideId, playerId) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const targetPlayer = slide?.players.find((p) => p.id === playerId);
      if (targetPlayer?.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players
            .filter((p) => p.id !== playerId)
            .map((p) => ({
              ...p,
              connectLines: p.connectLines.filter(
                (cl) => cl.toPlayerId !== playerId,
              ),
            })),
          arrows: sl.arrows.filter(
            (a) =>
              a.sourcePlayerId !== playerId && a.targetPlayerId !== playerId,
          ),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== playerId),
      };
    }),
});
