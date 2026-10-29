import type { StateCreator } from 'zustand';
import type { TacticalPhase } from '@/lib/types/tactical-unified';
import {
  attachSlidesGetter,
  clonePhasesShallow,
  MAX_HISTORY,
  recordHistory,
} from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface HistorySlice {
  past: TacticalPhase[][];
  future: TacticalPhase[][];
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
      const previousPhases = nextPast.pop();
      if (!previousPhases) return s;

      const currentPhases = clonePhasesShallow(s.project.phases);
      const nextFuture = [currentPhases, ...s.future].slice(0, MAX_HISTORY);

      let nextActiveSlideId = s.activeSlideId;
      const allPreviousSlides = previousPhases.flatMap((p) => p.slides);
      if (!allPreviousSlides.some((sl) => sl.id === nextActiveSlideId)) {
        nextActiveSlideId = allPreviousSlides[0]?.id ?? '';
      }
      let nextActivePhaseId = s.activePhaseId;
      if (!previousPhases.some((p) => p.id === nextActivePhaseId)) {
        nextActivePhaseId = previousPhases[0]?.id ?? '';
      }

      return {
        past: nextPast,
        future: nextFuture,
        project: attachSlidesGetter({
          ...s.project,
          phases: previousPhases,
          activePhaseId: nextActivePhaseId,
          activeSlideId: nextActiveSlideId,
          updatedAt: new Date().toISOString(),
        }),
        activePhaseId: nextActivePhaseId,
        activeSlideId: nextActiveSlideId,
        selectedObjects: [],
        isDirty: true,
      };
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const nextFuture = [...s.future];
      const nextPhases = nextFuture.shift();
      if (!nextPhases) return s;

      const currentPhases = clonePhasesShallow(s.project.phases);
      const nextPast = [...s.past, currentPhases];
      if (nextPast.length > MAX_HISTORY) {
        nextPast.shift();
      }

      let nextActiveSlideId = s.activeSlideId;
      const allNextSlides = nextPhases.flatMap((p) => p.slides);
      if (!allNextSlides.some((sl) => sl.id === nextActiveSlideId)) {
        nextActiveSlideId = allNextSlides[0]?.id ?? '';
      }
      let nextActivePhaseId = s.activePhaseId;
      if (!nextPhases.some((p) => p.id === nextActivePhaseId)) {
        nextActivePhaseId = nextPhases[0]?.id ?? '';
      }

      return {
        past: nextPast,
        future: nextFuture,
        project: attachSlidesGetter({
          ...s.project,
          phases: nextPhases,
          activePhaseId: nextActivePhaseId,
          activeSlideId: nextActiveSlideId,
          updatedAt: new Date().toISOString(),
        }),
        activePhaseId: nextActivePhaseId,
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
