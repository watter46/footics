import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import {
  resolveEffectiveSlideSegments,
  type SlideTimingLike,
} from '@/lib/tactical/engine/director-camera';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { AnimationPlaybackRefs } from './tactical-timeline';

/**
 * 特定スライドインデックスへの到達完了（静止開始）時刻 (ms) を計算
 */
export function getSlideSnapTime(
  slides: readonly (DomainSlide | SlideTimingLike)[],
  targetIndex: number,
): number {
  if (targetIndex <= 0 || slides.length === 0) return 0;
  const clampedIndex = Math.min(targetIndex, slides.length - 1);
  const segments = resolveEffectiveSlideSegments(slides);
  if (segments.length === 0) return 0;

  const destSegment = segments[clampedIndex - 1];
  if (!destSegment) return 0;

  const moveDurationInSeg =
    destSegment.cameraMode === 'slow'
      ? destSegment.effectiveDurationMs
      : destSegment.playerMoveMs;

  return destSegment.startTimeMs + moveDurationInSeg;
}

export function snapToSlideOnStop({
  slides,
  refs,
  registry,
  pitchDimensions,
  applyFrameToCanvas,
  setActiveSlide,
  setPlaybackIndices,
}: {
  slides: readonly DomainSlide[];
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
  setActiveSlide: (slideId: string) => void;
  setPlaybackIndices?: (
    slideIndex: number,
    transitionIndex: number | null,
  ) => void;
}) {
  if (slides.length === 0) return;

  const currentTime = refs.currentPlaybackTimeRef.current;
  const segments = resolveEffectiveSlideSegments(slides);
  const segIndex = segments.findIndex(
    (seg) =>
      currentTime >= seg.startTimeMs &&
      currentTime < seg.startTimeMs + seg.effectiveDurationMs,
  );

  let isTransitioning = false;
  let currentSlideIndex = currentTime <= 0 ? 0 : Math.max(0, slides.length - 1);
  let nextSlideIndex = currentSlideIndex;

  if (segIndex !== -1) {
    const seg = segments[segIndex];
    const moveDurationInSeg =
      seg.cameraMode === 'slow' ? seg.effectiveDurationMs : seg.playerMoveMs;
    if (currentTime < seg.startTimeMs + moveDurationInSeg) {
      isTransitioning = true;
      currentSlideIndex = segIndex;
      nextSlideIndex = Math.min(segIndex + 1, slides.length - 1);
    } else {
      currentSlideIndex = Math.min(segIndex + 1, slides.length - 1);
      nextSlideIndex = currentSlideIndex;
    }
  }

  let targetTimeMs = currentTime;

  if (isTransitioning) {
    const targetIndex = nextSlideIndex;
    const snapTimeMs = getSlideSnapTime(slides, targetIndex);
    refs.currentPlaybackTimeRef.current = snapTimeMs;
    refs.lastActiveSlideIndexRef.current = targetIndex;
    refs.lastPlaybackIndicesRef.current = {
      slideIndex: targetIndex,
      transitionIndex: null,
    };

    if (typeof refs.timelineRef.current?.seek === 'function') {
      refs.timelineRef.current.seek(snapTimeMs / 1000, false);
    }

    const targetSlide = slides[targetIndex];
    if (targetSlide) {
      setActiveSlide(targetSlide.id);
    }

    setPlaybackIndices?.(targetIndex, null);
    targetTimeMs = snapTimeMs;
  } else {
    const targetIndex = currentSlideIndex;
    refs.lastActiveSlideIndexRef.current = targetIndex;
    refs.lastPlaybackIndicesRef.current = {
      slideIndex: targetIndex,
      transitionIndex: null,
    };

    const targetSlide = slides[targetIndex];
    if (targetSlide) {
      setActiveSlide(targetSlide.id);
    }

    setPlaybackIndices?.(targetIndex, null);
  }

  applyFrameToCanvas(
    targetTimeMs,
    registry,
    pitchDimensions.width,
    pitchDimensions.height,
    true,
    pitchDimensions.x ?? 0,
    pitchDimensions.y ?? 0,
  );
}

export function stopPlayback({
  slides = [],
  refs,
  registry,
  pitchDimensions,
  applyFrameToCanvas,
  setIsPlaying,
  setActiveSlide,
}: {
  slides?: readonly DomainSlide[];
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
  setPlaybackIndices?: (
    slideIndex: number,
    transitionIndex: number | null,
  ) => void;
}) {
  if (refs.timelineRef.current) {
    refs.timelineRef.current.pause(0);
  }
  refs.currentPlaybackTimeRef.current = 0;
  refs.lastActiveSlideIndexRef.current = 0;
  refs.lastPlaybackIndicesRef.current = {
    slideIndex: 0,
    transitionIndex: null,
  };
  setIsPlaying(false);

  if (slides.length > 0) {
    setActiveSlide(slides[0].id);
    applyFrameToCanvas(
      0,
      registry,
      pitchDimensions.width,
      pitchDimensions.height,
      true,
      pitchDimensions.x ?? 0,
      pitchDimensions.y ?? 0,
    );
  }
}

export function pausePlayback(
  refs: AnimationPlaybackRefs,
  setIsPlaying: (playing: boolean) => void,
  options?: {
    slides?: readonly DomainSlide[];
    registry?: CanvasNodesRegistry | undefined;
    pitchDimensions?: { width: number; height: number; x?: number; y?: number };
    applyFrameToCanvas?: (
      timeMs: number,
      reg: CanvasNodesRegistry | undefined,
      w: number,
      h: number,
      synchronous?: boolean,
      offsetX?: number,
      offsetY?: number,
    ) => void;
    setActiveSlide?: (slideId: string) => void;
    setPlaybackIndices?: (
      slideIndex: number,
      transitionIndex: number | null,
    ) => void;
  },
) {
  refs.timelineRef.current?.pause();
  setIsPlaying(false);

  if (
    options?.slides &&
    options?.pitchDimensions &&
    options?.applyFrameToCanvas &&
    options?.setActiveSlide
  ) {
    snapToSlideOnStop({
      slides: options.slides,
      refs,
      registry: options.registry,
      pitchDimensions: options.pitchDimensions,
      applyFrameToCanvas: options.applyFrameToCanvas,
      setActiveSlide: options.setActiveSlide,
      setPlaybackIndices: options.setPlaybackIndices,
    });
  }
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
