'use client';

/** Tactical Unified Canvas — 60fps/120fps Animation Engine Hook */

import { useCallback, useEffect } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import {
  calculatePitchDimensions,
  pausePlayback,
  renderFrameToCanvas,
  runAnimationLoop,
  seekPlayback,
  stopPlayback,
  type UseTacticalAnimationOptions,
  useAnimationPlaybackRefs,
} from './tactical-animation-canvas';

export type { UseTacticalAnimationOptions };

export function useTacticalAnimation(options?: UseTacticalAnimationOptions) {
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const setIsPlaying = useTacticalUnifiedStore((s) => s.setIsPlaying);

  const refs = useAnimationPlaybackRefs();
  const totalDurationMs = calculateUnifiedTotalDuration(slides);

  const applyFrameToCanvas = useCallback(
    (
      timeMs: number,
      registry: CanvasNodesRegistry | undefined,
      stageWidth: number,
      stageHeight: number,
      synchronous = false,
    ) => {
      renderFrameToCanvas(
        timeMs,
        registry,
        stageWidth,
        stageHeight,
        refs.lastActiveSlideIndexRef,
        setActiveSlide,
        synchronous,
      );
    },
    [setActiveSlide, refs.lastActiveSlideIndexRef],
  );

  const getPitchDimensions = useCallback(
    () =>
      calculatePitchDimensions(options?.pitchSize, options?.nodesRegistryRef),
    [options?.pitchSize, options?.nodesRegistryRef],
  );

  const playAnimation = useCallback(
    (onComplete?: () => void) => {
      const currentSlides = useTacticalUnifiedStore.getState().project.slides;
      if (currentSlides.length <= 1) {
        onComplete?.();
        return;
      }
      setIsPlaying(true);
      refs.startTimestampRef.current = null;
      runAnimationLoop({
        refs,
        totalDuration: calculateUnifiedTotalDuration(currentSlides),
        loop: options?.loop,
        registry: options?.nodesRegistryRef?.current,
        pitchDimensions: getPitchDimensions(),
        applyFrameToCanvas,
        setIsPlaying,
        onComplete,
      });
    },
    [
      applyFrameToCanvas,
      setIsPlaying,
      options?.loop,
      options?.nodesRegistryRef,
      getPitchDimensions,
      refs,
    ],
  );

  const pauseAnimation = useCallback(
    () => pausePlayback(refs, setIsPlaying),
    [refs, setIsPlaying],
  );

  const stopAnimation = useCallback(() => {
    stopPlayback({
      refs,
      registry: options?.nodesRegistryRef?.current,
      pitchDimensions: getPitchDimensions(),
      applyFrameToCanvas,
      setIsPlaying,
      setActiveSlide,
    });
  }, [
    refs,
    options?.nodesRegistryRef,
    getPitchDimensions,
    applyFrameToCanvas,
    setIsPlaying,
    setActiveSlide,
  ]);

  const seekTo = useCallback(
    (timeMs: number) => {
      seekPlayback({
        timeMs,
        totalDurationMs,
        refs,
        registry: options?.nodesRegistryRef?.current,
        pitchDimensions: getPitchDimensions(),
        applyFrameToCanvas,
      });
    },
    [
      applyFrameToCanvas,
      totalDurationMs,
      options?.nodesRegistryRef,
      getPitchDimensions,
      refs,
    ],
  );

  useEffect(() => {
    return () => {
      if (refs.animationFrameRef.current) {
        cancelAnimationFrame(refs.animationFrameRef.current);
      }
    };
  }, [refs.animationFrameRef]);

  return {
    playAnimation,
    pauseAnimation,
    stopAnimation,
    seekTo,
    applyFrameToCanvas,
    totalDurationMs,
    currentPlaybackTime: refs.currentPlaybackTimeRef.current,
  };
}
