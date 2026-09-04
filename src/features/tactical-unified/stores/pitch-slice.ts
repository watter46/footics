import type { StateCreator } from 'zustand';
import type {
  BoundaryBox,
  PitchTransform,
  XMediaPresetKey,
} from '@/lib/types/tactical-unified';
import {
  createXBoundaryBox,
  X_MEDIA_PRESETS,
} from '@/lib/types/tactical-unified';
import { computePitchFitBoundaryBox } from './boundary-box-helpers';
import { getSlide, recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface PitchSlice {
  setBoundaryBox: (slideId: string, box: BoundaryBox | undefined) => void;
  autoFitBoundaryBox: (slideId?: string) => void;
  applyXMediaPreset: (
    presetKey: XMediaPresetKey | 'pitch_fit',
    slideId?: string,
  ) => void;
  togglePitchLock: (slideId?: string) => void;
  updatePitchTransform: (
    slideId: string | undefined,
    patch: Partial<PitchTransform>,
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
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          boundaryBox: box,
        })),
        isDirty: true,
      })),

    autoFitBoundaryBox: (slideId?: string) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const slide = s.project.slides.find((sl) => sl.id === targetSlideId);
        const isPitchBg =
          (slide?.backgroundType ?? s.project.backgroundType ?? 'pitch') ===
          'pitch';
        const pitchPos =
          slide?.pitchPosition ??
          (slide?.pitchTransform
            ? { x: slide.pitchTransform.panX, y: slide.pitchTransform.panY }
            : undefined);
        const box = computePitchFitBoundaryBox(
          isPitchBg,
          s.project.aspectRatio,
          pitchPos,
        );

        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
            ...sl,
            boundaryBox: box,
          })),
          isDirty: true,
        };
      }),

    applyXMediaPreset: (
      presetKey: XMediaPresetKey | 'pitch_fit',
      slideId?: string,
    ) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        let box: BoundaryBox;
        if (presetKey === 'pitch_fit') {
          const slide = s.project.slides.find((sl) => sl.id === targetSlideId);
          const isPitchBg =
            (slide?.backgroundType ?? s.project.backgroundType ?? 'pitch') ===
            'pitch';
          const pitchPos =
            slide?.pitchPosition ??
            (slide?.pitchTransform
              ? { x: slide.pitchTransform.panX, y: slide.pitchTransform.panY }
              : undefined);
          box = computePitchFitBoundaryBox(
            isPitchBg,
            s.project.aspectRatio,
            pitchPos,
          );
        } else {
          const preset = X_MEDIA_PRESETS[presetKey];
          box = createXBoundaryBox(
            preset?.ratio ?? '16:9',
            s.project.aspectRatio,
          );
        }

        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
            ...sl,
            boundaryBox: box,
          })),
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
          isLocked: false,
        };
        const newTransform: PitchTransform = {
          panX: patch.panX ?? current.panX,
          panY: patch.panY ?? current.panY,
          zoom: patch.zoom ?? current.zoom,
          tilt: patch.tilt ?? current.tilt,
          isLocked: patch.isLocked ?? current.isLocked,
        };
        return {
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
  ...createPitchBoundaryActions(set),
  ...createPitchTransformActions(set),
});
