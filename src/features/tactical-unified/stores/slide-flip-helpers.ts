import type {
  ArrowAnnotation,
  AspectRatio,
  BallState,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

export function isVerticalPitch(
  aspectRatio?: AspectRatio | string | null,
): boolean {
  return (
    aspectRatio === '9:16' || aspectRatio === '4:5' || aspectRatio === '1:1'
  );
}

function flipPlayer(p: Player): Player {
  if (p.area === 'bench') {
    return p;
  }
  const x = Math.max(0, Math.min(100, 100 - p.x));
  const y = Math.max(0, Math.min(100, 100 - p.y));
  const cp = p.trajectory?.controlPoint;
  const flippedCp = cp
    ? {
        x: 100 - cp.x,
        y: 100 - cp.y,
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

function flipArrow(a: ArrowAnnotation): ArrowAnnotation {
  const points = a.points.map((pt) => ({
    x: 100 - pt.x,
    y: 100 - pt.y,
  }));
  const cp = a.controlPoint;
  const controlPoint = cp
    ? {
        x: 100 - cp.x,
        y: 100 - cp.y,
      }
    : undefined;

  return { ...a, points, controlPoint };
}

function flipZone(z: ZoneAnnotation): ZoneAnnotation {
  const points = z.points.map((pt) => ({
    x: 100 - pt.x,
    y: 100 - pt.y,
  }));
  const x =
    z.x !== undefined
      ? z.width !== undefined
        ? 100 - (z.x + z.width)
        : 100 - z.x
      : undefined;
  const y =
    z.y !== undefined
      ? z.height !== undefined
        ? 100 - (z.y + z.height)
        : 100 - z.y
      : undefined;

  return { ...z, points, x, y };
}

function flipText(t: TextAnnotation): TextAnnotation {
  return {
    ...t,
    x: 100 - t.x,
    y: 100 - t.y,
  };
}

function flipBall(ball: BallState): BallState {
  const x = 100 - ball.x;
  const y = 100 - ball.y;
  const cp = ball.trajectory?.controlPoint;
  const controlPoint = cp
    ? {
        x: 100 - cp.x,
        y: 100 - cp.y,
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

export function flipSlideObjects(slide: Slide, _isVertical?: boolean): Slide {
  return {
    ...slide,
    isSidesSwapped: !slide.isSidesSwapped,
    players: slide.players.map(flipPlayer),
    arrows: slide.arrows.map(flipArrow),
    zones: slide.zones.map(flipZone),
    texts: slide.texts.map(flipText),
    ball: flipBall(slide.ball),
  };
}
