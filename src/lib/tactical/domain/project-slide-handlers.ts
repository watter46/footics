import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { getDefaultBoundaryBoxForAspect } from '@/lib/types/tactical/pitch-config';
import type { TacticalCommand } from './commands';
import { createDefaultDomainPlayers } from './default-players';
import { createFreshSlide } from './project-phase-handlers';
import { resetSlideKeepSquadPositions } from './slide-reset';

export function duplicateSlideInPhase(
  targetSlide: DomainSlide,
  index: number,
  newSlideId?: string,
): DomainSlide {
  const cloned = structuredClone(targetSlide);
  return {
    ...cloned,
    id: newSlideId ?? crypto.randomUUID(),
    index,
    label: targetSlide.label ? `${targetSlide.label} (copy)` : 'Scene (copy)',
    players: cloned.players.map((p) =>
      p.area === 'pitch' ? { ...p, trajectory: undefined } : p,
    ),
    ball: { ...cloned.ball, trajectory: undefined },
  };
}

export function handleAddSlide(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'ADD_SLIDE' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;

  const targetIndex = command.afterSlideId
    ? targetPhase.slides.findIndex((s) => s.id === command.afterSlideId)
    : -1;
  const template =
    targetIndex !== -1
      ? targetPhase.slides[targetIndex]
      : targetPhase.slides[targetPhase.slides.length - 1];
  const mode = command.mode ?? 'object-free';
  const count = targetPhase.slides.length;

  let newSlide: DomainSlide;
  if (mode === 'full' && template) {
    newSlide = duplicateSlideInPhase(template, count, command.newSlideId);
  } else if (mode === 'blank') {
    newSlide = {
      ...createFreshSlide(
        undefined,
        count,
        `Scene ${count + 1}`,
        command.newSlideId,
      ),
      players: createDefaultDomainPlayers(
        project.homeColor.primary,
        project.awayColor.primary,
        targetPhase.aspectRatio,
      ),
    };
  } else {
    newSlide = createFreshSlide(
      template,
      count,
      `Scene ${count + 1}`,
      command.newSlideId,
    );
  }

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
        ? { ...p, slides: nextSlides.map((s, idx) => ({ ...s, index: idx })) }
        : p,
    ),
    updatedAt: now,
  };
}

export function handleAddPhase(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'ADD_PHASE' }>,
  now: string,
): DomainTacticalProject {
  const firstPhase = project.phases[0];
  const sourceSlide = firstPhase?.slides[0];
  const aspectRatio = firstPhase?.aspectRatio ?? '4:5';
  const boundaryBox =
    firstPhase?.boundaryBox ?? getDefaultBoundaryBoxForAspect(aspectRatio);

  let initialSlide: DomainSlide;
  if (sourceSlide && (project.matchId || project.matchFormations)) {
    const reset = resetSlideKeepSquadPositions(
      sourceSlide,
      aspectRatio,
      project.matchFormations,
    );
    initialSlide = {
      ...reset,
      id: command.newSlideId ?? crypto.randomUUID(),
      index: 0,
      label: 'Scene 1',
    };
  } else {
    initialSlide = createFreshSlide(
      sourceSlide,
      0,
      'Scene 1',
      command.newSlideId,
    );
  }

  const newPhase: DomainTacticalPhase = {
    id: command.newPhaseId ?? crypto.randomUUID(),
    name: command.name,
    aspectRatio,
    boundaryBox,
    backgroundType: 'pitch',
    slides: [initialSlide],
  };

  return {
    ...project,
    phases: [...project.phases, newPhase],
    updatedAt: now,
  };
}

export function handleResetSlideKeepSquad(
  project: DomainTacticalProject,
  command: Extract<TacticalCommand, { type: 'RESET_SLIDE_KEEP_SQUAD' }>,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;
  const hasSlide = targetPhase.slides.some((s) => s.id === command.slideId);
  if (!hasSlide) return project;

  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id !== command.phaseId
        ? p
        : {
            ...p,
            boundaryBox: getDefaultBoundaryBoxForAspect(p.aspectRatio),
            slides: p.slides.map((s) =>
              s.id !== command.slideId
                ? s
                : resetSlideKeepSquadPositions(
                    s,
                    p.aspectRatio,
                    project.matchFormations,
                  ),
            ),
          },
    ),
    updatedAt: now,
  };
}
