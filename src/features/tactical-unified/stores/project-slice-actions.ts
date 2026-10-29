import {
  createDefaultProject,
  ensureTacticalProject,
  type TacticalPhase,
  type TacticalProject,
} from '@/lib/types/tactical-unified';
import { applyImageBackgroundToProject } from './slide-background-helpers';
import { recordHistory } from './store-helpers';
import type { MarkerOptionTab, PanelState, SelectedObject } from './tool-slice';

export { createProjectConfigActions } from './project-slice-config-actions';

export interface ProjectSliceStoreState {
  project: TacticalProject;
  activePhaseId: string;
  activeSlideId: string;
  stageAspect: number | null;
  pitchFitPending: boolean;
  selectedObjects: SelectedObject[];
  past: TacticalPhase[][];
  future: TacticalPhase[][];
  clipboard: unknown;
  teamVisibility: 'home' | 'away' | 'both';
  panels: PanelState;
  activeMarkerOptionTab: MarkerOptionTab | null;
  isDirty: boolean;
}

export type ProjectSliceSet = (
  partial:
    | Partial<ProjectSliceStoreState>
    | ((state: ProjectSliceStoreState) => Partial<ProjectSliceStoreState>),
) => void;

export function createProjectMetaActions(set: ProjectSliceSet) {
  return {
    loadProject: (project: TacticalProject) => {
      const normalized = ensureTacticalProject(project);
      set({
        project: normalized,
        isDirty: false,
        past: [],
        future: [],
        clipboard: null,
        activePhaseId: normalized.activePhaseId,
        activeSlideId: normalized.activeSlideId,
        selectedObjects: [],
        teamVisibility: 'both',
        pitchFitPending: false,
      });
    },

    resetProject: () =>
      set(() => {
        const p = createDefaultProject(crypto.randomUUID());
        return {
          project: p,
          activePhaseId: p.activePhaseId,
          activeSlideId: p.activeSlideId,
          pitchFitPending: false,
          isDirty: false,
          past: [],
          future: [],
          clipboard: null,
          selectedObjects: [],
          teamVisibility: 'both',
        };
      }),

    setStageAspect: (aspect: number) =>
      set((s) =>
        s.stageAspect === aspect
          ? s
          : { stageAspect: aspect, pitchFitPending: false },
      ),

    setTitle: (title: string) =>
      set((s) => ({
        project: { ...s.project, title, updatedAt: new Date().toISOString() },
        isDirty: true,
      })),

    setBackgroundType: (type: TacticalProject['backgroundType']) =>
      set((s) => ({
        project: {
          ...s.project,
          backgroundType: type,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    setBackgroundImageUrl: (url: string | undefined) =>
      set((s) => ({
        project: {
          ...s.project,
          backgroundImageUrl: url,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    restoreDefaultPitch: () =>
      set((s) => ({
        project: {
          ...s.project,
          backgroundType: 'pitch',
          backgroundImageUrl: undefined,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    setImageBackground: (url: string) =>
      set((s) => {
        const result = applyImageBackgroundToProject(
          s.project,
          url,
          s.activeSlideId,
        );
        return {
          ...recordHistory(s),
          project: result.project,
          activeSlideId: result.activeSlideId,
          panels: {
            ...s.panels,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
          },
          selectedObjects: [],
          isDirty: true,
        };
      }),
  };
}
