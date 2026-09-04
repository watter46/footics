import type { StateCreator } from 'zustand';
import { computeSlideAfterPlayerMoveByDelta } from './slide-player-move-helper';
import { computeSlideAfterPlayerSwap } from './slide-player-swap-helper';
import { recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlidePlayerMoveSlice {
  movePlayer: (slideId: string, playerId: string, x: number, y: number) => void;
  moveMultiplePlayersByDelta: (
    slideId: string,
    playerIds: string[],
    deltaX: number,
    deltaY: number,
  ) => void;
  movePlayerToBench: (slideId: string, playerId: string) => void;
  clearPitchPlayers: (slideId?: string) => void;
  movePlayerToPitch: (
    slideId: string,
    playerId: string,
    x?: number,
    y?: number,
  ) => void;
  swapPlayers: (slideId: string, playerAId: string, playerBId: string) => void;
}

export const createSlidePlayerMoveSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlidePlayerMoveSlice
> = (set, get) => ({
  movePlayer: (slideId, playerId, x, y) => {
    const slide = get().project.slides.find((sl) => sl.id === slideId);
    const p = slide?.players.find((pl) => pl.id === playerId);
    if (!p || p.locked) return;
    const dx = x - p.x;
    const dy = y - p.y;
    get().moveMultiplePlayersByDelta(slideId, [playerId], dx, dy);
  },

  moveMultiplePlayersByDelta: (slideId, playerIds, deltaX, deltaY) =>
    set((s) => {
      if (playerIds.length === 0 || (deltaX === 0 && deltaY === 0)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) =>
          computeSlideAfterPlayerMoveByDelta(sl, playerIds, deltaX, deltaY),
        ),
        isDirty: true,
      };
    }),

  movePlayerToBench: (slideId, playerId) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        players: sl.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                area: 'bench' as const,
                visionCone: undefined,
                badges: [],
                connectLines: [],
                focus: undefined,
              }
            : {
                ...p,
                connectLines: p.connectLines.filter(
                  (cl) => cl.toPlayerId !== playerId,
                ),
              },
        ),
        arrows: sl.arrows.filter(
          (a) => a.sourcePlayerId !== playerId && a.targetPlayerId !== playerId,
        ),
      })),
      isDirty: true,
      selectedObjects: s.selectedObjects.filter((o) => o.id !== playerId),
    })),

  clearPitchPlayers: (slideId) =>
    set((s) => {
      const targetId = slideId ?? s.activeSlideId;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, targetId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.area === 'pitch'
              ? {
                  ...p,
                  area: 'bench' as const,
                  visionCone: undefined,
                  badges: [],
                  connectLines: [],
                  focus: undefined,
                }
              : p,
          ),
          arrows: [],
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => {
          const slide = s.project.slides.find((sl) => sl.id === targetId);
          const pl = slide?.players.find((p) => p.id === o.id);
          return pl ? pl.area !== 'pitch' : true;
        }),
      };
    }),

  movePlayerToPitch: (slideId, playerId, x = 50, y = 50) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        players: sl.players.map((p) =>
          p.id === playerId ? { ...p, area: 'pitch', x, y } : p,
        ),
      })),
      isDirty: true,
    })),

  swapPlayers: (slideId, playerAId, playerBId) =>
    set((s) => {
      const slide = s.project.slides.find((sl) => sl.id === slideId);
      if (!slide) return s;
      const res = computeSlideAfterPlayerSwap(slide, playerAId, playerBId);
      if (!res) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, () => res.slide),
        isDirty: true,
        selectedObjects: res.benchedId
          ? s.selectedObjects.filter((o) => o.id !== res.benchedId)
          : s.selectedObjects,
      };
    }),
});
