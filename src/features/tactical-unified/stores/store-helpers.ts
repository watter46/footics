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

export function recordHistory(s: {
  project: { slides: Slide[] };
  past: Slide[][];
}): {
  past: Slide[][];
  future: Slide[][];
} {
  const snapshot = structuredClone(s.project.slides);
  const nextPast = [...s.past, snapshot];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.splice(0, nextPast.length - MAX_HISTORY);
  }
  return {
    past: nextPast,
    future: [],
  };
}
