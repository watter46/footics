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
  updatePlayers: (
    slideId: string,
    updates: { id: string; patch: Partial<Player> }[],
  ) => void;
  removePlayer: (slideId: string, playerId: string) => void;
}

export const createSlidePlayerCrudSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlidePlayerCrudSlice
> = (set, get) => ({
  addPlayer: (player) => {
    const playerWithCustom: Player = {
      ...player,
      isCustom: player.isCustom ?? true,
    };
    return set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, s.activeSlideId, (sl) => ({
        ...sl,
        players: [...sl.players, playerWithCustom],
      })),
      isDirty: true,
    }));
  },

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
    player.isCustom = true;
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
    player.isCustom = true;

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

      const isPositionUpdate = 'x' in patch || 'y' in patch;
      const newX = patch.x ?? existingPlayer?.x;
      const newY = patch.y ?? existingPlayer?.y;

      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => {
          const updatedPlayers = sl.players.map((p) =>
            p.id === playerId ? { ...p, ...patch } : p,
          );
          if (!isPositionUpdate || newX === undefined || newY === undefined) {
            return { ...sl, players: updatedPlayers };
          }
          const updatedArrows = sl.arrows.map((a) => {
            const isSource = a.sourcePlayerId === playerId;
            const isTarget = a.targetPlayerId === playerId;
            if (!isSource && !isTarget) return a;

            const nextPoints = [...a.points];
            if (isSource && nextPoints[0]) {
              nextPoints[0] = { x: newX, y: newY };
            }
            if (isTarget && nextPoints.length > 1) {
              nextPoints[1] = { x: newX, y: newY };
            }
            return { ...a, points: nextPoints };
          });
          return {
            ...sl,
            players: updatedPlayers,
            arrows: updatedArrows,
          };
        }),
        isDirty: true,
      };
    }),

  updatePlayers: (slideId, updates) =>
    set((s) => {
      if (updates.length === 0) return s;
      const slide = getSlide(s.project, slideId);
      if (!slide) return s;

      const patchMap = new Map<string, Partial<Player>>();
      const movedPositions = new Map<string, { x: number; y: number }>();

      for (const u of updates) {
        const existingPlayer = slide.players.find((p) => p.id === u.id);
        if (existingPlayer?.locked && !('locked' in u.patch)) {
          continue;
        }
        patchMap.set(u.id, u.patch);
        if ('x' in u.patch || 'y' in u.patch) {
          const nextX = u.patch.x ?? existingPlayer?.x;
          const nextY = u.patch.y ?? existingPlayer?.y;
          if (nextX !== undefined && nextY !== undefined) {
            movedPositions.set(u.id, { x: nextX, y: nextY });
          }
        }
      }
      if (patchMap.size === 0) return s;

      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => {
          const updatedPlayers = sl.players.map((p) => {
            const patch = patchMap.get(p.id);
            return patch ? { ...p, ...patch } : p;
          });

          if (movedPositions.size === 0) {
            return { ...sl, players: updatedPlayers };
          }

          const updatedArrows = sl.arrows.map((a) => {
            const sourcePos = a.sourcePlayerId
              ? movedPositions.get(a.sourcePlayerId)
              : undefined;
            const targetPos = a.targetPlayerId
              ? movedPositions.get(a.targetPlayerId)
              : undefined;
            if (!sourcePos && !targetPos) return a;

            const nextPoints = [...a.points];
            if (sourcePos && nextPoints[0]) {
              nextPoints[0] = { x: sourcePos.x, y: sourcePos.y };
            }
            if (targetPos && nextPoints.length > 1) {
              nextPoints[1] = { x: targetPos.x, y: targetPos.y };
            }
            return { ...a, points: nextPoints };
          });

          return {
            ...sl,
            players: updatedPlayers,
            arrows: updatedArrows,
          };
        }),
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
