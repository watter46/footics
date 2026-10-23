import { useEffect, useMemo, useRef, useState } from 'react';
import type { AspectRatio, Slide } from '@/lib/types/tactical-unified';
import {
  easeOutCubic,
  interpolateSlide,
  lerpPitchRect,
  type PitchRect,
} from './slide-aspect-helpers';

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
