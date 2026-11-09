import {
  type AspectRatio,
  type BoundaryBox,
  DEFAULT_BOUNDARY_BOX_16_9,
  type DirectorCameraTrack,
  type PitchAppearanceConfig,
  type PitchTransform,
  type ScreenBackgroundConfig,
  type Slide,
  type TacticalPhase,
  type TacticalProject,
} from '@/lib/types/tactical-unified';
import type { SelectedObject } from './tool-slice';

export interface SelectorStateContext {
  project: TacticalProject;
  activePhaseId?: string;
  activeSlideId: string;
  selectedObjects: SelectedObject[];
  past: TacticalPhase[][];
  future: TacticalPhase[][];
  teamVisibility?: 'both' | 'home' | 'away';
}

export interface TacticalRenderSnapshot {
  slides: Slide[];
  activeSlide: Slide | undefined;
  aspectRatio: AspectRatio;
  boundaryBox: BoundaryBox;
  pitchTransform: PitchTransform | null;
  directorCamera: DirectorCameraTrack | null;
  pitchAppearance: PitchAppearanceConfig | undefined;
  screenBackground: ScreenBackgroundConfig | undefined;
  teamVisibility: 'both' | 'home' | 'away';
}

/** アクティブ Phase を取得 */
export const selectActivePhase = <
  T extends Pick<SelectorStateContext, 'project'> & { activePhaseId?: string },
>(
  s: T,
): TacticalPhase | undefined => {
  const phases = s.project?.phases;
  if (!phases || !Array.isArray(phases) || phases.length === 0) {
    return undefined;
  }
  const activeId = s.activePhaseId ?? s.project?.activePhaseId;
  return phases.find((p) => p.id === activeId) ?? phases[0];
};

/** アクティブ Phase の aspectRatio を取得 (Phase -> Project -> '16:9') */
export const selectActivePhaseAspectRatio = <
  T extends Pick<SelectorStateContext, 'project'> & { activePhaseId?: string },
>(
  s: T,
): AspectRatio => {
  const activePhase = selectActivePhase(s);
  return activePhase?.aspectRatio ?? s.project?.aspectRatio ?? '16:9';
};

/** アクティブな境界線を取得 (Slide -> Phase -> Project -> DEFAULT_BOUNDARY_BOX_16_9) */
export const selectActiveBoundaryBox = <
  T extends Pick<SelectorStateContext, 'project'> & {
    activePhaseId?: string;
    activeSlideId?: string;
  },
>(
  s: T,
): BoundaryBox => {
  const activePhase = selectActivePhase(s);
  const activeSlide =
    s.activeSlideId != null
      ? selectActiveSlide({
          project: s.project,
          activePhaseId: s.activePhaseId,
          activeSlideId: s.activeSlideId,
        })
      : activePhase?.slides?.[0];
  return (
    activeSlide?.boundaryBox ??
    activePhase?.boundaryBox ??
    s.project?.boundaryBox ??
    DEFAULT_BOUNDARY_BOX_16_9
  );
};

/** アクティブ Phase の boundaryBox を取得 (後方互換: 内部で selectActiveBoundaryBox を呼び出し) */
export const selectActivePhaseBoundaryBox = <
  T extends Pick<SelectorStateContext, 'project'> & {
    activePhaseId?: string;
    activeSlideId?: string;
  },
>(
  s: T,
): BoundaryBox => selectActiveBoundaryBox(s);

/** 単一描画スナップショットを取得 */
export const selectTacticalRenderSnapshot = <
  T extends Pick<SelectorStateContext, 'project' | 'activeSlideId'> & {
    activePhaseId?: string;
    teamVisibility?: 'both' | 'home' | 'away';
  },
>(
  s: T,
): TacticalRenderSnapshot => {
  const activePhase = selectActivePhase(s);
  const activeSlide = selectActiveSlide(s);
  return {
    slides: activePhase?.slides ?? [],
    activeSlide,
    aspectRatio: activePhase?.aspectRatio ?? s.project?.aspectRatio ?? '16:9',
    boundaryBox: selectActiveBoundaryBox(s),
    pitchTransform: activeSlide?.pitchTransform ?? null,
    directorCamera: activePhase?.directorCamera ?? null,
    pitchAppearance: s.project?.pitchAppearance,
    screenBackground: s.project?.screenBackground,
    teamVisibility: s.teamVisibility ?? 'both',
  };
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
  const inActive = activePhase?.slides?.find((sl) => sl.id === s.activeSlideId);
  if (inActive) return inActive;
  const phases = s.project?.phases ?? [];
  for (const phase of phases) {
    const found = phase.slides?.find((sl) => sl.id === s.activeSlideId);
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
