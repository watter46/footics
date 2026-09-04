import type { StateCreator } from 'zustand';
import type { PlayerTrajectory } from '@/lib/types/tactical-unified';
import { getSlide, recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlideBallSlice {
  setBallPosition: (slideId: string, x: number, y: number) => void;
  setBallVisible: (slideId: string, visible: boolean) => void;
  updateBallTrajectory: (
    slideId: string,
    trajectory: PlayerTrajectory | undefined,
  ) => void;
  setPitchPosition: (
    slideId: string,
    pos: { x: number; y: number } | undefined,
  ) => void;
}

export const createSlideBallSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideBallSlice
> = (set) => ({
  setBallPosition: (slideId, x, y) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      if (slide?.ball.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ball: { ...sl.ball, x, y },
        })),
        isDirty: true,
      };
    }),

  setBallVisible: (slideId, visible) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        ball: { ...sl.ball, visible },
      })),
      isDirty: true,
    })),

  updateBallTrajectory: (slideId, trajectory) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        ball: { ...sl.ball, trajectory },
      })),
      isDirty: true,
    })),

  setPitchPosition: (slideId, pos) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        pitchPosition: pos ? { ...pos } : undefined,
        pitchTransform: sl.pitchTransform
          ? {
              ...sl.pitchTransform,
              panX: pos?.x ?? 0,
              panY: pos?.y ?? 0,
            }
          : {
              panX: pos?.x ?? 0,
              panY: pos?.y ?? 0,
              zoom: 1,
              tilt: 0,
              isLocked: false,
            },
      })),
      isDirty: true,
    })),
});
