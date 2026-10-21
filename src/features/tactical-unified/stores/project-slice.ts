import type { StateCreator } from 'zustand';
import {
  getPitchRectNormalized,
  mapPlayersToPitchRect,
  pitchToStageCoord,
  stageToPitchCoord,
} from '@/lib/tactical/pitch-stage-mapping';
import type {
  AspectRatio,
  ExportTarget,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  createDefaultProject,
  DEFAULT_BOUNDARY_BOX_FULL,
  getDefaultBoundaryBoxForAspect,
  transformCoord,
} from '@/lib/types/tactical-unified';
import { transformSlideAspectRatio } from './slide-aspect-helpers';
import { applyImageBackgroundToProject } from './slide-background-helpers';
import { flipSlideObjects, isVerticalPitch } from './slide-flip-helpers';
import { toggleSlideObjectLock } from './slide-lock-helpers';
import {
  filterLockedSelectedObjects,
  resetSlideObjectsData,
} from './slide-reset-helpers';
import { getSlide, recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';
import type { SelectedObjectKind } from './tool-slice';

export interface ProjectSlice {
  project: TacticalProject;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  setLastSavedAt: (timestamp: number | null) => void;
  activeSlideId: string;
  /** Stage(コンテナ全面)の width/height。未計測は null（非永続・履歴対象外） */
  stageAspect: number | null;
  /** 既定配置(ピッチ基準)が Stage 座標へ未写像か。初回計測時に一度だけ写像する */
  pitchFitPending: boolean;
  setStageAspect: (aspect: number) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
  pendingExport: ExportTarget | null;
  isExporting: boolean;
  setIsExporting: (val: boolean) => void;
  loadProject: (project: TacticalProject) => void;
  resetProject: () => void;
  setTitle: (title: string) => void;
  setBackgroundType: (type: TacticalProject['backgroundType']) => void;
  setBackgroundImageUrl: (url: string | undefined) => void;
  restoreDefaultPitch: () => void;
  setImageBackground: (url: string) => void;
  setTeamColor: (
    team: 'home' | 'away',
    primary: string,
    secondary?: string,
  ) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  swapTeamSides: (slideId?: string) => void;
  resetSlideObjects: (slideId?: string) => void;
  toggleObjectLock: (objectId: string, kind: SelectedObjectKind) => void;
}

const INITIAL_PROJECT = createDefaultProject(crypto.randomUUID());

type SetState = Parameters<
  StateCreator<
    TacticalUnifiedState,
    [['zustand/subscribeWithSelector', never]],
    [],
    ProjectSlice
  >
>[0];

function fitProjectPlayers(
  project: TacticalProject,
  stageAspect: number | null,
): TacticalProject {
  const rect = getPitchRectNormalized(stageAspect, project.aspectRatio);
  return {
    ...project,
    slides: project.slides.map((sl) => ({
      ...sl,
      players: mapPlayersToPitchRect(sl.players, rect),
    })),
  };
}

function createProjectMetaActions(set: SetState) {
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
      set((s) => {
        const base = createDefaultProject(crypto.randomUUID());
        const known = s.stageAspect !== null;
        const p = known ? fitProjectPlayers(base, s.stageAspect) : base;
        return {
          project: p,
          pitchFitPending: !known,
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
        if (!s.pitchFitPending) return { stageAspect: aspect };
        return {
          stageAspect: aspect,
          pitchFitPending: false,
          project: fitProjectPlayers(s.project, aspect),
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
            rightPanelTab: 'inspector',
            isRightPanelOpen: false,
          },
          selectedObjects: [],
          isDirty: true,
        };
      }),
  };
}

function createProjectConfigActions(set: SetState) {
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
        const fromRect = getPitchRectNormalized(s.stageAspect, from);
        const toRect = getPitchRectNormalized(s.stageAspect, ratio);
        const transformedSlides = s.project.slides.map((slide) => {
          const transformed = transformSlideAspectRatio(slide, from, ratio);
          // マーカーはピッチ基準で変換し、新ピッチ矩形内へ再配置（他オブジェクトは従来どおり）
          return {
            ...transformed,
            players: slide.players.map((p, i) => ({
              ...(transformed.players[i] ?? p),
              ...pitchToStageCoord(
                transformCoord(
                  stageToPitchCoord({ x: p.x, y: p.y }, fromRect),
                  from,
                  ratio,
                ),
                toRect,
              ),
            })),
          };
        });
        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            aspectRatio: ratio,
            boundaryBox: { ...DEFAULT_BOUNDARY_BOX_FULL },
            slides: transformedSlides,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      }),
  };
}

export const createProjectSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  ProjectSlice
> = (set) => ({
  project: INITIAL_PROJECT,
  isDirty: false,
  saveStatus: 'idle',
  lastSavedAt: null,
  setSaveStatus: (status) => set({ saveStatus: status }),
  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),
  activeSlideId: INITIAL_PROJECT.activeSlideId,
  stageAspect: null,
  pitchFitPending: true,
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  stopPlayback: () => set({ isPlaying: false }),
  pendingExport: null,
  isExporting: false,
  setIsExporting: (val) => set({ isExporting: val }),
  ...createProjectMetaActions(set),
  ...createProjectConfigActions(set),
});
