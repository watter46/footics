import gsap from 'gsap';
import { useMemo, useRef } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  calculateUnifiedTotalDuration,
  getInterpolatedUnifiedSlideFrame,
} from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';
import {
  batchDrawLayers,
  updateArrowNodes,
  updateBallNode,
  updatePlayerNodes,
  updateTextNodes,
  updateZoneNodes,
} from './animation-node-updater';

export interface AnimationPlaybackRefs {
  timelineRef: React.MutableRefObject<gsap.core.Timeline | null>;
  currentPlaybackTimeRef: React.MutableRefObject<number>;
  lastActiveSlideIndexRef: React.MutableRefObject<number>;
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
  const totalDurationMs = calculateUnifiedTotalDuration(slides);
  const totalDurationSec = totalDurationMs / 1000;

  const tl = gsap.timeline({
    paused: true,
    repeat: options?.loop ? -1 : 0,
    onComplete: options?.onComplete,
  });

  if (totalDurationSec <= 0) {
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

  return useMemo(
    () => ({
      timelineRef,
      currentPlaybackTimeRef,
      lastActiveSlideIndexRef,
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

export function renderFrameToCanvas(
  timeMs: number,
  registry: CanvasNodesRegistry | undefined,
  stageWidth: number,
  stageHeight: number,
  lastActiveSlideIndexRef: React.MutableRefObject<number>,
  setActiveSlide: (slideId: string) => void,
  synchronous = false,
  offsetX = 0,
  offsetY = 0,
) {
  if (!registry) return;

  const currentSlides = useTacticalUnifiedStore.getState().project.slides;
  if (currentSlides.length === 0) return;

  const frame = getInterpolatedUnifiedSlideFrame(currentSlides, timeMs);

  if (frame.currentSlideIndex !== lastActiveSlideIndexRef.current) {
    lastActiveSlideIndexRef.current = frame.currentSlideIndex;
    const targetSlide = currentSlides[frame.currentSlideIndex];
    if (
      targetSlide &&
      targetSlide.id !== useTacticalUnifiedStore.getState().activeSlideId
    ) {
      setActiveSlide(targetSlide.id);
    }
  }

  updatePlayerNodes(
    frame.players,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
  );
  updateBallNode(
    frame.ball,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
  );
  updateZoneNodes(
    frame.zones,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
  );
  updateArrowNodes(
    frame.arrows,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
  );
  updateTextNodes(
    frame.texts,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
  );
  batchDrawLayers(registry, synchronous);
}

export function stopPlayback({
  refs,
  registry,
  pitchDimensions,
  applyFrameToCanvas,
  setIsPlaying,
  setActiveSlide,
}: {
  refs: AnimationPlaybackRefs;
  registry: CanvasNodesRegistry | undefined;
  pitchDimensions: { width: number; height: number; x?: number; y?: number };
  applyFrameToCanvas: (
    timeMs: number,
    reg: CanvasNodesRegistry | undefined,
    w: number,
    h: number,
    synchronous?: boolean,
    offsetX?: number,
    offsetY?: number,
  ) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveSlide: (slideId: string) => void;
}) {
  if (refs.timelineRef.current) {
    refs.timelineRef.current.pause(0);
  }
  refs.currentPlaybackTimeRef.current = 0;
  refs.lastActiveSlideIndexRef.current = 0;
  setIsPlaying(false);

  const currentSlides = useTacticalUnifiedStore.getState().project.slides;
  if (currentSlides.length > 0) {
    setActiveSlide(currentSlides[0].id);
    applyFrameToCanvas(
      0,
      registry,
      pitchDimensions.width,
      pitchDimensions.height,
      false,
      pitchDimensions.x ?? 0,
      pitchDimensions.y ?? 0,
    );
  }
}

export function pausePlayback(
  refs: AnimationPlaybackRefs,
  setIsPlaying: (playing: boolean) => void,
) {
  refs.timelineRef.current?.pause();
  setIsPlaying(false);
}

export function seekPlayback({
  timeMs,
  totalDurationMs,
  refs,
  registry,
  pitchDimensions,
  applyFrameToCanvas,
}: {
  timeMs: number;
  totalDurationMs: number;
  refs: AnimationPlaybackRefs;
  registry: CanvasNodesRegistry | undefined;
  pitchDimensions: { width: number; height: number; x?: number; y?: number };
  applyFrameToCanvas: (
    timeMs: number,
    reg: CanvasNodesRegistry | undefined,
    w: number,
    h: number,
    synchronous?: boolean,
    offsetX?: number,
    offsetY?: number,
  ) => void;
}) {
  const clampedTime = Math.max(0, Math.min(totalDurationMs, timeMs));
  refs.currentPlaybackTimeRef.current = clampedTime;

  if (refs.timelineRef.current) {
    refs.timelineRef.current.seek(clampedTime / 1000, false);
  }
  applyFrameToCanvas(
    clampedTime,
    registry,
    pitchDimensions.width,
    pitchDimensions.height,
    false,
    pitchDimensions.x ?? 0,
    pitchDimensions.y ?? 0,
  );
}
