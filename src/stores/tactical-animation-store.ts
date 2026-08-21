import { create } from 'zustand';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import {
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { getPlayersMasterBatch } from '@/lib/db/queries';
import type { PlayerMaster } from '@/lib/db/schema';
import type { EasingType } from '@/lib/tactical/easing';
import { generateInitialMapping } from '@/lib/tactical/initial-mapping';
import { sortPlayersBy2DPositionGroup } from '@/lib/tactical/player-formatting';
import type { PlayerTrajectory } from '@/lib/tactical/trajectory';
import type { Match } from '@/types';

export type { EasingType, PlayerTrajectory };

export interface MarkerOptions {
  insideContent: 'number' | 'none' | 'photo';
  photoUrl?: string;
  bottomLabel: 'name' | 'number' | 'none';
  color: string;
  sizeScale?: number; // 0.6 〜 1.8 (デフォルト: 1.0)
  strokeColor?: string; // 枠線の色 (例: '#ffffff', '#000000', etc., デフォルト: '#ffffff')
  strokeWidth?: number; // 枠線の太さ (0: なし, 1: 細, 2: 標準, 3.5: 太, デフォルト: 2)
  numberSizeScale?: number; // 内部背番号のサイズ倍率 (0.6 〜 1.8, デフォルト: 1.0)
  labelSizeScale?: number; // 下部ラベルのサイズ倍率 (0.6 〜 1.8, デフォルト: 1.0)
}

export interface AnimationPlayerState {
  playerId: string;
  name: string;
  shirtNo: string;
  position?: string;
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
  ballTrajectory?: PlayerTrajectory;
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
  selectedPlayerIds: string[];
  benchTeam: 'home' | 'away';
  isBenchOpen: boolean;
  teamVisibility: 'both' | 'home' | 'away';
  defaultEasing: EasingType;
  defaultHomeOptions: MarkerOptions;
  defaultAwayOptions: MarkerOptions;
  exportFps: 30 | 60;

  // Actions
  setOrientation: (orientation: AnimationOrientation) => void;
  setTeamVisibility: (visibility: 'both' | 'home' | 'away') => void;
  setExportFps: (fps: 30 | 60) => void;
  setSelectedPlayerId: (id: string | null) => void;
  setSelectedPlayerIds: (ids: string[]) => void;
  toggleSelectPlayerId: (id: string, multiSelect?: boolean) => void;
  selectAllPlayers: (team?: 'home' | 'away') => void;
  clearSelection: () => void;
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
  updateMultiplePlayersOptions: (
    playerIds: string[],
    options: Partial<MarkerOptions>,
    applyToAllScenes?: boolean,
  ) => void;
  updateAllPlayersOptions: (options: Partial<MarkerOptions>) => void;
  updatePlayerTrajectory: (
    playerId: string,
    trajectory: Partial<PlayerTrajectory>,
    applyToAllScenes?: boolean,
    targetSceneIndex?: number,
  ) => void;
  updateBallTrajectory: (
    trajectory: Partial<PlayerTrajectory>,
    applyToAllScenes?: boolean,
    targetSceneIndex?: number,
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

  moveMultiplePlayersByDelta: (

    sceneIndex: number,
    playerIds: string[],
    deltaX: number,
    deltaY: number,
  ) => void;
  movePlayerArea: (
    sceneIndex: number,
    playerId: string,
    area: 'pitch' | 'bench',
    targetPos?: { x: number; y: number },
  ) => void;
  applyFormation: (
    sceneIndex: number,
    team: 'home' | 'away',
    formationType: FormationType,
    formationMode?: FormationMode,
    applyToAllScenes?: boolean,
  ) => void;
  updateBallPosition: (sceneIndex: number, x: number, y: number) => void;

  importFromMatch: (match: Match) => void;
  importFromTacticalBoard: (
    savedSettings: Record<
      number,
      {
        playerId: number;
        shirtNo?: string;
        x: number;
        y: number;
        team: 'home' | 'away';
        area: 'pitch' | 'bench';
      }
    >,
    ballPos: { x: number; y: number },
    match: Match,
    isFlipped?: boolean,
    boardOrientation?: 'vertical' | 'horizontal',
  ) => void;
  lastImportedMatch?: any;
  applyPlayerMasters: (masters: Map<number, PlayerMaster>) => void;
  syncPlayerMasters: () => Promise<void>;
  resetScenes: () => void;
}

const DEFAULT_HOME_COLOR = '#034694'; // Chelsea Royal Blue
const DEFAULT_AWAY_COLOR = '#ef4444';

const INITIAL_HOME_OPTIONS: MarkerOptions = {
  insideContent: 'number',
  bottomLabel: 'name',
  color: DEFAULT_HOME_COLOR,
  sizeScale: 1.0,
  strokeColor: 'none',
  strokeWidth: 0,
  numberSizeScale: 1.0,
  labelSizeScale: 1.0,
};

const INITIAL_AWAY_OPTIONS: MarkerOptions = {
  insideContent: 'number',
  bottomLabel: 'name',
  color: DEFAULT_AWAY_COLOR,
  sizeScale: 1.0,
  strokeColor: 'none',
  strokeWidth: 0,
  numberSizeScale: 1.0,
  labelSizeScale: 1.0,
};

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
  (set, get) => ({
    orientation: 'vertical',
    scenes: [createDefaultScene('easeInOut')],
    activeSceneIndex: 0,
    isPlaying: false,
    isExporting: false,
    isFlipped: false,
    selectedPlayerId: null,
    selectedPlayerIds: [],
    benchTeam: 'home',
    isBenchOpen: false,
    teamVisibility: 'both',
    defaultEasing: 'easeInOut',
    defaultHomeOptions: { ...INITIAL_HOME_OPTIONS },
    defaultAwayOptions: { ...INITIAL_AWAY_OPTIONS },
    exportFps: 30,

    setOrientation: (newOrientation) =>
      set((state) => {
        if (state.orientation === newOrientation) return state;

        const fromHorizontalToVertical =
          state.orientation === 'horizontal' && newOrientation === 'vertical';

        const newScenes = state.scenes.map((scene) => {
          const updatedPlayers = { ...scene.players };
          Object.entries(updatedPlayers).forEach(([pId, p]) => {
            if (p.area === 'pitch') {
              if (fromHorizontalToVertical) {
                // 横 -> 縦: x_v = y_h, y_v = 100 - x_h
                updatedPlayers[pId] = {
                  ...p,
                  x: Math.max(0, Math.min(100, p.y)),
                  y: Math.max(0, Math.min(100, 100 - p.x)),
                };
              } else {
                // 縦 -> 横: x_h = 100 - y_v, y_h = x_v
                updatedPlayers[pId] = {
                  ...p,
                  x: Math.max(0, Math.min(100, 100 - p.y)),
                  y: Math.max(0, Math.min(100, p.x)),
                };
              }
            }
          });

          let newBallPos = { ...scene.ballPos };
          if (fromHorizontalToVertical) {
            newBallPos = {
              x: Math.max(0, Math.min(100, scene.ballPos.y)),
              y: Math.max(0, Math.min(100, 100 - scene.ballPos.x)),
            };
          } else {
            newBallPos = {
              x: Math.max(0, Math.min(100, 100 - scene.ballPos.y)),
              y: Math.max(0, Math.min(100, scene.ballPos.x)),
            };
          }

          return {
            ...scene,
            players: updatedPlayers,
            ballPos: newBallPos,
          };
        });

        return {
          orientation: newOrientation,
          isBenchOpen: false,
          scenes: newScenes,
        };
      }),
    setTeamVisibility: (visibility) => set({ teamVisibility: visibility }),
    setExportFps: (fps) => set({ exportFps: fps }),
    setSelectedPlayerId: (id) =>
      set({
        selectedPlayerId: id,
        selectedPlayerIds: id ? [id] : [],
      }),
    setSelectedPlayerIds: (ids) =>
      set({
        selectedPlayerIds: ids,
        selectedPlayerId: ids.length > 0 ? ids[0] : null,
      }),
    toggleSelectPlayerId: (id, multiSelect = false) =>
      set((state) => {
        if (!multiSelect) {
          return {
            selectedPlayerId: id,
            selectedPlayerIds: id ? [id] : [],
          };
        }
        const exists = state.selectedPlayerIds.includes(id);
        const newIds = exists
          ? state.selectedPlayerIds.filter((item) => item !== id)
          : [...state.selectedPlayerIds, id];
        return {
          selectedPlayerIds: newIds,
          selectedPlayerId: newIds.length > 0 ? newIds[0] : null,
        };
      }),
    selectAllPlayers: (team) =>
      set((state) => {
        const scene = state.scenes[state.activeSceneIndex];
        if (!scene) return state;
        const matchingPlayers = Object.values(scene.players).filter((p) =>
          team ? p.team === team && p.area === 'pitch' : p.area === 'pitch',
        );
        const ids = matchingPlayers.map((p) => p.playerId);
        return {
          selectedPlayerIds: ids,
          selectedPlayerId: ids[0] || null,
        };
      }),
    clearSelection: () =>
      set({
        selectedPlayerId: null,
        selectedPlayerIds: [],
      }),
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
        const clonedPlayers: Record<string, AnimationPlayerState> = {};
        if (lastScene) {
          for (const [id, p] of Object.entries(lastScene.players)) {
            clonedPlayers[id] = {
              ...p,
              options: { ...p.options },
              trajectory: { type: 'straight' },
            };
          }
        }
        const newScene: TacticalScene = {
          id: crypto.randomUUID(),
          durationMs: 1500,
          pauseMs: 500,
          easing: lastScene?.easing || state.defaultEasing,
          players: clonedPlayers,
          ballPos: lastScene?.ballPos ? { ...lastScene.ballPos } : { x: 50, y: 50 },
          ballTrajectory: { type: 'straight' },
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
        const clonedPlayers: Record<string, AnimationPlayerState> = {};
        for (const [id, p] of Object.entries(targetScene.players)) {
          clonedPlayers[id] = {
            ...p,
            options: { ...p.options },
            trajectory: { type: 'straight' },
          };
        }
        const newScene: TacticalScene = {
          id: crypto.randomUUID(),
          durationMs: targetScene.durationMs,
          pauseMs: targetScene.pauseMs,
          easing: targetScene.easing || state.defaultEasing,
          players: clonedPlayers,
          ballPos: { ...targetScene.ballPos },
          ballTrajectory: { type: 'straight' },
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
        const newScenes = state.scenes.map((scene, idx) => {
          if (!applyToAllScenes && idx !== state.activeSceneIndex) return scene;
          const p = scene.players[playerId];
          if (!p) return scene;
          return {
            ...scene,
            players: {
              ...scene.players,
              [playerId]: {
                ...p,
                options: {
                  ...p.options,
                  ...options,
                },
              },
            },
          };
        });
        return { scenes: newScenes };
      }),

    updateMultiplePlayersOptions: (
      playerIds,
      options,
      applyToAllScenes = true,
    ) =>
      set((state) => {
        const idsSet = new Set(playerIds);
        const newScenes = state.scenes.map((scene, idx) => {
          if (!applyToAllScenes && idx !== state.activeSceneIndex) return scene;
          let changed = false;
          const updatedPlayers = { ...scene.players };
          idsSet.forEach((id) => {
            const p = updatedPlayers[id];
            if (p) {
              changed = true;
              updatedPlayers[id] = {
                ...p,
                options: {
                  ...p.options,
                  ...options,
                },
              };
            }
          });
          return changed ? { ...scene, players: updatedPlayers } : scene;
        });
        return { scenes: newScenes };
      }),

    updateAllPlayersOptions: (options) =>
      set((state) => {
        const newScenes = state.scenes.map((scene) => {
          const updatedPlayers = { ...scene.players };
          Object.keys(updatedPlayers).forEach((pId) => {
            updatedPlayers[pId] = {
              ...updatedPlayers[pId],
              options: {
                ...updatedPlayers[pId].options,
                ...options,
              },
            };
          });
          return {
            ...scene,
            players: updatedPlayers,
          };
        });

        return {
          defaultHomeOptions: { ...state.defaultHomeOptions, ...options },
          defaultAwayOptions: { ...state.defaultAwayOptions, ...options },
          scenes: newScenes,
        };
      }),

    updatePlayerTrajectory: (
      playerId,
      trajectory,
      applyToAllScenes = false,
      targetSceneIndex,
    ) =>
      set((state) => {
        const targetIdx =
          targetSceneIndex !== undefined
            ? targetSceneIndex
            : state.activeSceneIndex;
        const newScenes = state.scenes.map((scene, idx) => {
          if (!applyToAllScenes && idx !== targetIdx) return scene;
          const p = scene.players[playerId];
          if (!p) return scene;
          const prev = p.trajectory || {
            type: 'straight',
          };
          return {
            ...scene,
            players: {
              ...scene.players,
              [playerId]: {
                ...p,
                trajectory: { ...prev, ...trajectory },
              },
            },
          };
        });
        return { scenes: newScenes };
      }),

    updateBallTrajectory: (
      trajectory,
      applyToAllScenes = false,
      targetSceneIndex,
    ) =>
      set((state) => {
        const targetIdx =
          targetSceneIndex !== undefined
            ? targetSceneIndex
            : state.activeSceneIndex;
        const newScenes = state.scenes.map((scene, idx) => {
          if (!applyToAllScenes && idx !== targetIdx) return scene;
          const prev = scene.ballTrajectory || {
            type: 'straight',
          };
          return {
            ...scene,
            ballTrajectory: { ...prev, ...trajectory },
          };
        });
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

        const newScenes = state.scenes.map((scene) => {
          if (!applyToAllExisting) return scene;
          let changed = false;
          const updatedPlayers = { ...scene.players };
          Object.values(updatedPlayers).forEach((p) => {
            if (p.team === team) {
              changed = true;
              updatedPlayers[p.playerId] = {
                ...p,
                options: { ...p.options, ...options },
              };
            }
          });
          return changed ? { ...scene, players: updatedPlayers } : scene;
        });

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

    moveMultiplePlayersByDelta: (sceneIndex, playerIds, deltaX, deltaY) =>
      set((state) => {
        const newScenes = [...state.scenes];
        const targetScene = newScenes[sceneIndex];
        if (!targetScene) return state;

        const newPlayers = { ...targetScene.players };
        playerIds.forEach((id) => {
          const p = newPlayers[id];
          if (p && p.area === 'pitch') {
            newPlayers[id] = {
              ...p,
              x: Math.max(0, Math.min(100, p.x + deltaX)),
              y: Math.max(0, Math.min(100, p.y + deltaY)),
            };
          }
        });

        newScenes[sceneIndex] = { ...targetScene, players: newPlayers };
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

    applyFormation: (
      sceneIndex,
      team,
      formationType,
      formationMode = 'half',
      applyToAllScenes = false,
    ) => {
      const positions = FORMATION_POSITIONS[formationType];
      if (!positions || positions.length === 0) return;

      set((state) => {
        const isVertical = state.orientation === 'vertical';

        const newScenes = state.scenes.map((scene, idx) => {
          if (!applyToAllScenes && idx !== sceneIndex) return scene;

          const newPlayers = { ...scene.players };
          const teamPlayers = Object.values(newPlayers).filter(
            (p) => p.team === team,
          );

          // ピッチ上の選手を優先し、不足分はベンチ選手を充当
          const currentPitch = teamPlayers.filter((p) => p.area === 'pitch');
          const currentBench = teamPlayers.filter((p) => p.area === 'bench');

          const sortedPitch = sortPlayersBy2DPositionGroup(currentPitch);
          const sortedBench = sortPlayersBy2DPositionGroup(currentBench);

          const orderedCandidates = [...sortedPitch, ...sortedBench];

          // 11ポジションに割り当て
          positions.slice(0, 11).forEach((formationPos, posIdx) => {
            const candidate = orderedCandidates[posIdx];
            if (!candidate) return;

            const actualCoord = isVertical
              ? getFormationActualPosVertical(formationPos, team, formationMode)
              : getFormationActualPos(formationPos, team, formationMode);

            newPlayers[candidate.playerId] = {
              ...newPlayers[candidate.playerId],
              x: actualCoord.x,
              y: actualCoord.y,
              area: 'pitch',
            };
          });

          // 11人を超える選手がピッチにいればベンチへ
          if (orderedCandidates.length > 11) {
            for (let i = 11; i < orderedCandidates.length; i++) {
              const surplus = orderedCandidates[i];
              if (surplus && surplus.area === 'pitch') {
                newPlayers[surplus.playerId] = {
                  ...newPlayers[surplus.playerId],
                  area: 'bench',
                };
              }
            }
          }

          return {
            ...scene,
            players: newPlayers,
          };
        });

        return { scenes: newScenes };
      });
    },

    updateBallPosition: (sceneIndex, x, y) =>
      set((state) => {
        const newScenes = [...state.scenes];
        if (newScenes[sceneIndex]) {
          newScenes[sceneIndex].ballPos = { x, y };
        }
        return { scenes: newScenes };
      }),

    resetScenes: () => {
      const match = get().lastImportedMatch;
      if (match) {
        set({
          defaultHomeOptions: { ...INITIAL_HOME_OPTIONS },
          defaultAwayOptions: { ...INITIAL_AWAY_OPTIONS },
          teamVisibility: 'both',
        });
        get().importFromMatch(match);
        return;
      }

      const currentScene0 = get().scenes[0];
      if (currentScene0 && Object.keys(currentScene0.players).length > 0) {
        set((state) => ({
          scenes: [
            {
              id: crypto.randomUUID(),
              durationMs: 1500,
              pauseMs: 500,
              easing: state.defaultEasing,
              players: JSON.parse(JSON.stringify(currentScene0.players)),
              ballPos: { x: 50, y: 50 },
            },
          ],
          activeSceneIndex: 0,
          selectedPlayerId: null,
          selectedPlayerIds: [],
          teamVisibility: 'both',
          defaultHomeOptions: { ...INITIAL_HOME_OPTIONS },
          defaultAwayOptions: { ...INITIAL_AWAY_OPTIONS },
        }));
        return;
      }

      set((state) => ({
        scenes: [createDefaultScene(state.defaultEasing)],
        activeSceneIndex: 0,
        selectedPlayerId: null,
        selectedPlayerIds: [],
        teamVisibility: 'both',
        defaultHomeOptions: { ...INITIAL_HOME_OPTIONS },
        defaultAwayOptions: { ...INITIAL_AWAY_OPTIONS },
      }));
    },

    importFromMatch: (match) => {
      const mapping = generateInitialMapping(match, get().orientation);

      const newPlayers: Record<string, AnimationPlayerState> = {};

      const getPlayerInfo = (
        id: number,
        team: 'home' | 'away',
      ): { name: string; position: string } => {
        const dictName = match.playerIdNameDictionary?.[id];
        const t = match.teams[team];
        if (t?.players) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = t.players.find((pl: any) => pl.playerId === id);
          if (p) {
            return {
              name: dictName || p.name || `Player ${id}`,
              position: p.position || '',
            };
          }
        }
        return { name: dictName || `Player ${id}`, position: '' };
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.values(mapping).forEach((p: any) => {
        const pIdStr = p.playerId.toString();
        const info = getPlayerInfo(Number(p.playerId), p.team);
        const opts =
          p.team === 'home'
            ? get().defaultHomeOptions
            : get().defaultAwayOptions;
        newPlayers[pIdStr] = {
          playerId: pIdStr,
          name: info.name,
          shirtNo: p.shirtNo ? String(p.shirtNo) : '',
          position: p.position || info.position,
          x: p.x,
          y: p.y,
          team: p.team,
          area: p.area,
          options: { ...opts },
          trajectory: { type: 'straight', curveOffset: 25 },
        };
      });

      const newScene: TacticalScene = {
        id: crypto.randomUUID(),
        durationMs: 1500,
        pauseMs: 500,
        easing: get().defaultEasing,
        players: newPlayers,
        ballPos: { x: 50, y: 50 },
      };

      set({
        scenes: [newScene],
        activeSceneIndex: 0,
        selectedPlayerId: null,
        selectedPlayerIds: [],
        lastImportedMatch: match,
      });

      // IndexedDB から選手マスター (顔写真等) を非同期取得して自動適用
      const playerIds = Object.values(newPlayers)
        .map((p) => Number(p.playerId))
        .filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0);

      if (playerIds.length > 0 && typeof window !== 'undefined') {
        getPlayersMasterBatch(playerIds)
          .then((masters) => {
            if (masters && masters.size > 0) {
              get().applyPlayerMasters(masters);
            }
          })
          .catch((err) => {
            console.warn(
              '[tactical-animation-store] Failed to auto-sync player masters:',
              err,
            );
          });
      }
    },

    importFromTacticalBoard: (
      savedSettings,
      ballPos,
      match,
      isFlipped = false,
      boardOrientation = 'horizontal',
    ) => {
      const animOrientation = get().orientation;
      const needHtoV =
        boardOrientation === 'horizontal' && animOrientation === 'vertical';
      const needVtoH =
        boardOrientation === 'vertical' && animOrientation === 'horizontal';

      const newPlayers: Record<string, AnimationPlayerState> = {};

      const getPlayerInfo = (
        id: number,
        team: 'home' | 'away',
      ): { name: string; position: string } => {
        const dictName = match.playerIdNameDictionary?.[id];
        const t = match.teams[team];
        if (t?.players) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = t.players.find((pl: any) => pl.playerId === id);
          if (p) {
            return {
              name: dictName || p.name || `Player ${id}`,
              position: p.position || '',
            };
          }
        }
        return { name: dictName || `Player ${id}`, position: '' };
      };

      Object.values(savedSettings).forEach((p) => {
        const pIdStr = p.playerId.toString();
        const info = getPlayerInfo(Number(p.playerId), p.team);
        const opts =
          p.team === 'home'
            ? get().defaultHomeOptions
            : get().defaultAwayOptions;

        let posX = p.x;
        let posY = p.y;

        if (p.area === 'pitch') {
          if (needHtoV) {
            posX = Math.max(0, Math.min(100, p.y));
            posY = Math.max(0, Math.min(100, 100 - p.x));
          } else if (needVtoH) {
            posX = Math.max(0, Math.min(100, 100 - p.y));
            posY = Math.max(0, Math.min(100, p.x));
          }
        }

        newPlayers[pIdStr] = {
          playerId: pIdStr,
          name: info.name,
          shirtNo: p.shirtNo ? String(p.shirtNo) : '',
          position: (p as any).position || info.position,
          x: posX,
          y: posY,
          team: p.team,
          area: p.area,
          options: { ...opts },
          trajectory: { type: 'straight', curveOffset: 25 },
        };
      });

      let bX = ballPos.x;
      let bY = ballPos.y;
      if (needHtoV) {
        bX = Math.max(0, Math.min(100, ballPos.y));
        bY = Math.max(0, Math.min(100, 100 - ballPos.x));
      } else if (needVtoH) {
        bX = Math.max(0, Math.min(100, 100 - ballPos.y));
        bY = Math.max(0, Math.min(100, ballPos.x));
      }

      const newScene: TacticalScene = {
        id: crypto.randomUUID(),
        durationMs: 1500,
        pauseMs: 500,
        easing: get().defaultEasing,
        players: newPlayers,
        ballPos: { x: bX, y: bY },
      };

      set({
        scenes: [newScene],
        activeSceneIndex: 0,
        isFlipped: isFlipped,
        selectedPlayerId: null,
        selectedPlayerIds: [],
      });

      // IndexedDB から選手マスター (顔写真等) を非同期取得して自動適用
      const playerIds = Object.values(newPlayers)
        .map((p) => Number(p.playerId))
        .filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0);

      if (playerIds.length > 0 && typeof window !== 'undefined') {
        getPlayersMasterBatch(playerIds)
          .then((masters) => {
            if (masters && masters.size > 0) {
              get().applyPlayerMasters(masters);
            }
          })
          .catch((err) => {
            console.warn(
              '[tactical-animation-store] Failed to auto-sync player masters:',
              err,
            );
          });
      }
    },

    applyPlayerMasters: (masters: Map<number, PlayerMaster>) =>
      set((state) => {
        if (!masters || masters.size === 0) return state;

        const newScenes = state.scenes.map((scene) => {
          let hasChanges = false;
          const updatedPlayers = { ...scene.players };

          for (const [id, master] of masters.entries()) {
            const pIdStr = id.toString();
            const player = updatedPlayers[pIdStr];
            if (player && (master.photoBlob || master.photoUrl)) {
              let photoUrl = player.options.photoUrl;
              if (master.photoBlob) {
                photoUrl = URL.createObjectURL(master.photoBlob);
              } else if (master.photoUrl) {
                photoUrl = master.photoUrl;
              }

              if (
                photoUrl &&
                (player.options.insideContent !== 'photo' ||
                  player.options.photoUrl !== photoUrl)
              ) {
                updatedPlayers[pIdStr] = {
                  ...player,
                  options: {
                    ...player.options,
                    insideContent: 'photo',
                    photoUrl,
                  },
                };
                hasChanges = true;
              }
            }
          }

          return hasChanges ? { ...scene, players: updatedPlayers } : scene;
        });

        return { scenes: newScenes };
      }),

    syncPlayerMasters: async () => {
      const state = get();
      const allIds = new Set<number>();
      state.scenes.forEach((s) => {
        if (s.players) {
          Object.values(s.players).forEach((p) => {
            const num = Number(p.playerId);
            if (typeof num === 'number' && !Number.isNaN(num) && num > 0) {
              allIds.add(num);
            }
          });
        }
      });

      if (allIds.size === 0) return;

      try {
        const masters = await getPlayersMasterBatch(Array.from(allIds));
        if (masters && masters.size > 0) {
          get().applyPlayerMasters(masters);
        }
      } catch (err) {
        console.warn(
          '[tactical-animation-store] syncPlayerMasters error:',
          err,
        );
      }
    },
  }),
);
