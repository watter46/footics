import type { StateCreator } from 'zustand';
import { getScreenOuterPitchRect } from '@/lib/tactical/pitch-geometry';
import type {
  BoundaryBox,
  PitchTransform,
  XMediaPresetKey,
} from '@/lib/types/tactical-unified';
import {
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_16_9,
  X_MEDIA_PRESETS,
} from '@/lib/types/tactical-unified';
import {
  findPhaseIdForSlide,
  updatePhaseBoundaryInProject,
} from './boundary-box-helpers';
import { getSlide, recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface PitchSlice {
  centerPitchAndBoundary: (slideId?: string) => void;
  setBoundaryBox: (slideId: string, box: BoundaryBox | undefined) => void;
  updateBoundaryBox: (slideId: string, box: BoundaryBox | undefined) => void;
  updateActiveSlideBoundaryBox: (box: BoundaryBox | undefined) => void;
  autoFitBoundaryBox: (
    slideId?: string,
    pitchRect?: { width: number; height: number },
  ) => void;
  applyXMediaPreset: (
    presetKey: XMediaPresetKey | 'pitch_fit',
    slideId?: string,
  ) => void;
  togglePitchLock: (slideId?: string) => void;
  updatePitchTransform: (
    slideId: string | undefined,
    patch: Partial<PitchTransform>,
    recordHistory?: boolean,
  ) => void;
  setPitchPosition: (slideId?: string, pos?: { x: number; y: number }) => void;
}

type SetState = Parameters<
  StateCreator<
    TacticalUnifiedState,
    [['zustand/subscribeWithSelector', never]],
    [],
    PitchSlice
  >
>[0];

function createPitchBoundaryActions(set: SetState) {
  return {
    setBoundaryBox: (slideId: string, box: BoundaryBox | undefined) =>
      set((s) => {
        const phaseId =
          findPhaseIdForSlide(s.project, slideId) || s.activePhaseId;
        return {
          ...recordHistory(s),
          project: updatePhaseBoundaryInProject(s.project, phaseId, box),
          isDirty: true,
        };
      }),

    updateBoundaryBox: (slideId: string, box: BoundaryBox | undefined) =>
      set((s) => {
        const phaseId =
          findPhaseIdForSlide(s.project, slideId) || s.activePhaseId;
        return {
          project: updatePhaseBoundaryInProject(s.project, phaseId, box),
          isDirty: true,
        };
      }),

    updateActiveSlideBoundaryBox: (box: BoundaryBox | undefined) =>
      set((s) => {
        const phaseId =
          findPhaseIdForSlide(s.project, s.activeSlideId) || s.activePhaseId;
        return {
          ...recordHistory(s),
          project: updatePhaseBoundaryInProject(s.project, phaseId, box),
          isDirty: true,
        };
      }),

    autoFitBoundaryBox: (
      slideId?: string,
      _pitchRect?: { width: number; height: number },
    ) =>
      set((s) => {
        const phaseId =
          findPhaseIdForSlide(s.project, slideId ?? s.activeSlideId) ||
          s.activePhaseId;
        const phase = s.project.phases.find((p) => p.id === phaseId);
        const aspect = phase?.aspectRatio ?? s.project.aspectRatio ?? '16:9';
        const outer = getScreenOuterPitchRect(aspect);
        const box: BoundaryBox = {
          x: outer.left,
          y: outer.top,
          width: outer.width,
          height: outer.height,
          enabled: true,
          visible: false,
          fitTarget: 'pitch',
        };
        return {
          ...recordHistory(s),
          project: updatePhaseBoundaryInProject(s.project, phaseId, box),
          isDirty: true,
        };
      }),

    applyXMediaPreset: (
      presetKey: XMediaPresetKey | 'pitch_fit',
      slideId?: string,
    ) =>
      set((s) => {
        const phaseId =
          findPhaseIdForSlide(s.project, slideId ?? s.activeSlideId) ||
          s.activePhaseId;
        const phase = s.project.phases.find((p) => p.id === phaseId);
        const aspect = phase?.aspectRatio ?? s.project.aspectRatio ?? '16:9';

        let box: BoundaryBox;
        if (presetKey === 'pitch_fit') {
          const outer = getScreenOuterPitchRect(aspect);
          box = {
            x: outer.left,
            y: outer.top,
            width: outer.width,
            height: outer.height,
            enabled: true,
            visible: false,
            fitTarget: 'pitch',
          };
        } else {
          const preset = X_MEDIA_PRESETS[presetKey];
          box = createXBoundaryBox(preset?.ratio ?? '16:9', '16:9');
        }

        return {
          ...recordHistory(s),
          project: updatePhaseBoundaryInProject(s.project, phaseId, box),
          isDirty: true,
        };
      }),
  };
}

function createPitchTransformActions(set: SetState) {
  return {
    togglePitchLock: (slideId?: string) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const slide = getSlide(s.project, targetSlideId);
        if (!slide) return s;
        const currentLocked = slide.pitchTransform?.isLocked ?? false;
        const newTransform = {
          panX: slide.pitchTransform?.panX ?? 0,
          panY: slide.pitchTransform?.panY ?? 0,
          zoom: slide.pitchTransform?.zoom ?? 1,
          tilt: slide.pitchTransform?.tilt ?? 0,
          yaw: slide.pitchTransform?.yaw ?? 90,
          isLocked: !currentLocked,
        };
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
            ...sl,
            pitchTransform: newTransform,
          })),
          isDirty: true,
        };
      }),

    updatePitchTransform: (
      slideId: string | undefined,
      patch: Partial<PitchTransform>,
      shouldRecordHistory = false,
    ) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const slide = getSlide(s.project, targetSlideId);
        if (!slide) return s;
        const current = slide.pitchTransform ?? {
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 90,
          isLocked: false,
        };
        const newTransform: PitchTransform = {
          panX: patch.panX ?? current.panX,
          panY: patch.panY ?? current.panY,
          zoom: patch.zoom ?? current.zoom,
          tilt: patch.tilt ?? current.tilt,
          yaw: patch.yaw ?? current.yaw,
          isLocked: patch.isLocked ?? current.isLocked,
        };
        return {
          ...(shouldRecordHistory ? recordHistory(s) : {}),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
            ...sl,
            pitchTransform: newTransform,
          })),
          isDirty: true,
        };
      }),

    setPitchPosition: (slideId?: string, pos?: { x: number; y: number }) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const slide = getSlide(s.project, targetSlideId);
        if (!slide) return s;
        const current = slide.pitchTransform ?? {
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 90,
          isLocked: false,
        };
        const newTransform: PitchTransform = {
          ...current,
          panX: pos?.x ?? 0,
          panY: pos?.y ?? 0,
        };
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
            ...sl,
            pitchPosition: pos ? { ...pos } : undefined,
            pitchTransform: newTransform,
          })),
          isDirty: true,
        };
      }),
  };
}

export const createPitchSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  PitchSlice
> = (set) => ({
  centerPitchAndBoundary: (slideId?: string) =>
    set((s) => {
      const targetSlideId = slideId ?? s.activeSlideId;
      const phaseId =
        findPhaseIdForSlide(s.project, targetSlideId) || s.activePhaseId;
      const slide = getSlide(s.project, targetSlideId);
      if (!slide) return s;
      const defaultBox = DEFAULT_BOUNDARY_BOX_16_9;
      const resetTransform: PitchTransform = {
        panX: 0,
        panY: 0,
        zoom: 1,
        tilt: 0,
        yaw: 90,
        isLocked: slide.pitchTransform?.isLocked ?? true,
      };
      const projectWithTransform = updateSlideInProject(
        s.project,
        targetSlideId,
        (sl) => ({
          ...sl,
          pitchPosition: undefined,
          pitchTransform: resetTransform,
        }),
      );
      return {
        ...recordHistory(s),
        project: updatePhaseBoundaryInProject(
          projectWithTransform,
          phaseId,
          defaultBox,
        ),
        isDirty: true,
      };
    }),
  ...createPitchBoundaryActions(set),
  ...createPitchTransformActions(set),
});
