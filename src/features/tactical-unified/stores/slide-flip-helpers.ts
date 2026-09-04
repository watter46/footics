import type {
  ArrowAnnotation,
  BallState,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

function flipPlayer(p: Player, isVertical: boolean): Player {
  const x = isVertical ? p.x : Math.max(0, Math.min(100, 100 - p.x));
  const y = isVertical ? Math.max(0, Math.min(100, 100 - p.y)) : p.y;
  const cp = p.trajectory?.controlPoint;
  const flippedCp = cp
    ? {
        x: isVertical ? cp.x : 100 - cp.x,
        y: isVertical ? 100 - cp.y : cp.y,
      }
    : undefined;

  return {
    ...p,
    x,
    y,
    trajectory: p.trajectory
      ? {
          ...p.trajectory,
          controlPoint: flippedCp,
        }
      : undefined,
  };
}

function flipArrow(a: ArrowAnnotation, isVertical: boolean): ArrowAnnotation {
  const points = a.points.map((pt) => ({
    x: isVertical ? pt.x : 100 - pt.x,
    y: isVertical ? 100 - pt.y : pt.y,
  }));
  const cp = a.controlPoint;
  const controlPoint = cp
    ? {
        x: isVertical ? cp.x : 100 - cp.x,
        y: isVertical ? 100 - cp.y : cp.y,
      }
    : undefined;

  return { ...a, points, controlPoint };
}

function flipZone(z: ZoneAnnotation, isVertical: boolean): ZoneAnnotation {
  const points = z.points.map((pt) => ({
    x: isVertical ? pt.x : 100 - pt.x,
    y: isVertical ? 100 - pt.y : pt.y,
  }));
  const x =
    !isVertical && z.x !== undefined && z.width !== undefined
      ? 100 - (z.x + z.width)
      : z.x;
  const y =
    isVertical && z.y !== undefined && z.height !== undefined
      ? 100 - (z.y + z.height)
      : z.y;

  return { ...z, points, x, y };
}

function flipText(t: TextAnnotation, isVertical: boolean): TextAnnotation {
  return {
    ...t,
    x: isVertical ? t.x : 100 - t.x,
    y: isVertical ? 100 - t.y : t.y,
  };
}

function flipBall(ball: BallState, isVertical: boolean): BallState {
  const x = isVertical ? ball.x : 100 - ball.x;
  const y = isVertical ? 100 - ball.y : ball.y;
  const cp = ball.trajectory?.controlPoint;
  const controlPoint = cp
    ? {
        x: isVertical ? cp.x : 100 - cp.x,
        y: isVertical ? 100 - cp.y : cp.y,
      }
    : undefined;

  return {
    ...ball,
    x,
    y,
    trajectory: ball.trajectory
      ? {
          ...ball.trajectory,
          controlPoint,
        }
      : undefined,
  };
}

export function flipSlideObjects(slide: Slide, isVertical: boolean): Slide {
  return {
    ...slide,
    players: slide.players.map((p) => flipPlayer(p, isVertical)),
    arrows: slide.arrows.map((a) => flipArrow(a, isVertical)),
    zones: slide.zones.map((z) => flipZone(z, isVertical)),
    texts: slide.texts.map((t) => flipText(t, isVertical)),
    ball: flipBall(slide.ball, isVertical),
  };
}
