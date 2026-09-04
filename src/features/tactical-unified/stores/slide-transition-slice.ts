import type { StateCreator } from 'zustand';
import type { Slide } from '@/lib/types/tactical-unified';
import { recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function getEasingFunction(easing?: string): (t: number) => number {
  switch (easing) {
    case 'ease-in':
      return easeInQuad;
    case 'ease-out':
      return easeOutQuad;
    case 'ease-in-out':
      return easeInOutQuad;
    default:
      return (t) => t;
  }
}

/**
 * 経過時間と設定時間・イージングから進行度 (0.0〜1.0) を計算
 */
export function calculateSlideTransitionProgress(
  elapsedMs: number,
  durationMs: number,
  easing?: string,
): number {
  if (durationMs <= 0) return 1;
  const clamped = Math.max(0, Math.min(1, elapsedMs / durationMs));
  return getEasingFunction(easing)(clamped);
}

export interface SlideTransitionSlice {
  updateSlideTransition: (
    slideId: string,
    params: Partial<Pick<Slide, 'transitionDurationMs' | 'pauseMs' | 'easing'>>,
  ) => void;
}

export const createSlideTransitionSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideTransitionSlice
> = (set) => ({
  updateSlideTransition: (slideId, params) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        ...params,
      })),
      isDirty: true,
    })),
});
