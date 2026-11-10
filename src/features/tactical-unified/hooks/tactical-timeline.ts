'use client';

import gsap from 'gsap';
import { useMemo, useRef } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';

export interface AnimationPlaybackRefs {
  timelineRef: React.MutableRefObject<gsap.core.Timeline | null>;
  currentPlaybackTimeRef: React.MutableRefObject<number>;
  lastActiveSlideIndexRef: React.MutableRefObject<number>;
  lastPlaybackIndicesRef: React.MutableRefObject<{
    slideIndex: number;
    transitionIndex: number | null;
  }>;
}

export interface UseTacticalAnimationOptions {
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  pitchSize?: { width: number; height: number; x?: number; y?: number };
  loop?: boolean;
}

export interface TacticalTimelineOptions {
  loop?: boolean;
  onComplete?: () => void;
}

export function createTacticalTimeline(
  slides: Slide[],
  onUpdate: (timeMs: number) => void,
  options?: TacticalTimelineOptions,
): gsap.core.Timeline {
  const totalDurationMs = resolvePlaybackDurationMs(slides);
  const totalDurationSec = totalDurationMs / 1000;

  const tl = gsap.timeline({
    paused: true,
    repeat: options?.loop ? -1 : 0,
    onComplete: options?.onComplete,
  });

  if (slides.length === 0 || totalDurationMs <= 0) {
    return tl;
  }

  const proxy = { time: 0 };
  tl.to(proxy, {
    time: totalDurationMs,
    duration: totalDurationSec,
    ease: 'none',
    onUpdate: () => {
      onUpdate(proxy.time);
    },
  });

  return tl;
}

export function useAnimationPlaybackRefs(): AnimationPlaybackRefs {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const currentPlaybackTimeRef = useRef<number>(0);
  const lastActiveSlideIndexRef = useRef<number>(0);
  const lastPlaybackIndicesRef = useRef<{
    slideIndex: number;
    transitionIndex: number | null;
  }>({ slideIndex: 0, transitionIndex: null });

  return useMemo(
    () => ({
      timelineRef,
      currentPlaybackTimeRef,
      lastActiveSlideIndexRef,
      lastPlaybackIndicesRef,
    }),
    [],
  );
}

export function calculatePitchDimensions(
  pitchSize?: { width: number; height: number; x?: number; y?: number },
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): { width: number; height: number; x: number; y: number } {
  if (pitchSize) {
    return {
      width: pitchSize.width,
      height: pitchSize.height,
      x: pitchSize.x ?? 0,
      y: pitchSize.y ?? 0,
    };
  }
  const registry = nodesRegistryRef?.current;
  if (
    registry?.pitchRect &&
    registry.pitchRect.width > 0 &&
    registry.pitchRect.height > 0
  ) {
    return {
      width: registry.pitchRect.width,
      height: registry.pitchRect.height,
      x: 0,
      y: 0,
    };
  }
  const stage = registry?.stage;
  if (stage) {
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    return {
      width: stageWidth,
      height: stageHeight,
      x: 0,
      y: 0,
    };
  }
  return { width: 800, height: 450, x: 0, y: 0 };
}
