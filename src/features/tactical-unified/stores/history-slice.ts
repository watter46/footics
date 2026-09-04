import type { StateCreator } from 'zustand';
import type { Slide } from '@/lib/types/tactical-unified';
import type { TacticalUnifiedState } from './tactical-unified-store';
import { MAX_HISTORY, recordHistory } from './tactical-unified-store';

export interface HistorySlice {
  past: Slide[][];
  future: Slide[][];
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

export const createHistorySlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  HistorySlice
> = (set, _get, _store) => ({
  past: [],
  future: [],
  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const nextPast = [...s.past];
      const previousSlides = nextPast.pop();
      if (!previousSlides) return s;

      const currentSlides = structuredClone(s.project.slides);
      const nextFuture = [currentSlides, ...s.future].slice(0, MAX_HISTORY);

      let nextActiveSlideId = s.activeSlideId;
      if (!previousSlides.some((sl) => sl.id === nextActiveSlideId)) {
        nextActiveSlideId = previousSlides[0]?.id ?? '';
      }

      return {
        past: nextPast,
        future: nextFuture,
        project: {
          ...s.project,
          slides: previousSlides,
          activeSlideId: nextActiveSlideId,
          updatedAt: new Date().toISOString(),
        },
        activeSlideId: nextActiveSlideId,
        selectedObjects: [],
        isDirty: true,
      };
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const nextFuture = [...s.future];
      const nextSlides = nextFuture.shift();
      if (!nextSlides) return s;

      const currentSlides = structuredClone(s.project.slides);
      const nextPast = [...s.past, currentSlides];
      if (nextPast.length > MAX_HISTORY) {
        nextPast.shift();
      }

      let nextActiveSlideId = s.activeSlideId;
      if (!nextSlides.some((sl) => sl.id === nextActiveSlideId)) {
        nextActiveSlideId = nextSlides[0]?.id ?? '';
      }

      return {
        past: nextPast,
        future: nextFuture,
        project: {
          ...s.project,
          slides: nextSlides,
          activeSlideId: nextActiveSlideId,
          updatedAt: new Date().toISOString(),
        },
        activeSlideId: nextActiveSlideId,
        selectedObjects: [],
        isDirty: true,
      };
    }),
  pushHistory: () =>
    set((s) => ({
      ...recordHistory(s),
    })),
});
