import type { Slide, TacticalProject } from '@/lib/types/tactical-unified';
import type { SelectedObject } from './tool-slice';

export interface SelectorStateContext {
  project: TacticalProject;
  activeSlideId: string;
  selectedObjects: SelectedObject[];
  past: Slide[][];
  future: Slide[][];
}

/** アクティブスライドを取得 */
export const selectActiveSlide = <
  T extends Pick<SelectorStateContext, 'project' | 'activeSlideId'>,
>(
  s: T,
): Slide | undefined =>
  s.project.slides.find((sl) => sl.id === s.activeSlideId);

/** 直前のスライドを取得 (先頭スライドの場合は null) */
export const selectPreviousSlide = <
  T extends Pick<SelectorStateContext, 'project' | 'activeSlideId'>,
>(
  s: T,
): Slide | null => {
  const idx = s.project.slides.findIndex((sl) => sl.id === s.activeSlideId);
  return idx > 0 ? (s.project.slides[idx - 1] ?? null) : null;
};

/** 選択中の単一オブジェクトID */
export const selectSingleSelectedId = <
  T extends Pick<SelectorStateContext, 'selectedObjects'>,
>(
  s: T,
): string | null =>
  s.selectedObjects.length === 1 ? (s.selectedObjects[0]?.id ?? null) : null;

/** スライドが複数あるか */
export const selectIsMultiSlide = <
  T extends Pick<SelectorStateContext, 'project'>,
>(
  s: T,
): boolean => s.project.slides.length > 1;

/** Undo 可能か */
export const selectCanUndo = <T extends Pick<SelectorStateContext, 'past'>>(
  s: T,
): boolean => s.past.length > 0;

/** Redo 可能か */
export const selectCanRedo = <T extends Pick<SelectorStateContext, 'future'>>(
  s: T,
): boolean => s.future.length > 0;
