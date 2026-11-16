import type {
  DirectorCameraTrack,
  PitchTransform,
} from '@/lib/types/tactical/camera-config';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  type BoundaryBox,
  DEFAULT_BOUNDARY_BOX_4_5,
  type PitchAppearanceConfig,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical/pitch-config';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { SelectedObject, TeamVisibility } from './session-ui-state';

export interface DomainRenderSnapshot {
  readonly activePhase: DomainTacticalPhase | undefined;
  readonly slides: readonly DomainSlide[];
  readonly activeSlide: DomainSlide | undefined;
  readonly aspectRatio: AspectRatio;
  readonly boundaryBox: BoundaryBox;
  readonly pitchTransform: PitchTransform | null;
  readonly directorCamera: DirectorCameraTrack | null;
  readonly pitchAppearance: PitchAppearanceConfig;
  readonly screenBackground: ScreenBackgroundConfig;
  readonly teamVisibility: TeamVisibility;
}

export function selectDomainActivePhase(
  project: DomainTacticalProject,
  activePhaseId: string,
): DomainTacticalPhase | undefined {
  const { phases } = project;
  if (!phases || phases.length === 0) return undefined;
  return phases.find((p) => p.id === activePhaseId) ?? phases[0];
}

export function selectDomainActivePhaseSlides(
  project: DomainTacticalProject,
  activePhaseId: string,
): readonly DomainSlide[] {
  return selectDomainActivePhase(project, activePhaseId)?.slides ?? [];
}

export function selectDomainActiveSlide(
  project: DomainTacticalProject,
  activePhaseId: string,
  activeSlideId: string,
): DomainSlide | undefined {
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const inActive = activePhase?.slides.find((sl) => sl.id === activeSlideId);
  if (inActive) return inActive;
  for (const phase of project.phases) {
    const found = phase.slides.find((sl) => sl.id === activeSlideId);
    if (found) return found;
  }
  return activePhase?.slides[0];
}

export function selectDomainPreviousSlide(
  project: DomainTacticalProject,
  activePhaseId: string,
  activeSlideId: string,
): DomainSlide | null {
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
  const idx = slides.findIndex((sl) => sl.id === activeSlideId);
  return idx > 0 ? (slides[idx - 1] ?? null) : null;
}

export function selectDomainActivePhaseAspectRatio(
  project: DomainTacticalProject,
  activePhaseId: string,
): AspectRatio {
  return selectDomainActivePhase(project, activePhaseId)?.aspectRatio ?? '4:5';
}

export function selectDomainActiveBoundaryBox(
  project: DomainTacticalProject,
  activePhaseId: string,
): BoundaryBox {
  return (
    selectDomainActivePhase(project, activePhaseId)?.boundaryBox ??
    DEFAULT_BOUNDARY_BOX_4_5
  );
}

export function selectDomainRenderSnapshot(
  project: DomainTacticalProject,
  activePhaseId: string,
  activeSlideId: string,
  teamVisibility: TeamVisibility = 'both',
): DomainRenderSnapshot {
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  return {
    activePhase,
    slides: activePhase?.slides ?? [],
    activeSlide,
    aspectRatio: activePhase?.aspectRatio ?? '4:5',
    boundaryBox: activePhase?.boundaryBox ?? DEFAULT_BOUNDARY_BOX_4_5,
    pitchTransform: activeSlide?.pitchTransform ?? null,
    directorCamera: activePhase?.directorCamera ?? null,
    pitchAppearance: project.pitchAppearance,
    screenBackground: project.screenBackground,
    teamVisibility,
  };
}

export function selectDomainIsMultiSlide(
  project: DomainTacticalProject,
  activePhaseId: string,
): boolean {
  return selectDomainActivePhaseSlides(project, activePhaseId).length > 1;
}

export function selectDomainSingleSelectedId(
  selectedObjects: readonly SelectedObject[],
): string | null {
  return selectedObjects.length === 1 ? (selectedObjects[0]?.id ?? null) : null;
}
