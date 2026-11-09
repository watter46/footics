import gsap from 'gsap';
import { useMemo, useRef } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  defaultTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { computeArrowEffectState } from '@/lib/tactical/effect-geometry';
import {
  calculateUnifiedTotalDuration,
  getInterpolatedUnifiedSlideFrame,
  resolveEffectiveSlideSegments,
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
  lastPlaybackIndicesRef?: React.MutableRefObject<{
    slideIndex: number;
    transitionIndex: number | null;
  }>,
  storeApi: TacticalUnifiedStoreApi = defaultTacticalUnifiedStore,
) {
  if (!registry) return;

  const currentSlides = selectActivePhaseSlides(storeApi.getState());
  if (currentSlides.length === 0) return;

  const frame = getInterpolatedUnifiedSlideFrame(currentSlides, timeMs);

  // 再生中オレンジ枠用のインデックス計算（境界時のみ更新し毎フレーム再描画を防止）
  const isTransitioning =
    !frame.isPaused &&
    frame.progress < 1 &&
    frame.currentSlideIndex !== frame.nextSlideIndex;

  const currentPlaybackSlideIndex = frame.currentSlideIndex;
  const currentPlaybackTransitionIndex = isTransitioning
    ? frame.nextSlideIndex
    : null;

  if (lastPlaybackIndicesRef) {
    const prev = lastPlaybackIndicesRef.current;
    if (
      prev.slideIndex !== currentPlaybackSlideIndex ||
      prev.transitionIndex !== currentPlaybackTransitionIndex
    ) {
      lastPlaybackIndicesRef.current = {
        slideIndex: currentPlaybackSlideIndex,
        transitionIndex: currentPlaybackTransitionIndex,
      };
      storeApi
        .getState()
        .setPlaybackIndices(
          currentPlaybackSlideIndex,
          currentPlaybackTransitionIndex,
        );
    }
  }

  if (frame.currentSlideIndex !== lastActiveSlideIndexRef.current) {
    lastActiveSlideIndexRef.current = frame.currentSlideIndex;
    const targetSlide = currentSlides[frame.currentSlideIndex];
    if (targetSlide && targetSlide.id !== storeApi.getState().activeSlideId) {
      setActiveSlide(targetSlide.id);
    }
  }

  const isPlaying = storeApi.getState().isPlaying;

  let timeInSlideMs = timeMs;
  let activeSlide = currentSlides[0];

  if (currentSlides.length > 1) {
    const segments = resolveEffectiveSlideSegments(currentSlides);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLastSegment = i === segments.length - 1;
      if (timeMs < seg.startTimeMs + seg.effectiveDurationMs || isLastSegment) {
        timeInSlideMs = Math.max(0, timeMs - seg.startTimeMs);
        activeSlide = currentSlides[seg.slideIndex - 1] ?? currentSlides[0];
        break;
      }
    }
  }

  const effectArrows = { ...frame.arrows };
  for (const [arrowId, arrowState] of Object.entries(effectArrows)) {
    if (!isPlaying) {
      arrowState.progress = 1.0;
      arrowState.opacity = 1.0;
      arrowState.visible = true;
    } else {
      const originalArrow =
        activeSlide?.arrows.find((a) => a.id === arrowId) ??
        currentSlides[frame.nextSlideIndex]?.arrows.find(
          (a) => a.id === arrowId,
        );
      const effectState = computeArrowEffectState(
        timeInSlideMs,
        originalArrow?.effect,
      );
      arrowState.progress = effectState.progress;
      arrowState.opacity = arrowState.opacity * effectState.opacity;
      arrowState.visible = arrowState.visible && effectState.visible;
    }
  }

  if (!isPlaying) {
    for (const playerGroup of registry.playerNodes.values()) {
      if (typeof playerGroup.find === 'function') {
        const rings = playerGroup.find('.ripple-ring');
        for (const ring of rings) {
          if (typeof ring.visible === 'function') {
            ring.visible(false);
          }
        }
      }
    }
  }

  updatePlayerNodes(
    frame.players,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
    timeInSlideMs,
    isPlaying,
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
    effectArrows,
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

// Re-export playback control functions to preserve public API
export * from './tactical-playback-controls';
