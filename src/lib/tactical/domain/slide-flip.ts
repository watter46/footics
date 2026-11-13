import {
  clampToScreenNorm,
  type ScreenNormCoord,
  type ScreenNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

const flipCoord = (c: ScreenNormCoord | number) => clampToScreenNorm(100 - c);
const flipPt = (pt: ScreenNormPoint) =>
  toScreenNormPoint(100 - pt.x, 100 - pt.y);

function flipZone(z: DomainZoneAnnotation): DomainZoneAnnotation {
  if (z.shapeType === 'polygon') {
    return {
      ...z,
      points: z.points.map(flipPt),
    };
  }
  return {
    ...z,
    x: flipCoord(z.x + z.width),
    y: flipCoord(z.y + z.height),
  };
}

export function flipSlideCandidate(slide: DomainSlide): DomainSlide {
  const players = slide.players.map((p) => {
    if (p.area === 'bench') return p;
    const cp = p.trajectory?.controlPoint;
    return {
      ...p,
      x: flipCoord(p.x),
      y: flipCoord(p.y),
      trajectory: p.trajectory
        ? { ...p.trajectory, controlPoint: cp ? flipPt(cp) : undefined }
        : undefined,
    };
  });

  const arrows = slide.arrows.map((a) => ({
    ...a,
    points: a.points.map(flipPt),
    controlPoint: a.controlPoint ? flipPt(a.controlPoint) : undefined,
  }));

  const zones = slide.zones.map(flipZone);

  const texts = slide.texts.map((t) => ({
    ...t,
    x: flipCoord(t.x),
    y: flipCoord(t.y),
  }));

  const ballCp = slide.ball.trajectory?.controlPoint;
  const ball = {
    ...slide.ball,
    x: flipCoord(slide.ball.x),
    y: flipCoord(slide.ball.y),
    trajectory: slide.ball.trajectory
      ? {
          ...slide.ball.trajectory,
          controlPoint: ballCp ? flipPt(ballCp) : undefined,
        }
      : undefined,
  };

  return {
    ...slide,
    players,
    arrows,
    zones,
    texts,
    ball,
    isSidesSwapped: !slide.isSidesSwapped,
  };
}
