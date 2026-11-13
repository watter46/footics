import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { DEFAULT_BOUNDARY_BOX_16_9 } from '@/lib/types/tactical/slide';

export function createFreshSlide(
  templateSlide?: DomainSlide,
  index = 0,
  label = `Scene ${index + 1}`,
): DomainSlide {
  if (templateSlide) {
    return {
      id: crypto.randomUUID(),
      index,
      label,
      players: templateSlide.players.map((p) =>
        p.area === 'pitch'
          ? {
              ...p,
              connectLines: [],
              badges: [],
              visionCone: undefined,
              focus: undefined,
              trajectory: undefined,
            }
          : { ...p },
      ),
      arrows: [],
      zones: [],
      texts: [],
      ball: { ...templateSlide.ball, trajectory: undefined },
      transitionDurationMs: templateSlide.transitionDurationMs,
      pauseMs: templateSlide.pauseMs,
      easing: templateSlide.easing,
      cameraTransitionMode: templateSlide.cameraTransitionMode,
      cameraDurationMs: templateSlide.cameraDurationMs,
      pitchTransform: templateSlide.pitchTransform
        ? { ...templateSlide.pitchTransform }
        : undefined,
      isSidesSwapped: templateSlide.isSidesSwapped,
    };
  }

  return {
    id: crypto.randomUUID(),
    index,
    label,
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: clampToScreenNorm(50),
      y: clampToScreenNorm(50),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'ease-in-out',
  };
}

import { transformSlideForAspect } from './aspect-transform';
import {
  applyImageBackgroundToPhase,
  restoreDefaultPitchInPhase,
} from './background-image';
import {
  computeAutoFitBoundaryBox,
  computeXMediaPresetBoundaryBox,
} from './boundary-box';
import type { TacticalCommand } from './commands';

export function handleChangePhaseAspectRatio(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'CHANGE_PHASE_ASPECT_RATIO' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase || targetPhase.aspectRatio === command.aspectRatio) {
    return project;
  }
  const oldRatio = targetPhase.aspectRatio;
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id !== command.phaseId
        ? p
        : {
            ...p,
            aspectRatio: command.aspectRatio,
            slides: p.slides.map((s) =>
              transformSlideForAspect(s, oldRatio, command.aspectRatio),
            ),
          },
    ),
    updatedAt: now,
  };
}

export function handleApplyImageBackground(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'APPLY_IMAGE_BACKGROUND' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;
  const { phase: updatedPhase } = applyImageBackgroundToPhase(
    targetPhase,
    command.url,
    command.slideId,
    () => command.newSlideId ?? crypto.randomUUID(),
  );
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id === command.phaseId ? updatedPhase : p,
    ),
    updatedAt: now,
  };
}

export function handleRestoreDefaultPitch(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'RESTORE_DEFAULT_PITCH' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id === command.phaseId ? restoreDefaultPitchInPhase(p) : p,
    ),
    updatedAt: now,
  };
}

export function handleAutoFitBoundaryBox(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'AUTO_FIT_BOUNDARY_BOX' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;
  const slide = command.slideId
    ? targetPhase.slides.find((s) => s.id === command.slideId)
    : targetPhase.slides[0];
  const box = computeAutoFitBoundaryBox({
    aspectRatio: targetPhase.aspectRatio,
    backgroundType: targetPhase.backgroundType,
    pitchTransform: slide?.pitchTransform,
    pitchRect: command.pitchRect,
  });
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id === command.phaseId ? { ...p, boundaryBox: box } : p,
    ),
    updatedAt: now,
  };
}

export function handleApplyXMediaPreset(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'APPLY_X_MEDIA_PRESET' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;
  const box = computeXMediaPresetBoundaryBox(
    command.presetKey,
    targetPhase.aspectRatio,
  );
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id === command.phaseId ? { ...p, boundaryBox: box } : p,
    ),
    updatedAt: now,
  };
}

export function handleCenterPitchAndBoundary(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'CENTER_PITCH_AND_BOUNDARY' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id !== command.phaseId
        ? p
        : {
            ...p,
            boundaryBox: { ...DEFAULT_BOUNDARY_BOX_16_9 },
            slides: p.slides.map((s) =>
              s.id !== command.slideId
                ? s
                : {
                    ...s,
                    pitchTransform: {
                      panX: 0,
                      panY: 0,
                      zoom: 1,
                      tilt: 0,
                      yaw: 90,
                      isLocked: s.pitchTransform?.isLocked ?? true,
                    },
                  },
            ),
          },
    ),
    updatedAt: now,
  };
}

export function handleApplyPlayerStyleToPhaseSlides(
  project: DomainTacticalProject,
  command: Extract<
    TacticalCommand,
    { type: 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES' }
  >,
  now: string,
): DomainTacticalProject {
  if (!project.phases.some((p) => p.id === command.phaseId)) return project;
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id !== command.phaseId
        ? p
        : {
            ...p,
            slides: p.slides.map((s) => ({
              ...s,
              players: s.players.map((pl) =>
                command.targetTeam === 'both' || pl.team === command.targetTeam
                  ? { ...pl, style: { ...pl.style, ...command.stylePatch } }
                  : pl,
              ),
            })),
          },
    ),
    updatedAt: now,
  };
}

export function handleApplyBallScaleToPhaseSlides(
  project: DomainTacticalProject,
  command: Extract<
    TacticalCommand,
    { type: 'APPLY_BALL_SCALE_TO_PHASE_SLIDES' }
  >,
  now: string,
): DomainTacticalProject {
  if (!project.phases.some((p) => p.id === command.phaseId)) return project;
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id !== command.phaseId
        ? p
        : {
            ...p,
            slides: p.slides.map((s) => ({
              ...s,
              ball: { ...s.ball, sizeScale: command.sizeScale },
            })),
          },
    ),
    updatedAt: now,
  };
}
