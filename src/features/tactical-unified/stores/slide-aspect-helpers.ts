// biome-ignore lint/style/noExcessiveLinesPerFile: Aspect ratio transformation and transition helpers
import type { AspectRatio, Slide } from '@/lib/types/tactical-unified';
import {
  getDefaultBoundaryBoxForAspect,
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
    boundaryBox: getDefaultBoundaryBoxForAspect(to),
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

export interface PitchRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpCoord(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

function lerpPointList(
  a: { x: number; y: number }[],
  b: { x: number; y: number }[],
  t: number,
): { x: number; y: number }[] {
  if (a.length === b.length) {
    return a.map((pt, i) => lerpCoord(pt, b[i], t));
  }
  return t >= 0.5 ? b : a;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
}

export function lerpPitchRect(
  from: PitchRect,
  to: PitchRect,
  t: number,
): PitchRect {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: lerp(from.x, to.x, clampedT),
    y: lerp(from.y, to.y, clampedT),
    width: lerp(from.width, to.width, clampedT),
    height: lerp(from.height, to.height, clampedT),
  };
}

function interpolatePlayers(
  fromPlayers: Slide['players'],
  toPlayers: Slide['players'],
  t: number,
): Slide['players'] {
  return toPlayers.map((toPlayer) => {
    const fromPlayer = fromPlayers.find((p) => p.id === toPlayer.id);
    if (!fromPlayer) return toPlayer;

    const pos = lerpCoord(
      { x: fromPlayer.x, y: fromPlayer.y },
      { x: toPlayer.x, y: toPlayer.y },
      t,
    );

    const trajectory =
      toPlayer.trajectory && fromPlayer.trajectory
        ? {
            ...toPlayer.trajectory,
            controlPoint:
              toPlayer.trajectory.controlPoint &&
              fromPlayer.trajectory.controlPoint
                ? lerpCoord(
                    fromPlayer.trajectory.controlPoint,
                    toPlayer.trajectory.controlPoint,
                    t,
                  )
                : toPlayer.trajectory.controlPoint,
          }
        : toPlayer.trajectory;

    return {
      ...toPlayer,
      x: pos.x,
      y: pos.y,
      trajectory,
    };
  });
}

function interpolateBall(
  fromBall: Slide['ball'],
  toBall: Slide['ball'],
  t: number,
): Slide['ball'] {
  const pos = lerpCoord(
    { x: fromBall.x, y: fromBall.y },
    { x: toBall.x, y: toBall.y },
    t,
  );
  const trajectory =
    toBall.trajectory && fromBall.trajectory
      ? {
          ...toBall.trajectory,
          controlPoint:
            toBall.trajectory.controlPoint && fromBall.trajectory.controlPoint
              ? lerpCoord(
                  fromBall.trajectory.controlPoint,
                  toBall.trajectory.controlPoint,
                  t,
                )
              : toBall.trajectory.controlPoint,
        }
      : toBall.trajectory;

  return {
    ...toBall,
    x: pos.x,
    y: pos.y,
    trajectory,
  };
}

function interpolateAnnotations(fromSlide: Slide, toSlide: Slide, t: number) {
  const arrows = toSlide.arrows.map((toArrow) => {
    const fromArrow = fromSlide.arrows.find((a) => a.id === toArrow.id);
    if (!fromArrow) return toArrow;

    return {
      ...toArrow,
      points: lerpPointList(fromArrow.points, toArrow.points, t),
      controlPoint:
        toArrow.controlPoint && fromArrow.controlPoint
          ? lerpCoord(fromArrow.controlPoint, toArrow.controlPoint, t)
          : toArrow.controlPoint,
    };
  });

  const zones = toSlide.zones.map((toZone) => {
    const fromZone = fromSlide.zones.find((z) => z.id === toZone.id);
    if (!fromZone) return toZone;

    return {
      ...toZone,
      points: lerpPointList(fromZone.points, toZone.points, t),
    };
  });

  const texts = toSlide.texts.map((toText) => {
    const fromText = fromSlide.texts.find((t) => t.id === toText.id);
    if (!fromText) return toText;

    const pos = lerpCoord(
      { x: fromText.x, y: fromText.y },
      { x: toText.x, y: toText.y },
      t,
    );
    return {
      ...toText,
      x: pos.x,
      y: pos.y,
    };
  });

  return { arrows, zones, texts };
}

function interpolateTransform(
  fromTransform: Slide['pitchTransform'],
  toTransform: Slide['pitchTransform'],
  t: number,
): Slide['pitchTransform'] {
  if (!fromTransform || !toTransform) return toTransform;
  return {
    ...toTransform,
    panX: lerp(fromTransform.panX ?? 0, toTransform.panX ?? 0, t),
    panY: lerp(fromTransform.panY ?? 0, toTransform.panY ?? 0, t),
    zoom: lerp(fromTransform.zoom ?? 1, toTransform.zoom ?? 1, t),
    tilt: lerp(fromTransform.tilt ?? 0, toTransform.tilt ?? 0, t),
  };
}

export function interpolateSlide(
  fromSlide: Slide,
  toSlide: Slide,
  t: number,
): Slide {
  const clampedT = Math.max(0, Math.min(1, t));
  if (clampedT === 0) return fromSlide;
  if (clampedT === 1) return toSlide;

  const { arrows, zones, texts } = interpolateAnnotations(
    fromSlide,
    toSlide,
    clampedT,
  );

  return {
    ...toSlide,
    players: interpolatePlayers(fromSlide.players, toSlide.players, clampedT),
    ball: interpolateBall(fromSlide.ball, toSlide.ball, clampedT),
    arrows,
    zones,
    texts,
    pitchTransform: interpolateTransform(
      fromSlide.pitchTransform,
      toSlide.pitchTransform,
      clampedT,
    ),
  };
}
