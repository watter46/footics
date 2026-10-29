import type {
  Slide,
  TacticalPhase,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import type { SelectedObject } from './tool-slice';

export interface SelectorStateContext {
  project: TacticalProject;
  activePhaseId?: string;
  activeSlideId: string;
  selectedObjects: SelectedObject[];
  past: TacticalPhase[][];
  future: TacticalPhase[][];
}

/** アクティブ Phase を取得 */
export const selectActivePhase = <
  T extends Pick<SelectorStateContext, 'project'> & { activePhaseId?: string },
>(
  s: T,
): TacticalPhase | undefined => {
  const activeId = s.activePhaseId ?? s.project.activePhaseId;
  return s.project.phases.find((p) => p.id === activeId) ?? s.project.phases[0];
};

/** アクティブ Phase 配下のスライド配列を取得 (空なら []) */
export const selectActivePhaseSlides = <
  T extends Pick<SelectorStateContext, 'project'> & { activePhaseId?: string },
>(
  s: T,
): Slide[] => {
  return selectActivePhase(s)?.slides ?? [];
};

/** アクティブスライドを取得 (アクティブ Phase 優先、全 Phase フォールバック) */
export const selectActiveSlide = <
  T extends Pick<SelectorStateContext, 'project' | 'activeSlideId'> & {
    activePhaseId?: string;
  },
>(
  s: T,
): Slide | undefined => {
  const activePhase = selectActivePhase(s);
  const inActive = activePhase?.slides.find((sl) => sl.id === s.activeSlideId);
  if (inActive) return inActive;
  for (const phase of s.project.phases) {
    const found = phase.slides.find((sl) => sl.id === s.activeSlideId);
    if (found) return found;
  }
  return undefined;
};

/** 直前のスライドを取得 (アクティブ Phase 内でアクティブスライドの1つ前。先頭スライドなら null) */
export const selectPreviousSlide = <
  T extends Pick<SelectorStateContext, 'project' | 'activeSlideId'> & {
    activePhaseId?: string;
  },
>(
  s: T,
): Slide | null => {
  const slides = selectActivePhaseSlides(s);
  const idx = slides.findIndex((sl) => sl.id === s.activeSlideId);
  return idx > 0 ? (slides[idx - 1] ?? null) : null;
};

/** 選択中の単一オブジェクトID */
export const selectSingleSelectedId = <
  T extends Pick<SelectorStateContext, 'selectedObjects'>,
>(
  s: T,
): string | null =>
  s.selectedObjects.length === 1 ? (s.selectedObjects[0]?.id ?? null) : null;

/** アクティブ Phase のスライドが複数あるか */
export const selectIsMultiSlide = <
  T extends Pick<SelectorStateContext, 'project'> & { activePhaseId?: string },
>(
  s: T,
): boolean => selectActivePhaseSlides(s).length > 1;

/** Undo 可能か */
export const selectCanUndo = <T extends Pick<SelectorStateContext, 'past'>>(
  s: T,
): boolean => s.past.length > 0;

/** Redo 可能か */
export const selectCanRedo = <T extends Pick<SelectorStateContext, 'future'>>(
  s: T,
): boolean => s.future.length > 0;
