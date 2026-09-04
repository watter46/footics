'use client';

/**
 * use-tactical-animation.ts
 * Tactical Unified Canvas — 60fps/120fps Animation Engine Hook
 *
 * Responsibilities:
 *   - スライド全体の補間アニメーションループ (requestAnimationFrame)
 *   - タイムライン再生制御 (Play / Pause / Stop / Reset / Loop / Seek)
 *
 * Node 更新ロジックは animation-node-updater.ts の純粋関数へ委譲
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  calculateUnifiedTotalDuration,
  getInterpolatedUnifiedSlideFrame,
} from '@/lib/tactical/unified-interpolation';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/components/canvas/canvas-registry';
import {
  batchDrawLayers,
  updateArrowNodes,
  updateBallNode,
  updatePlayerNodes,
  updateTextNodes,
  updateZoneNodes,
} from './animation-node-updater';

interface UseTacticalAnimationOptions {
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  loop?: boolean;
}

export function useTacticalAnimation(options?: UseTacticalAnimationOptions) {
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const setIsPlaying = useTacticalUnifiedStore((s) => s.setIsPlaying);

  const animationFrameRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const currentPlaybackTimeRef = useRef<number>(0);
  const lastActiveSlideIndexRef = useRef<number>(0);

  const totalDurationMs = calculateUnifiedTotalDuration(slides);

  const applyFrameToCanvas = useCallback(
    (
      timeMs: number,
      registry: CanvasNodesRegistry | undefined,
      stageWidth: number,
      stageHeight: number,
      synchronous = false,
    ) => {
      if (!registry) return;

      const currentSlides = useTacticalUnifiedStore.getState().project.slides;
      if (currentSlides.length === 0) return;

      const frame = getInterpolatedUnifiedSlideFrame(currentSlides, timeMs);

      // スライドインデックスが切り替わった場合、Store のアクティブスライドを同期
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

      updatePlayerNodes(frame.players, registry, stageWidth, stageHeight);
      updateBallNode(frame.ball, registry, stageWidth, stageHeight);
      updateZoneNodes(frame.zones, registry, stageWidth, stageHeight);
      updateArrowNodes(frame.arrows, registry, stageWidth, stageHeight);
      updateTextNodes(frame.texts, registry, stageWidth, stageHeight);
      batchDrawLayers(registry, synchronous);
    },
    [setActiveSlide],
  );

  const playAnimation = useCallback(
    (onComplete?: () => void) => {
      const currentSlides = useTacticalUnifiedStore.getState().project.slides;
      if (currentSlides.length <= 1) {
        onComplete?.();
        return;
      }

      setIsPlaying(true);
      startTimestampRef.current = null;

      const registry = options?.nodesRegistryRef?.current;
      const stage = registry?.stage;
      const stageWidth = stage ? stage.width() : 800;
      const stageHeight = stage ? stage.height() : 450;
      const totalDuration = calculateUnifiedTotalDuration(currentSlides);

      const animate = (timestamp: number) => {
        if (!startTimestampRef.current) {
          startTimestampRef.current = timestamp - currentPlaybackTimeRef.current;
        }

        const elapsed = timestamp - startTimestampRef.current;
        currentPlaybackTimeRef.current = elapsed;

        if (elapsed >= totalDuration) {
          currentPlaybackTimeRef.current = 0;
          startTimestampRef.current = null;

          if (options?.loop) {
            applyFrameToCanvas(0, registry, stageWidth, stageHeight);
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
          }

          setIsPlaying(false);
          applyFrameToCanvas(totalDuration, registry, stageWidth, stageHeight);
          onComplete?.();
          return;
        }

        applyFrameToCanvas(elapsed, registry, stageWidth, stageHeight);
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [applyFrameToCanvas, setIsPlaying, options?.loop, options?.nodesRegistryRef],
  );

  const pauseAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimestampRef.current = null;
    setIsPlaying(false);
  }, [setIsPlaying]);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimestampRef.current = null;
    currentPlaybackTimeRef.current = 0;
    lastActiveSlideIndexRef.current = 0;
    setIsPlaying(false);

    const registry = options?.nodesRegistryRef?.current;
    const stage = registry?.stage;
    const stageWidth = stage ? stage.width() : 800;
    const stageHeight = stage ? stage.height() : 450;

    const currentSlides = useTacticalUnifiedStore.getState().project.slides;
    if (currentSlides.length > 0) {
      setActiveSlide(currentSlides[0].id);
      applyFrameToCanvas(0, registry, stageWidth, stageHeight);
    }
  }, [applyFrameToCanvas, setIsPlaying, setActiveSlide, options?.nodesRegistryRef]);

  const seekTo = useCallback(
    (timeMs: number) => {
      currentPlaybackTimeRef.current = Math.max(0, Math.min(totalDurationMs, timeMs));
      startTimestampRef.current = null;

      const registry = options?.nodesRegistryRef?.current;
      const stage = registry?.stage;
      const stageWidth = stage ? stage.width() : 800;
      const stageHeight = stage ? stage.height() : 450;

      applyFrameToCanvas(currentPlaybackTimeRef.current, registry, stageWidth, stageHeight);
    },
    [applyFrameToCanvas, totalDurationMs, options?.nodesRegistryRef],
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    playAnimation,
    pauseAnimation,
    stopAnimation,
    seekTo,
    applyFrameToCanvas,
    totalDurationMs,
    currentPlaybackTime: currentPlaybackTimeRef.current,
  };
}
