import type { StateCreator } from 'zustand';
import type {
  ConnectLine,
  Player,
  PlayerBadge,
  PlayerFocus,
  PlayerTrajectory,
  VisionCone,
} from '@/lib/types/tactical-unified';
import { recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

function updatePlayer(
  s: TacticalUnifiedState,
  slideId: string,
  playerId: string,
  updater: (p: Player) => Player,
) {
  return {
    ...recordHistory(s),
    project: updateSlideInProject(s.project, slideId, (sl) => ({
      ...sl,
      players: sl.players.map((p) => (p.id === playerId ? updater(p) : p)),
    })),
    isDirty: true,
  };
}

export interface SlideAttachmentSlice {
  updatePlayerTrajectory: (
    slideId: string,
    playerId: string,
    trajectory: PlayerTrajectory | undefined,
  ) => void;
  setVisionCone: (
    slideId: string,
    playerId: string,
    cone: VisionCone | undefined,
  ) => void;
  addConnectLine: (
    slideId: string,
    playerId: string,
    line: ConnectLine,
  ) => void;
  updateConnectLine: (
    slideId: string,
    playerId: string,
    lineId: string,
    patch: Partial<ConnectLine>,
  ) => void;
  removeConnectLine: (
    slideId: string,
    playerId: string,
    lineId: string,
  ) => void;
  addPlayerBadge: (
    slideId: string,
    playerId: string,
    badge: PlayerBadge,
  ) => void;
  removePlayerBadge: (
    slideId: string,
    playerId: string,
    badgeId: string,
  ) => void;
  setPlayerFocus: (
    slideId: string,
    playerId: string,
    focus: PlayerFocus | undefined,
  ) => void;
}

export const createSlideAttachmentSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideAttachmentSlice
> = (set) => ({
  updatePlayerTrajectory: (slideId, playerId, trajectory) =>
    set((s) =>
      updatePlayer(s, slideId, playerId, (p) => ({ ...p, trajectory })),
    ),

  setVisionCone: (slideId, playerId, cone) =>
    set((s) =>
      updatePlayer(s, slideId, playerId, (p) => ({ ...p, visionCone: cone })),
    ),

  addConnectLine: (slideId, playerId, line) =>
    set((s) =>
      updatePlayer(s, slideId, playerId, (p) => ({
        ...p,
        connectLines: [...p.connectLines, line],
      })),
    ),

  updateConnectLine: (slideId, playerId, lineId, patch) =>
    set((s) =>
      updatePlayer(s, slideId, playerId, (p) => ({
        ...p,
        connectLines: p.connectLines.map((l) =>
          l.id === lineId ? { ...l, ...patch } : l,
        ),
      })),
    ),

  removeConnectLine: (slideId, playerId, lineId) =>
    set((s) =>
      updatePlayer(s, slideId, playerId, (p) => ({
        ...p,
        connectLines: p.connectLines.filter((l) => l.id !== lineId),
      })),
    ),

  addPlayerBadge: (slideId, playerId, badge) =>
    set((s) =>
      updatePlayer(s, slideId, playerId, (p) => ({
        ...p,
        badges: [...p.badges, badge],
      })),
    ),

  removePlayerBadge: (slideId, playerId, badgeId) =>
    set((s) =>
      updatePlayer(s, slideId, playerId, (p) => ({
        ...p,
        badges: p.badges.filter((b) => b.id !== badgeId),
      })),
    ),

  setPlayerFocus: (slideId, playerId, focus) =>
    set((s) => updatePlayer(s, slideId, playerId, (p) => ({ ...p, focus }))),
});
