import { create } from 'zustand';
import type { EasingType } from '@/lib/tactical/easing';
import { generateInitialMapping } from '@/lib/tactical/initial-mapping';
import type { PlayerTrajectory } from '@/lib/tactical/trajectory';
import type { Match } from '@/types';

export type { EasingType, PlayerTrajectory };

export interface MarkerOptions {
  insideContent: 'number' | 'none' | 'photo';
  photoUrl?: string;
  bottomLabel: 'name' | 'number' | 'none';
  color: string;
}

export interface AnimationPlayerState {
  playerId: string;
  name: string;
  shirtNo: string;
  x: number;
  y: number;
  team: 'home' | 'away';
  area: 'pitch' | 'bench';
  options: MarkerOptions;
  trajectory?: PlayerTrajectory;
}

export interface TacticalScene {
  id: string;
  durationMs: number;
  pauseMs: number;
  easing?: EasingType;
  players: Record<string, AnimationPlayerState>;
  ballPos: { x: number; y: number };
}

export type AnimationOrientation = 'vertical' | 'horizontal';

interface TacticalAnimationState {
  orientation: AnimationOrientation;
  scenes: TacticalScene[];
  activeSceneIndex: number;
  isPlaying: boolean;
  isExporting: boolean;
  isFlipped: boolean;
  selectedPlayerId: string | null;
  benchTeam: 'home' | 'away';
  isBenchOpen: boolean;
  defaultEasing: EasingType;
  defaultHomeOptions: MarkerOptions;
  defaultAwayOptions: MarkerOptions;

