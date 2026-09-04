import type { AspectRatio, Slide } from '@/lib/types/tactical-unified';
import {
  DEFAULT_BOUNDARY_BOX_FULL,
  transformCoord,
  transformPoints,
} from '@/lib/types/tactical-unified';

export function transformSlideAspectRatio(
  slide: Slide,
  from: AspectRatio,
  to: AspectRatio,
): Slide {
  return {
    ...slide,
    aspectRatio: to,
    boundaryBox: { ...DEFAULT_BOUNDARY_BOX_FULL },
    players: slide.players.map((p) => ({
      ...p,
      ...transformCoord({ x: p.x, y: p.y }, from, to),
      trajectory: p.trajectory
        ? {
            ...p.trajectory,
            controlPoint: p.trajectory.controlPoint
              ? transformCoord(p.trajectory.controlPoint, from, to)
              : undefined,
          }
        : undefined,
    })),
    arrows: slide.arrows.map((a) => ({
      ...a,
      points: transformPoints(a.points, from, to),
      controlPoint: a.controlPoint
        ? transformCoord(a.controlPoint, from, to)
        : undefined,
    })),
    zones: slide.zones.map((z) => ({
      ...z,
      points: transformPoints(z.points, from, to),
    })),
    texts: slide.texts.map((t) => ({
      ...t,
      ...transformCoord({ x: t.x, y: t.y }, from, to),
    })),
    ball: {
      ...slide.ball,
      ...transformCoord({ x: slide.ball.x, y: slide.ball.y }, from, to),
      trajectory: slide.ball.trajectory
        ? {
            ...slide.ball.trajectory,
            controlPoint: slide.ball.trajectory.controlPoint
              ? transformCoord(slide.ball.trajectory.controlPoint, from, to)
              : undefined,
          }
        : undefined,
    },
  };
}
