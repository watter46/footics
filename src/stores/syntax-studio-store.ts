import { create } from 'zustand';
import type { SyntaxIntegrationDraft } from '../lib/types/syntax-integration';

type ViewMode = 'split' | 'focus';

interface SyntaxStudioState {
  viewMode: ViewMode;
  currentSceneIndex: number;
  aiDraft: SyntaxIntegrationDraft | null;
  humanGroundTruth: SyntaxIntegrationDraft | null;
  matchMetadata: {
    homeTeam: string;
    awayTeam: string;
    actionType: string;
  } | null;
  datasetId: string | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setCurrentSceneIndex: (index: number) => void;
  loadJsonDraft: (jsonString: string) => void;
  updateGroundTruthPlayerPosition: (
    sceneId: string,
    playerId: string,
    x: number,
    y: number,
  ) => void;
  updateGroundTruthPlayerAnnotation: (
    sceneId: string,
    playerId: string,
    annotation: string,
  ) => void;
}

export const useSyntaxStudioStore = create<SyntaxStudioState>((set) => ({
  viewMode: 'split',
  currentSceneIndex: 0,
  aiDraft: null,
  humanGroundTruth: null,
  matchMetadata: null,
  datasetId: null,

  setViewMode: (mode) => set({ viewMode: mode }),

  setCurrentSceneIndex: (index) => set({ currentSceneIndex: index }),

  loadJsonDraft: (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.aiDraft) {
        set({
          aiDraft: parsed.aiDraft,
          humanGroundTruth:
            parsed.humanGroundTruth ||
            JSON.parse(JSON.stringify(parsed.aiDraft)),
          matchMetadata: parsed.matchMetadata || null,
          datasetId: parsed.datasetId || `tuning_${Date.now()}`,
        });
      } else {
        set({
          aiDraft: parsed,
          humanGroundTruth: JSON.parse(JSON.stringify(parsed)),
          datasetId: `tuning_${Date.now()}`,
        });
      }
    } catch (e) {
      console.error('Failed to parse JSON Draft', e);
    }
  },

  updateGroundTruthPlayerPosition: (sceneId, playerId, x, y) =>
    set((state) => {
      if (!state.humanGroundTruth) return state;

      const newTruth = { ...state.humanGroundTruth };
      const sceneIndex = newTruth.tacticalScenes.findIndex(
        (s) => s.id === sceneId,
      );
      if (sceneIndex === -1) return state;

      const newScenes = [...newTruth.tacticalScenes];
      const newScene = { ...newScenes[sceneIndex] };

      const playerIndex = newScene.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) return state;

      const newPlayers = [...newScene.players];
      newPlayers[playerIndex] = { ...newPlayers[playerIndex], x, y };

      newScene.players = newPlayers;
      newScenes[sceneIndex] = newScene;
      newTruth.tacticalScenes = newScenes;

      return { humanGroundTruth: newTruth };
    }),

  updateGroundTruthPlayerAnnotation: (sceneId, playerId, annotation) =>
    set((state) => {
      if (!state.humanGroundTruth) return state;

      const newTruth = { ...state.humanGroundTruth };
      const sceneIndex = newTruth.tacticalScenes.findIndex(
        (s) => s.id === sceneId,
      );
      if (sceneIndex === -1) return state;

      const newScenes = [...newTruth.tacticalScenes];
      const newScene = { ...newScenes[sceneIndex] };

      const playerIndex = newScene.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) return state;

      const newPlayers = [...newScene.players];
      newPlayers[playerIndex] = { ...newPlayers[playerIndex], annotation };

      newScene.players = newPlayers;
      newScenes[sceneIndex] = newScene;
      newTruth.tacticalScenes = newScenes;

      return { humanGroundTruth: newTruth };
    }),
}));
