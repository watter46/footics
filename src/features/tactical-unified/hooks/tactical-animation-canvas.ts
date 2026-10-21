import { useMemo, useRef } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
import {
  batchDrawLayers,
  updateArrowNodes,
  updateBallNode,
  updatePlayerNodes,
  updateTextNodes,
  updateZoneNodes,
} from './animation-node-updater';

export interface AnimationPlaybackRefs {
  animationFrameRef: React.MutableRefObject<number | null>;
  startTimestampRef: React.MutableRefObject<number | null>;
  currentPlaybackTimeRef: React.MutableRefObject<number>;
  lastActiveSlideIndexRef: React.MutableRefObject<number>;
}

export interface UseTacticalAnimationOptions {
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  pitchSize?: { width: number; height: number; x?: number; y?: number };
  loop?: boolean;
}

export function useAnimationPlaybackRefs(): AnimationPlaybackRefs {
  const animationFrameRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const currentPlaybackTimeRef = useRef<number>(0);
  const lastActiveSlideIndexRef = useRef<number>(0);

  return useMemo(
    () => ({
      animationFrameRef,
      startTimestampRef,
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
    const aspectRatio =
      useTacticalUnifiedStore.getState().project.aspectRatio || '16:9';
    const rect = calculatePitchRect(
      { width: stageWidth, height: stageHeight },
      aspectRatio,
    );
    return {
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
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
  if (refs.animationFrameRef.current) {
    cancelAnimationFrame(refs.animationFrameRef.current);
    refs.animationFrameRef.current = null;
  }
  refs.startTimestampRef.current = null;
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

export interface RunAnimationLoopParams {
  refs: AnimationPlaybackRefs;
  totalDuration: number;
  loop?: boolean;
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
  onComplete?: () => void;
}

export function runAnimationLoop({
  refs,
  totalDuration,
  loop,
  registry,
  pitchDimensions,
  applyFrameToCanvas,
  setIsPlaying,
  onComplete,
}: RunAnimationLoopParams) {
  const {
    width: pitchWidth,
    height: pitchHeight,
    x: offsetX = 0,
    y: offsetY = 0,
  } = pitchDimensions;

  const animate = (timestamp: number) => {
    if (!refs.startTimestampRef.current) {
      refs.startTimestampRef.current =
        timestamp - refs.currentPlaybackTimeRef.current;
    }

    const elapsed = timestamp - refs.startTimestampRef.current;
    refs.currentPlaybackTimeRef.current = elapsed;

    if (elapsed >= totalDuration) {
      refs.currentPlaybackTimeRef.current = 0;
      refs.startTimestampRef.current = null;

      if (loop) {
        applyFrameToCanvas(
          0,
          registry,
          pitchWidth,
          pitchHeight,
          false,
          offsetX,
          offsetY,
        );
        refs.animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      setIsPlaying(false);
      applyFrameToCanvas(
        totalDuration,
        registry,
        pitchWidth,
        pitchHeight,
        false,
        offsetX,
        offsetY,
      );
      onComplete?.();
      return;
    }

    applyFrameToCanvas(
      elapsed,
      registry,
      pitchWidth,
      pitchHeight,
      false,
      offsetX,
      offsetY,
    );
    refs.animationFrameRef.current = requestAnimationFrame(animate);
  };

  refs.animationFrameRef.current = requestAnimationFrame(animate);
}

export function pausePlayback(
  refs: AnimationPlaybackRefs,
  setIsPlaying: (playing: boolean) => void,
) {
  if (refs.animationFrameRef.current) {
    cancelAnimationFrame(refs.animationFrameRef.current);
    refs.animationFrameRef.current = null;
  }
  refs.startTimestampRef.current = null;
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
  refs.currentPlaybackTimeRef.current = Math.max(
    0,
    Math.min(totalDurationMs, timeMs),
  );
  refs.startTimestampRef.current = null;
  applyFrameToCanvas(
    refs.currentPlaybackTimeRef.current,
    registry,
    pitchDimensions.width,
    pitchDimensions.height,
    false,
    pitchDimensions.x ?? 0,
    pitchDimensions.y ?? 0,
  );
}
