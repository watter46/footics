import {
  clampToScreenNorm,
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  DomainPlayerTrajectory,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import {
  type AspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';

function transformTrajectory(
  trajectory: DomainPlayerTrajectory | undefined,
  from: AspectRatio,
  to: AspectRatio,
): DomainPlayerTrajectory | undefined {
  if (!trajectory || !trajectory.controlPoint) return trajectory;
  const cp = transformCoord(trajectory.controlPoint, from, to, { clamp: true });
  return { ...trajectory, controlPoint: toScreenNormPoint(cp.x, cp.y, true) };
}

function transformPlayer(
  player: DomainPlayer,
  from: AspectRatio,
  to: AspectRatio,
): DomainPlayer {
  if (player.area === 'bench') return player;
  const pos = transformCoord({ x: player.x, y: player.y }, from, to, {
    clamp: true,
  });
  return {
    ...player,
    x: clampToScreenNorm(pos.x),
    y: clampToScreenNorm(pos.y),
    trajectory: transformTrajectory(player.trajectory, from, to),
  };
}

function transformZone(
  zone: DomainZoneAnnotation,
  from: AspectRatio,
  to: AspectRatio,
): DomainZoneAnnotation {
  if (zone.shapeType === 'polygon') {
    return {
      ...zone,
      points: zone.points.map((pt) => {
        const next = transformCoord(pt, from, to, { clamp: false });
        return toScreenNormPoint(next.x, next.y, false);
      }),
    };
  }
  const p1 = transformCoord({ x: zone.x, y: zone.y }, from, to, {
    clamp: false,
  });
  const p2 = transformCoord(
    { x: zone.x + zone.width, y: zone.y + zone.height },
    from,
    to,
    { clamp: false },
  );
  return {
    ...zone,
    x: clampToScreenNorm(Math.min(p1.x, p2.x)),
    y: clampToScreenNorm(Math.min(p1.y, p2.y)),
    width: Math.max(0.1, Math.abs(p2.x - p1.x)),
    height: Math.max(0.1, Math.abs(p2.y - p1.y)),
  };
}

/**
 * アスペクト比変更に伴いスライド内の全オブジェクト座標を幾何変換する純粋関数。
 */
export function transformSlideForAspect(
  slide: DomainSlide,
  from: AspectRatio,
  to: AspectRatio,
): DomainSlide {
  if (from === to) return slide;

  const ballPos = transformCoord(
    { x: slide.ball.x, y: slide.ball.y },
    from,
    to,
    { clamp: true },
  );

  return {
    ...slide,
    players: slide.players.map((p) => transformPlayer(p, from, to)),
    arrows: slide.arrows.map((a) => {
      const cp = a.controlPoint
        ? transformCoord(a.controlPoint, from, to, { clamp: false })
        : undefined;
      return {
        ...a,
        points: a.points.map((pt) => {
          const next = transformCoord(pt, from, to, { clamp: false });
          return toScreenNormPoint(next.x, next.y, false);
        }),
        controlPoint: cp ? toScreenNormPoint(cp.x, cp.y, false) : undefined,
      };
    }),
    zones: slide.zones.map((z) => transformZone(z, from, to)),
    texts: slide.texts.map((t) => {
      const next = transformCoord({ x: t.x, y: t.y }, from, to, {
        clamp: false,
      });
      return {
        ...t,
        x: toScreenNormCoord(next.x),
        y: toScreenNormCoord(next.y),
      };
    }),
    ball: {
      ...slide.ball,
      x: clampToScreenNorm(ballPos.x),
      y: clampToScreenNorm(ballPos.y),
      trajectory: transformTrajectory(slide.ball.trajectory, from, to),
    },
  };
}
