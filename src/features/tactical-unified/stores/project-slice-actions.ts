import type {
  AspectRatio,
  Slide,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  createDefaultProject,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical-unified';
import { transformSlideAspectRatio } from './slide-aspect-helpers';
import { applyImageBackgroundToProject } from './slide-background-helpers';
import { executeBatchDeleteOnSlide } from './slide-batch-delete-helpers';
import { flipSlideObjects, isVerticalPitch } from './slide-flip-helpers';
import { toggleSlideObjectLock } from './slide-lock-helpers';
import {
  filterLockedSelectedObjects,
  resetSlideKeepSquadData,
  resetSlideObjectsData,
} from './slide-reset-helpers';
import { getSlide, recordHistory, updateSlideInProject } from './store-helpers';
import type {
  MarkerOptionTab,
  PanelState,
  SelectedObject,
  SelectedObjectKind,
} from './tool-slice';

export interface ProjectSliceStoreState {
  project: TacticalProject;
  activeSlideId: string;
  stageAspect: number | null;
  pitchFitPending: boolean;
  selectedObjects: SelectedObject[];
  past: Slide[][];
  future: Slide[][];
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
    loadProject: (project: TacticalProject) =>
      set({
        project,
        isDirty: false,
        past: [],
        future: [],
        clipboard: null,
        activeSlideId: project.activeSlideId,
        selectedObjects: [],
        teamVisibility: 'both',
        pitchFitPending: false,
      }),

    resetProject: () =>
      set(() => {
        const p = createDefaultProject(crypto.randomUUID());
        return {
          project: p,
          pitchFitPending: false,
          isDirty: false,
          past: [],
          future: [],
          clipboard: null,
          activeSlideId: p.activeSlideId,
          selectedObjects: [],
          teamVisibility: 'both',
        };
      }),

    setStageAspect: (aspect: number) =>
      set((s) => {
        if (s.stageAspect === aspect) return s;
        return {
          stageAspect: aspect,
          pitchFitPending: false,
        };
      }),

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

export function createProjectConfigActions(set: ProjectSliceSet) {
  return {
    swapTeamSides: (slideId?: string) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const isVertical = isVerticalPitch(s.project.aspectRatio);
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) =>
            flipSlideObjects(sl, isVertical),
          ),
          isDirty: true,
        };
      }),

    resetSlideObjects: (slideId?: string) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const defaultBox = getDefaultBoundaryBoxForAspect(
          s.project.aspectRatio,
        );
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) =>
            resetSlideObjectsData(sl, defaultBox),
          ),
          selectedObjects: filterLockedSelectedObjects(
            s.selectedObjects,
            getSlide(s.project, targetSlideId),
          ),
          activeMarkerOptionTab: null,
          isDirty: true,
        };
      }),

    resetSlideKeepSquad: (slideId?: string) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const aspect = s.project.aspectRatio;
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) =>
            resetSlideKeepSquadData(sl, aspect, s.project.matchFormations),
          ),
          selectedObjects: [],
          activeMarkerOptionTab: null,
          isDirty: true,
        };
      }),

    toggleObjectLock: (objectId: string, kind: SelectedObjectKind) =>
      set((s) => {
        const targetSlideId = s.activeSlideId;
        const slide = getSlide(s.project, targetSlideId);
        if (!slide) return s;
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) =>
            toggleSlideObjectLock(sl, objectId, kind),
          ),
          isDirty: true,
        };
      }),

    setTeamColor: (
      team: 'home' | 'away',
      primary: string,
      secondary?: string,
    ) =>
      set((s) => ({
        ...recordHistory(s),
        project: {
          ...s.project,
          updatedAt: new Date().toISOString(),
          ...(team === 'home'
            ? { homeColor: { primary, secondary } }
            : { awayColor: { primary, secondary } }),
          slides: s.project.slides.map((sl) => ({
            ...sl,
            players: sl.players.map((p) =>
              p.team === team
                ? { ...p, style: { ...p.style, color: primary } }
                : p,
            ),
          })),
        },
        isDirty: true,
      })),

    setAspectRatio: (ratio: AspectRatio) =>
      set((s) => {
        const from = s.project.aspectRatio;
        if (from === ratio) return s;
        const transformedSlides = s.project.slides.map((slide) =>
          transformSlideAspectRatio(slide, from, ratio),
        );
        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            aspectRatio: ratio,
            boundaryBox: getDefaultBoundaryBoxForAspect(ratio),
            slides: transformedSlides,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      }),

    deleteSelectedObjects: (slideId?: string) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const slide = getSlide(s.project, targetSlideId);
        if (!slide || s.selectedObjects.length === 0) return s;

        const result = executeBatchDeleteOnSlide(slide, s.selectedObjects);
        if (!result.hasChanges) return s;

        return {
          ...recordHistory(s),
          project: updateSlideInProject(
            s.project,
            targetSlideId,
            () => result.updatedSlide,
          ),
          selectedObjects: result.remainingSelectedObjects,
          isDirty: true,
        };
      }),
  };
}
