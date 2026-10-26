/** Tactical Unified Canvas — 60fps/120fps Animation Engine Hook */

import { useCallback, useEffect } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import {
  calculatePitchDimensions,
  createTacticalTimeline,
  pausePlayback,
  renderFrameToCanvas,
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
      offsetX = 0,
      offsetY = 0,
    ) => {
      renderFrameToCanvas(
        timeMs,
        registry,
        stageWidth,
        stageHeight,
        refs.lastActiveSlideIndexRef,
        setActiveSlide,
        synchronous,
        offsetX,
        offsetY,
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
      const dims = getPitchDimensions();

      const isAtEnd = refs.currentPlaybackTimeRef.current >= totalDurationMs;
      if (isAtEnd || refs.currentPlaybackTimeRef.current === 0) {
        refs.currentPlaybackTimeRef.current = 0;
        refs.lastActiveSlideIndexRef.current = 0;
        if (currentSlides[0]) {
          setActiveSlide(currentSlides[0].id);
        }
      }

      refs.timelineRef.current?.kill();
      const tl = createTacticalTimeline(
        currentSlides,
        (timeMs) => {
          refs.currentPlaybackTimeRef.current = timeMs;
          applyFrameToCanvas(
            timeMs,
            options?.nodesRegistryRef?.current,
            dims.width,
            dims.height,
            false,
            dims.x,
            dims.y,
          );
        },
        {
          loop: options?.loop,
          onComplete: () => {
            if (!options?.loop) {
              const lastSlideIndex = currentSlides.length - 1;
              if (lastSlideIndex >= 0) {
                const lastSlide = currentSlides[lastSlideIndex];
                if (lastSlide) {
                  setActiveSlide(lastSlide.id);
                  refs.lastActiveSlideIndexRef.current = lastSlideIndex;
                  refs.currentPlaybackTimeRef.current = totalDurationMs;
                }
              }
              applyFrameToCanvas(
                totalDurationMs,
                options?.nodesRegistryRef?.current,
                dims.width,
                dims.height,
                true,
                dims.x,
                dims.y,
              );
              setIsPlaying(false);
              onComplete?.();
            }
          },
        },
      );
      refs.timelineRef.current = tl;

      if (refs.currentPlaybackTimeRef.current > 0) {
        tl.time(refs.currentPlaybackTimeRef.current / 1000);
      }
      tl.play();
    },
    [
      applyFrameToCanvas,
      setIsPlaying,
      setActiveSlide,
      totalDurationMs,
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
    refs.timelineRef.current?.kill();
    refs.timelineRef.current = null;
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
      refs.timelineRef.current?.kill();
      refs.timelineRef.current = null;
    };
  }, [refs.timelineRef]);

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
