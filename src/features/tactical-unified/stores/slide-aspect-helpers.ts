// biome-ignore lint/style/noExcessiveLinesPerFile: Aspect ratio transformation and transition helpers
import { useEffect, useMemo, useRef, useState } from 'react';
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

export interface UsePitchTransitionOptions {
  aspectRatio: AspectRatio;
  activeSlideId: string | null | undefined;
  activeSlide: Slide | null | undefined;
  pitchRect: PitchRect;
  isExporting: boolean;
}

interface TransitionAnimationParams {
  fromRect: PitchRect;
  toRect: PitchRect;
  fromSlide: Slide;
  toSlide: Slide;
  duration?: number;
  onUpdate: (rect: PitchRect, slide: Slide) => void;
  onComplete: () => void;
}

function startAspectAnimation({
  fromRect,
  toRect,
  fromSlide,
  toSlide,
  duration = 300,
  onUpdate,
  onComplete,
}: TransitionAnimationParams): () => void {
  const startTime = performance.now();
  let animId: number | null = null;

  const animate = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const t = easeOutCubic(progress);

    onUpdate(
      lerpPitchRect(fromRect, toRect, t),
      interpolateSlide(fromSlide, toSlide, t),
    );

    if (progress >= 1) {
      onComplete();
    } else {
      animId = requestAnimationFrame(animate);
    }
  };

  animId = requestAnimationFrame(animate);
  return () => {
    if (animId !== null) cancelAnimationFrame(animId);
  };
}

export function usePitchTransition({
  aspectRatio,
  activeSlideId,
  activeSlide,
  pitchRect,
  isExporting,
}: UsePitchTransitionOptions) {
  const [animatedState, setAnimatedState] = useState<{
    rect: PitchRect;
    slide: Slide;
  } | null>(null);

  const prevAspectRef = useRef<AspectRatio>(aspectRatio);
  const prevSlideIdRef = useRef<string | null | undefined>(activeSlideId);
  const prevRectRef = useRef<PitchRect>(pitchRect);
  const prevSlideRef = useRef<Slide | null | undefined>(activeSlide);

  const currentRenderedRectRef = useRef<PitchRect>(pitchRect);
  const currentRenderedSlideRef = useRef<Slide | null | undefined>(activeSlide);
  const cancelAnimRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const prevAspect = prevAspectRef.current;
    const prevSlideId = prevSlideIdRef.current;

    const syncCurrentValues = () => {
      prevAspectRef.current = aspectRatio;
      prevSlideIdRef.current = activeSlideId;
      prevRectRef.current = pitchRect;
      prevSlideRef.current = activeSlide;
      currentRenderedRectRef.current = pitchRect;
      currentRenderedSlideRef.current = activeSlide;
    };

    if (isExporting || prevSlideId !== activeSlideId) {
      cancelAnimRef.current?.();
      setAnimatedState(null);
      syncCurrentValues();
      return;
    }

    if (prevAspect !== aspectRatio && activeSlide && prevSlideRef.current) {
      const fromRect = { ...currentRenderedRectRef.current };
      const fromSlide = currentRenderedSlideRef.current ?? prevSlideRef.current;
      const toRect = { ...pitchRect };
      const toSlide = activeSlide;

      prevAspectRef.current = aspectRatio;
      prevSlideIdRef.current = activeSlideId;
      cancelAnimRef.current?.();
      setAnimatedState({ rect: fromRect, slide: fromSlide });

      cancelAnimRef.current = startAspectAnimation({
        fromRect,
        toRect,
        fromSlide,
        toSlide,
        duration: 300,
        onUpdate: (rect, slide) => {
          currentRenderedRectRef.current = rect;
          currentRenderedSlideRef.current = slide;
          setAnimatedState({ rect, slide });
        },
        onComplete: () => {
          setAnimatedState(null);
          cancelAnimRef.current = null;
          syncCurrentValues();
        },
      });
      return;
    }

    if (!animatedState) {
      syncCurrentValues();
    }
  }, [
    aspectRatio,
    activeSlideId,
    isExporting,
    pitchRect,
    activeSlide,
    animatedState,
  ]);

  useEffect(() => {
    return () => {
      cancelAnimRef.current?.();
    };
  }, []);

  // アスペクト比切替直後（useEffect実行前）の瞬間ジャンプ防止
  const isPendingTransition =
    !isExporting &&
    prevSlideIdRef.current === activeSlideId &&
    prevAspectRef.current !== aspectRatio &&
    animatedState === null;

  const effectivePitchRect = isPendingTransition
    ? currentRenderedRectRef.current
    : (animatedState?.rect ?? pitchRect);

  const effectiveSlide = isPendingTransition
    ? (currentRenderedSlideRef.current ?? activeSlide)
    : (animatedState?.slide ?? activeSlide);

  const effectivePitchSize = useMemo(
    () => ({
      width: effectivePitchRect.width,
      height: effectivePitchRect.height,
    }),
    [effectivePitchRect.width, effectivePitchRect.height],
  );

  return {
    effectivePitchRect,
    effectiveSlide,
    effectivePitchSize,
    isTransitioning: animatedState !== null,
  };
}