  // Actions
  setOrientation: (orientation: AnimationOrientation) => void;
  setSelectedPlayerId: (id: string | null) => void;
  setBenchTeam: (team: 'home' | 'away') => void;
  setIsBenchOpen: (isOpen: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsExporting: (exporting: boolean) => void;
  setIsFlipped: (flipped: boolean) => void;
  setActiveSceneIndex: (index: number) => void;
  setDefaultEasing: (easing: EasingType) => void;

  addScene: () => void;
  duplicateScene: (index: number) => void;
  removeScene: (index: number) => void;
  updateScene: (index: number, updates: Partial<TacticalScene>) => void;
  batchUpdateScenes: (
    updates: Partial<Pick<TacticalScene, 'durationMs' | 'pauseMs' | 'easing'>>,
  ) => void;

  updatePlayerOptions: (
    playerId: string,
    options: Partial<MarkerOptions>,
    applyToAllScenes?: boolean,
  ) => void;
  updatePlayerTrajectory: (
    playerId: string,
    trajectory: Partial<PlayerTrajectory>,
    applyToAllScenes?: boolean,
  ) => void;
  updateTeamOptions: (
    team: 'home' | 'away',
    options: Partial<MarkerOptions>,
    applyToAllExisting?: boolean,
  ) => void;
  updatePlayerPosition: (
    sceneIndex: number,
    playerId: string,
    x: number,
    y: number,
    area?: 'pitch' | 'bench',
  ) => void;
  movePlayerArea: (
    sceneIndex: number,
    playerId: string,
    area: 'pitch' | 'bench',
    targetPos?: { x: number; y: number },
  ) => void;
  updateBallPosition: (sceneIndex: number, x: number, y: number) => void;

  importFromMatch: (match: Match) => void;
  resetScenes: () => void;
}

const DEFAULT_HOME_COLOR = '#3b82f6';
const DEFAULT_AWAY_COLOR = '#ef4444';

const createDefaultScene = (
  easing: EasingType = 'easeInOut',
): TacticalScene => ({
  id: crypto.randomUUID(),
  durationMs: 1500,
  pauseMs: 500,
  easing,
  players: {},
  ballPos: { x: 50, y: 50 },
});

export const useTacticalAnimationStore = create<TacticalAnimationState>(
  (set, _get) => ({
    orientation: 'vertical',
    scenes: [createDefaultScene('easeInOut')],
    activeSceneIndex: 0,
    isPlaying: false,
    isExporting: false,
    isFlipped: false,
    selectedPlayerId: null,
    benchTeam: 'home',
    isBenchOpen: false,
    defaultEasing: 'easeInOut',
    defaultHomeOptions: {
      insideContent: 'number',
      bottomLabel: 'name',
      color: DEFAULT_HOME_COLOR,
    },
    defaultAwayOptions: {
      insideContent: 'number',
      bottomLabel: 'name',
      color: DEFAULT_AWAY_COLOR,
    },

    setOrientation: (orientation) => set({ orientation }),
    setSelectedPlayerId: (id) => set({ selectedPlayerId: id }),
    setBenchTeam: (team) => set({ benchTeam: team }),
    setIsBenchOpen: (isOpen) => set({ isBenchOpen: isOpen }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setIsExporting: (exporting) => set({ isExporting: exporting }),
    setIsFlipped: (flipped) => set({ isFlipped: flipped }),
    setActiveSceneIndex: (index) => set({ activeSceneIndex: index }),
    setDefaultEasing: (easing) => set({ defaultEasing: easing }),

    addScene: () =>
      set((state) => {
        const lastScene = state.scenes[state.scenes.length - 1];
        const newScene: TacticalScene = {
          id: crypto.randomUUID(),
          durationMs: 1500,
          pauseMs: 500,
          easing: lastScene?.easing || state.defaultEasing,
          players: JSON.parse(JSON.stringify(lastScene.players)), // deep copy
          ballPos: { ...lastScene.ballPos },
        };
        return {
          scenes: [...state.scenes, newScene],
          activeSceneIndex: state.scenes.length,
        };
      }),

    duplicateScene: (index: number) =>
      set((state) => {
        const targetScene = state.scenes[index];
        if (!targetScene) return state;
        const newScene: TacticalScene = {
          id: crypto.randomUUID(),
          durationMs: targetScene.durationMs,
          pauseMs: targetScene.pauseMs,
          easing: targetScene.easing || state.defaultEasing,
          players: JSON.parse(JSON.stringify(targetScene.players)),
          ballPos: { ...targetScene.ballPos },
        };
        const newScenes = [...state.scenes];
        newScenes.splice(index + 1, 0, newScene);
        return {
          scenes: newScenes,
          activeSceneIndex: index + 1,
        };
      }),

    removeScene: (index: number) =>
      set((state) => {
        if (state.scenes.length <= 1) return state;
        const newScenes = [...state.scenes];
        newScenes.splice(index, 1);
        return {
          scenes: newScenes,
          activeSceneIndex: Math.min(
            state.activeSceneIndex,
            newScenes.length - 1,
          ),
        };
      }),

    updateScene: (index, updates) =>
      set((state) => {
        const newScenes = [...state.scenes];
        newScenes[index] = { ...newScenes[index], ...updates };
        return { scenes: newScenes };
      }),

    batchUpdateScenes: (updates) =>
      set((state) => {
        const newScenes = state.scenes.map((scene) => ({
          ...scene,
          ...updates,
        }));
        return { scenes: newScenes };
      }),

    updatePlayerOptions: (playerId, options, applyToAllScenes = true) =>
      set((state) => {
        const newScenes = [...state.scenes];
        if (applyToAllScenes) {
          newScenes.forEach((scene) => {
            if (scene.players[playerId]) {
              scene.players[playerId].options = {
                ...scene.players[playerId].options,
                ...options,
              };
            }
          });
        } else {
          const scene = newScenes[state.activeSceneIndex];
          if (scene?.players[playerId]) {
            scene.players[playerId].options = {
              ...scene.players[playerId].options,
              ...options,
            };
          }
        }
        return { scenes: newScenes };
      }),

    updatePlayerTrajectory: (playerId, trajectory, applyToAllScenes = false) =>
      set((state) => {
        const newScenes = [...state.scenes];
        if (applyToAllScenes) {
          newScenes.forEach((scene) => {
            if (scene.players[playerId]) {
              const prev = scene.players[playerId].trajectory || {
                type: 'straight',
                curveOffset: 0,
              };
              scene.players[playerId].trajectory = { ...prev, ...trajectory };
            }
          });
        } else {
          const scene = newScenes[state.activeSceneIndex];
          if (scene?.players[playerId]) {
            const prev = scene.players[playerId].trajectory || {
              type: 'straight',
              curveOffset: 0,
            };
            scene.players[playerId].trajectory = { ...prev, ...trajectory };
          }
        }
        return { scenes: newScenes };
      }),

    updateTeamOptions: (team, options, applyToAllExisting = true) =>
      set((state) => {
        const isHome = team === 'home';
        const newDefaultHome = isHome
          ? { ...state.defaultHomeOptions, ...options }
          : state.defaultHomeOptions;
        const newDefaultAway = !isHome
          ? { ...state.defaultAwayOptions, ...options }
          : state.defaultAwayOptions;

        const newScenes = [...state.scenes];
        if (applyToAllExisting) {
          newScenes.forEach((scene) => {
            Object.values(scene.players).forEach((p) => {
              if (p.team === team) {
                p.options = { ...p.options, ...options };
              }
            });
          });
        }

        return {
          defaultHomeOptions: newDefaultHome,
          defaultAwayOptions: newDefaultAway,
          scenes: newScenes,
        };
      }),

    updatePlayerPosition: (sceneIndex, playerId, x, y, area) =>
      set((state) => {
        const newScenes = [...state.scenes];
        const p = newScenes[sceneIndex]?.players[playerId];
        if (p) {
          p.x = x;
          p.y = y;
          if (area) p.area = area;
        }
        return { scenes: newScenes };
      }),

    movePlayerArea: (sceneIndex, playerId, area, targetPos) =>
      set((state) => {
        const newScenes = [...state.scenes];
        const p = newScenes[sceneIndex]?.players[playerId];
        if (p) {
          p.area = area;
          if (targetPos) {
            p.x = targetPos.x;
            p.y = targetPos.y;
          } else if (area === 'pitch') {
            p.x = 50;
            p.y = 50;
          }
        }
        return { scenes: newScenes };
      }),

    updateBallPosition: (sceneIndex, x, y) =>
      set((state) => {
        const newScenes = [...state.scenes];
        if (newScenes[sceneIndex]) {
          newScenes[sceneIndex].ballPos = { x, y };
        }
        return { scenes: newScenes };
      }),

    resetScenes: () =>
      set((state) => ({
        scenes: [createDefaultScene(state.defaultEasing)],
        activeSceneIndex: 0,
        selectedPlayerId: null,
      })),

    importFromMatch: (match) =>
      set((state) => {
        const mapping = generateInitialMapping(match, state.orientation);

        const newPlayers: Record<string, AnimationPlayerState> = {};

        const getPlayerName = (id: number, team: 'home' | 'away'): string => {
          if (match.playerIdNameDictionary?.[id]) {
            return match.playerIdNameDictionary[id];
          }
          const t = match.teams[team];
          if (t?.players) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = t.players.find((pl: any) => pl.playerId === id);
            if (p) return p.name;
          }
          return `Player ${id}`;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.values(mapping).forEach((p: any) => {
          const pIdStr = p.playerId.toString();
          const opts =
            p.team === 'home'
              ? state.defaultHomeOptions
              : state.defaultAwayOptions;
          newPlayers[pIdStr] = {
            playerId: pIdStr,
            name: getPlayerName(p.playerId, p.team),
            shirtNo: p.shirtNo ? String(p.shirtNo) : '',
            x: p.x,
            y: p.y,
            team: p.team,
            area: p.area,
            options: { ...opts },
            trajectory: { type: 'straight', curveOffset: 0 },
          };
        });

        const newScene: TacticalScene = {
          id: crypto.randomUUID(),
          durationMs: 1500,
          pauseMs: 500,
          easing: state.defaultEasing,
          players: newPlayers,
          ballPos: { x: 50, y: 50 },
        };

        return {
          scenes: [newScene],
          activeSceneIndex: 0,
          selectedPlayerId: null,
        };
      }),
  }),
);
