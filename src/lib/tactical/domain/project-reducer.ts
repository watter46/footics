import type {
  DomainSlide,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import type { TacticalCommand } from './commands';
import { handleDirectorCameraCommand } from './director-camera';
import {
  handleApplyBallScaleToPhaseSlides,
  handleApplyImageBackground,
  handleApplyPlayerStyleToPhaseSlides,
  handleApplyXMediaPreset,
  handleAutoFitBoundaryBox,
  handleCenterPitchAndBoundary,
  handleChangePhaseAspectRatio,
  handleRestoreDefaultPitch,
} from './project-phase-handlers';
import {
  duplicateSlideInPhase,
  handleAddPhase,
  handleAddSlide,
  handleResetSlideKeepSquad,
} from './project-slide-handlers';
import { applySlideCommand } from './slide-reducer';

/** TacticalCommand をプロジェクト階層に適用する純粋レデューサー。 */
export function applyTacticalCommand(
  project: DomainTacticalProject,
  command: TacticalCommand,
): DomainTacticalProject {
  const now = new Date().toISOString();

  switch (command.type) {
    case 'APPLY_SLIDE_COMMAND': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      const targetSlide = targetPhase?.slides.find(
        (s) => s.id === command.slideId,
      );
      if (!targetPhase || !targetSlide) return project;

      const updatedSlide = applySlideCommand(targetSlide, command.command);
      if (updatedSlide === targetSlide) return project;

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId
            ? {
                ...p,
                slides: p.slides.map((s) =>
                  s.id === command.slideId ? updatedSlide : s,
                ),
              }
            : p,
        ),
        updatedAt: now,
      };
    }

    case 'ADD_SLIDE':
      return handleAddSlide(project, command, now);

    case 'DUPLICATE_SLIDE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      const targetIndex =
        targetPhase?.slides.findIndex((s) => s.id === command.slideId) ?? -1;
      if (!targetPhase || targetIndex === -1) return project;

      const duplicated = duplicateSlideInPhase(
        targetPhase.slides[targetIndex],
        targetIndex + 1,
        command.newSlideId,
      );
      const nextSlides = [...targetPhase.slides];
      nextSlides.splice(targetIndex + 1, 0, duplicated);

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId
            ? {
                ...p,
                slides: nextSlides.map((s, idx) => ({ ...s, index: idx })),
              }
            : p,
        ),
        updatedAt: now,
      };
    }

    case 'DELETE_SLIDE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase || targetPhase.slides.length <= 1) return project;

      const nextSlides = targetPhase.slides
        .filter((s) => s.id !== command.slideId)
        .map((s, idx) => ({ ...s, index: idx }));
      if (nextSlides.length === targetPhase.slides.length) return project;

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? { ...p, slides: nextSlides } : p,
        ),
        updatedAt: now,
      };
    }

    case 'REORDER_SLIDES': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;

      const slideMap = new Map(targetPhase.slides.map((s) => [s.id, s]));
      const reordered: DomainSlide[] = [];
      for (const id of command.orderedSlideIds) {
        const s = slideMap.get(id);
        if (s) {
          reordered.push(s);
          slideMap.delete(id);
        }
      }
      for (const s of slideMap.values()) {
        reordered.push(s);
      }

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId
            ? {
                ...p,
                slides: reordered.map((s, idx) => ({ ...s, index: idx })),
              }
            : p,
        ),
        updatedAt: now,
      };
    }

    case 'ADD_PHASE':
      return handleAddPhase(project, command, now);

    case 'UPDATE_PHASE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;

      return {
        ...project,
        phases: project.phases.map((p) =>
          p.id === command.phaseId ? { ...p, ...command.patch } : p,
        ),
        updatedAt: now,
      };
    }

    case 'DELETE_PHASE': {
      if (project.phases.length <= 1) return project;

      const nextPhases = project.phases.filter((p) => p.id !== command.phaseId);
      if (nextPhases.length === project.phases.length) return project;

      return {
        ...project,
        phases: nextPhases,
        updatedAt: now,
      };
    }

    case 'UPDATE_ALL_SLIDE_TRANSITIONS':
      return {
        ...project,
        phases: project.phases.map((p) => ({
          ...p,
          slides: p.slides.map((s) => ({ ...s, ...command.patch })),
        })),
        updatedAt: now,
      };

    case 'CHANGE_PHASE_ASPECT_RATIO':
      return handleChangePhaseAspectRatio(project, command, now);

    case 'APPLY_IMAGE_BACKGROUND':
      return handleApplyImageBackground(project, command, now);

    case 'RESTORE_DEFAULT_PITCH':
      return handleRestoreDefaultPitch(project, command, now);

    case 'RESET_SLIDE_KEEP_SQUAD':
      return handleResetSlideKeepSquad(project, command, now);

    case 'AUTO_FIT_BOUNDARY_BOX':
      return handleAutoFitBoundaryBox(project, command, now);

    case 'APPLY_X_MEDIA_PRESET':
      return handleApplyXMediaPreset(project, command, now);

    case 'CENTER_PITCH_AND_BOUNDARY':
      return handleCenterPitchAndBoundary(project, command, now);

    case 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES':
      return handleApplyPlayerStyleToPhaseSlides(project, command, now);

    case 'APPLY_BALL_SCALE_TO_PHASE_SLIDES':
      return handleApplyBallScaleToPhaseSlides(project, command, now);

    case 'SET_TEAM_COLOR': {
      const colorEntry = {
        primary: command.primary,
        ...(command.secondary ? { secondary: command.secondary } : {}),
      };
      return {
        ...project,
        ...(command.team === 'home'
          ? { homeColor: colorEntry }
          : { awayColor: colorEntry }),
        phases: project.phases.map((p) => ({
          ...p,
          slides: p.slides.map((s) => ({
            ...s,
            players: s.players.map((pl) =>
              pl.team === command.team
                ? { ...pl, style: { ...pl.style, color: command.primary } }
                : pl,
            ),
          })),
        })),
        updatedAt: now,
      };
    }

    case 'UPSERT_GLOBAL_CAMERA_KEYFRAME':
    case 'DELETE_GLOBAL_CAMERA_KEYFRAME':
    case 'UPSERT_ACTION_CAMERA_CUE':
    case 'DELETE_ACTION_CAMERA_CUE':
      return handleDirectorCameraCommand(project, command, now);

    case 'UPDATE_PROJECT_META':
      return {
        ...project,
        ...command.patch,
        updatedAt: now,
      };
  }
}
