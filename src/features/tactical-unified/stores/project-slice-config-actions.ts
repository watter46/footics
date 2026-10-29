import {
  type AspectRatio,
  DEFAULT_PITCH_APPEARANCE,
  getDefaultBoundaryBoxForAspect,
  type PitchAppearanceConfig,
} from '@/lib/types/tactical-unified';
import type { ProjectSliceSet } from './project-slice-actions';
import { transformSlideAspectRatio } from './slide-aspect-helpers';
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
        const from = s.project.aspectRatio;
        if (from === ratio) return s;
        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            aspectRatio: ratio,
            boundaryBox: getDefaultBoundaryBoxForAspect(ratio),
            phases: s.project.phases.map((ph) => ({
              ...ph,
              slides: ph.slides.map((sl) =>
                transformSlideAspectRatio(sl, from, ratio),
              ),
            })),
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
