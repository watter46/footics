import { produce } from 'immer';
import type { Slide, TacticalProject } from '@/lib/types/tactical-unified';

export const MAX_HISTORY = 50;

export function getSlide(
  project: TacticalProject,
  slideId: string,
): Slide | undefined {
  return project.slides.find((s) => s.id === slideId);
}

export function updateSlideInProject(
  project: TacticalProject,
  slideId: string,
  updater: (slide: Slide) => Slide,
): TacticalProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    slides: project.slides.map((s) => (s.id === slideId ? updater(s) : s)),
  };
}

export function updateSlideImmer(
  project: TacticalProject,
  slideId: string,
  recipe: (draft: Slide) => void,
): TacticalProject {
  return produce(project, (draft) => {
    const slide = draft.slides.find((s) => s.id === slideId);
    if (slide) {
      recipe(slide as Slide);
      draft.updatedAt = new Date().toISOString();
    }
  });
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

export function recordHistory(s: {
  project: { slides: Slide[] };
  past: Slide[][];
}): {
  past: Slide[][];
  future: Slide[][];
} {
  const snapshot = cloneSlidesShallow(s.project.slides);
  const nextPast = [...s.past, snapshot];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.splice(0, nextPast.length - MAX_HISTORY);
  }
  return {
    past: nextPast,
    future: [],
  };
}
