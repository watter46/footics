import type { StateCreator } from 'zustand';
import type {
  ArrowAnnotation,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import { eraseAnnotationsAtPoint } from './annotation-erase-helpers';
import { updateSlideImmer } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';
import {
  getSlide,
  recordHistory,
  updateSlideInProject,
} from './tactical-unified-store';

export { eraseAnnotationsAtPoint } from './annotation-erase-helpers';

export interface AnnotationSlice {
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void;
  updateArrow: (
    slideId: string,
    arrowId: string,
    patch: Partial<ArrowAnnotation>,
  ) => void;
  removeArrow: (slideId: string, arrowId: string) => void;
  addZone: (slideId: string, zone: ZoneAnnotation) => void;
  updateZone: (
    slideId: string,
    zoneId: string,
    patch: Partial<ZoneAnnotation>,
  ) => void;
  removeZone: (slideId: string, zoneId: string) => void;
  addText: (slideId: string, text: TextAnnotation) => void;
  updateText: (
    slideId: string,
    textId: string,
    patch: Partial<TextAnnotation>,
  ) => void;
  removeText: (slideId: string, textId: string) => void;
  clearAnnotations: (slideId: string) => void;
  eraseAtPoint: (
    slideId: string,
    point: { x: number; y: number },
    radius?: number,
  ) => void;
}

export const createAnnotationSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  AnnotationSlice
> = (set, _get, _store) => ({
  addArrow: (slideId, arrow) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideImmer(s.project, slideId, (draft) => {
        draft.arrows.push(arrow);
      }),
      isDirty: true,
    })),

  updateArrow: (slideId, arrowId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingArrow = slide?.arrows.find((a) => a.id === arrowId);
      if (existingArrow?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: sl.arrows.map((a) =>
            a.id === arrowId ? { ...a, ...patch } : a,
          ),
        })),
        isDirty: true,
      };
    }),

  removeArrow: (slideId, arrowId) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingArrow = slide?.arrows.find((a) => a.id === arrowId);
      if (existingArrow?.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: sl.arrows.filter((a) => a.id !== arrowId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== arrowId),
      };
    }),

  addZone: (slideId, zone) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideImmer(s.project, slideId, (draft) => {
        draft.zones.push(zone);
      }),
      isDirty: true,
    })),

  updateZone: (slideId, zoneId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingZone = slide?.zones.find((z) => z.id === zoneId);
      if (existingZone?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: sl.zones.map((z) =>
            z.id === zoneId ? { ...z, ...patch } : z,
          ),
        })),
        isDirty: true,
      };
    }),

  removeZone: (slideId, zoneId) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingZone = slide?.zones.find((z) => z.id === zoneId);
      if (existingZone?.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: sl.zones.filter((z) => z.id !== zoneId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== zoneId),
      };
    }),

  addText: (slideId, text) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideImmer(s.project, slideId, (draft) => {
        draft.texts.push(text);
      }),
      isDirty: true,
    })),

  updateText: (slideId, textId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingText = slide?.texts.find((t) => t.id === textId);
      if (existingText?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: sl.texts.map((t) =>
            t.id === textId ? { ...t, ...patch } : t,
          ),
        })),
        isDirty: true,
      };
    }),

  removeText: (slideId, textId) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingText = slide?.texts.find((t) => t.id === textId);
      if (existingText?.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: sl.texts.filter((t) => t.id !== textId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== textId),
      };
    }),

  clearAnnotations: (slideId) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        arrows: [],
        zones: [],
        texts: [],
      })),
      isDirty: true,
      selectedObjects: s.selectedObjects.filter(
        (o) => o.kind === 'player' || o.kind === 'ball',
      ),
    })),

  eraseAtPoint: (slideId, point, radius = 4.0) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) =>
        eraseAnnotationsAtPoint(sl, point, radius),
      ),
      isDirty: true,
    })),
});
