import { produce } from 'immer';
import type {
  Slide,
  TacticalPhase,
  TacticalProject,
} from '@/lib/types/tactical-unified';

export const MAX_HISTORY = 50;

export function attachSlidesGetter(project: TacticalProject): TacticalProject {
  if (!project) return project;
  const existingDesc = Object.getOwnPropertyDescriptor(project, 'slides');
  if (existingDesc?.get) {
    return project;
  }
  const target = Object.isExtensible(project) ? project : { ...project };
  try {
    Object.defineProperty(target, 'slides', {
      get(this: TacticalProject) {
        return (
          this.phases?.find((p) => p.id === this.activePhaseId)?.slides ??
          this.phases?.[0]?.slides ??
          []
        );
      },
      enumerable: false,
      configurable: true,
    });
  } catch {
    // ignore
  }
  return target;
}

export function getSlide(
  project: TacticalProject,
  slideId: string,
): Slide | undefined {
  if (project.activePhaseId) {
    const activePhase = project.phases.find(
      (p) => p.id === project.activePhaseId,
    );
    const slide = activePhase?.slides.find((s) => s.id === slideId);
    if (slide) return slide;
  }
  for (const phase of project.phases) {
    const slide = phase.slides.find((s) => s.id === slideId);
    if (slide) return slide;
  }
  return undefined;
}

export function updateSlideInProject(
  project: TacticalProject,
  slideId: string,
  updater: (slide: Slide) => Slide,
): TacticalProject {
  let slideFound = false;
  const nextPhases = project.phases.map((phase) => {
    if (!phase.slides.some((s) => s.id === slideId)) {
      return phase;
    }
    slideFound = true;
    return {
      ...phase,
      slides: phase.slides.map((s) => (s.id === slideId ? updater(s) : s)),
    };
  });

  if (!slideFound) return project;

  return attachSlidesGetter({
    ...project,
    updatedAt: new Date().toISOString(),
    phases: nextPhases,
  });
}

export function updateSlideImmer(
  project: TacticalProject,
  slideId: string,
  recipe: (draft: Slide) => void,
): TacticalProject {
  let slideFound = false;
  const next = produce(project, (draft) => {
    for (const phase of draft.phases) {
      const slide = phase.slides.find((s) => s.id === slideId);
      if (slide) {
        recipe(slide as Slide);
        draft.updatedAt = new Date().toISOString();
        slideFound = true;
        break;
      }
    }
  });
  if (!slideFound) return project;
  return attachSlidesGetter(next);
}

export function cloneSlideShallow(slide: Slide): Slide {
  return {
    ...slide,
    players: slide.players.map((p) => ({
      ...p,
      connectLines: p.connectLines.map((cl) => ({ ...cl })),
      style: { ...p.style },
      badges: p.badges ? p.badges.map((b) => ({ ...b })) : [],
      visionCone: p.visionCone ? { ...p.visionCone } : undefined,
      focus: p.focus ? { ...p.focus } : undefined,
      trajectory: p.trajectory
        ? {
            ...p.trajectory,
            controlPoint: p.trajectory.controlPoint
              ? { ...p.trajectory.controlPoint }
              : undefined,
          }
        : undefined,
    })),
    arrows: slide.arrows.map((a) => ({
      ...a,
      points: a.points.map((pt) => ({ ...pt })),
      controlPoint: a.controlPoint ? { ...a.controlPoint } : undefined,
    })),
    zones: slide.zones.map((z) => ({
      ...z,
      points: z.points.map((pt) => ({ ...pt })),
    })),
    texts: slide.texts.map((t) => ({ ...t })),
    pitchTransform: slide.pitchTransform
      ? { ...slide.pitchTransform }
      : undefined,
    boundaryBox: slide.boundaryBox ? { ...slide.boundaryBox } : undefined,
    ball: {
      ...slide.ball,
      trajectory: slide.ball.trajectory
        ? {
            ...slide.ball.trajectory,
            controlPoint: slide.ball.trajectory.controlPoint
              ? { ...slide.ball.trajectory.controlPoint }
              : undefined,
          }
        : undefined,
    },
  };
}

export function cloneSlidesShallow(slides: Slide[]): Slide[] {
  return slides.map(cloneSlideShallow);
}

export function clonePhaseShallow(phase: TacticalPhase): TacticalPhase {
  return {
    ...phase,
    slides: cloneSlidesShallow(phase.slides),
  };
}

export function clonePhasesShallow(phases: TacticalPhase[]): TacticalPhase[] {
  return phases.map(clonePhaseShallow);
}

export function recordHistory(s: {
  project: { phases: TacticalPhase[] };
  past: TacticalPhase[][];
}): {
  past: TacticalPhase[][];
  future: TacticalPhase[][];
} {
  const snapshot = clonePhasesShallow(s.project.phases);
  const nextPast = [...s.past, snapshot];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.splice(0, nextPast.length - MAX_HISTORY);
  }
  return {
    past: nextPast,
    future: [],
  };
}
