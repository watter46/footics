import {
  type AspectRatio,
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  getDefaultBoundaryBoxForAspect,
  type PitchAppearanceConfig,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
import type { ProjectSliceSet } from './project-slice-actions';
import { transformSlideForAspect } from './slide-aspect-helpers';
import { executeBatchDeleteOnSlide } from './slide-batch-delete-helpers';
import { flipSlideObjects, isVerticalPitch } from './slide-flip-helpers';
import { toggleSlideObjectLock } from './slide-lock-helpers';
import {
  filterLockedSelectedObjects,
  resetSlideKeepSquadData,
  resetSlideObjectsData,
} from './slide-reset-helpers';
import { getSlide, recordHistory, updateSlideInProject } from './store-helpers';
import type { SelectedObjectKind } from './tool-slice';

export function createProjectConfigActions(set: ProjectSliceSet) {
  return {
    updatePitchAppearance: (appearance: Partial<PitchAppearanceConfig>) =>
      set((s) => ({
        ...recordHistory(s),
        project: {
          ...s.project,
          pitchAppearance: {
            ...(s.project.pitchAppearance ?? DEFAULT_PITCH_APPEARANCE),
            ...appearance,
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    updateScreenBackground: (config: Partial<ScreenBackgroundConfig>) =>
      set((s) => ({
        ...recordHistory(s),
        project: {
          ...s.project,
          screenBackground: {
            ...(s.project.screenBackground ?? DEFAULT_SCREEN_BACKGROUND),
            ...config,
          },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

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
          phases: s.project.phases.map((ph) => ({
            ...ph,
            slides: ph.slides.map((sl) => ({
              ...sl,
              players: sl.players.map((p) =>
                p.team === team
                  ? { ...p, style: { ...p.style, color: primary } }
                  : p,
              ),
            })),
          })),
        },
        isDirty: true,
      })),

    setAspectRatio: (ratio: AspectRatio) =>
      set((s) => {
        const activePhaseId = s.activePhaseId ?? s.project.activePhaseId;
        const activePhase =
          s.project.phases.find((p) => p.id === activePhaseId) ??
          s.project.phases[0];
        if (!activePhase) return s;
        const oldRatio =
          activePhase.aspectRatio ?? s.project.aspectRatio ?? '16:9';
        if (oldRatio === ratio) return s;

        const updatedPhases = s.project.phases.map((ph) => {
          if (ph.id !== activePhase.id) return ph;
          return {
            ...ph,
            aspectRatio: ratio,
            slides: ph.slides.map((sl) =>
              transformSlideForAspect(sl, oldRatio, ratio),
            ),
          };
        });

        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            aspectRatio: ratio,
            phases: updatedPhases,
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
