import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import type { TacticalCommand } from './commands';
import { applySlideCommand } from './slide-reducer';

function createFreshSlide(
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

/**
 * TacticalCommand をプロジェクト階層に適用する純粋レデューサー。
 * 最低1フェーズ、各フェーズ最低1スライドの不変条件を厳格に維持する。
 */
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

    case 'ADD_SLIDE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      if (!targetPhase) return project;

      const targetIndex = command.afterSlideId
        ? targetPhase.slides.findIndex((s) => s.id === command.afterSlideId)
        : -1;
      const template =
        targetIndex !== -1
          ? targetPhase.slides[targetIndex]
          : targetPhase.slides[targetPhase.slides.length - 1];

      const newSlide = createFreshSlide(template, targetPhase.slides.length);
      const nextSlides = [...targetPhase.slides];
      if (targetIndex !== -1) {
        nextSlides.splice(targetIndex + 1, 0, newSlide);
      } else {
        nextSlides.push(newSlide);
      }

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

    case 'DUPLICATE_SLIDE': {
      const targetPhase = project.phases.find((p) => p.id === command.phaseId);
      const targetIndex =
        targetPhase?.slides.findIndex((s) => s.id === command.slideId) ?? -1;
      if (!targetPhase || targetIndex === -1) return project;

      const targetSlide = targetPhase.slides[targetIndex];
      const duplicated: DomainSlide = {
        ...targetSlide,
        id: crypto.randomUUID(),
        label: targetSlide.label ? `${targetSlide.label} (copy)` : undefined,
        players: targetSlide.players.map((p) => ({ ...p })),
        arrows: targetSlide.arrows.map((a) => ({ ...a })),
        zones: targetSlide.zones.map((z) => ({ ...z })),
        texts: targetSlide.texts.map((t) => ({ ...t })),
        ball: { ...targetSlide.ball },
      };

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

    case 'ADD_PHASE': {
      const firstPhase = project.phases[0];
      const sourceSlide = firstPhase?.slides[0];
      const newPhase: DomainTacticalPhase = {
        id: crypto.randomUUID(),
        name: command.name,
        aspectRatio: firstPhase?.aspectRatio ?? '4:5',
        boundaryBox: firstPhase?.boundaryBox ?? {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          enabled: true,
          visible: false,
          fitTarget: 'pitch',
        },
        backgroundType: 'pitch',
        slides: [createFreshSlide(sourceSlide, 0, 'Scene 1')],
      };

      return {
        ...project,
        phases: [...project.phases, newPhase],
        updatedAt: now,
      };
    }

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

    case 'UPDATE_PROJECT_META':
      return {
        ...project,
        ...command.patch,
        updatedAt: now,
      };
  }
}
