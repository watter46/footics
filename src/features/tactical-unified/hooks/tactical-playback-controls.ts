import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import {
  getInterpolatedUnifiedSlideFrame,
  resolveEffectiveSlideSegments,
} from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';
import type { AnimationPlaybackRefs } from './tactical-animation-canvas';

/**
 * 特定スライドインデックスへの到達完了（静止開始）時刻 (ms) を計算
 */
export function getSlideSnapTime(slides: Slide[], targetIndex: number): number {
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
  slides: Slide[];
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
  const frame = getInterpolatedUnifiedSlideFrame(slides, currentTime);

  // 遷移中 (0 < progress < 1 かつ !isPaused) なら直後シーン (nextSlideIndex) にスナップ
  // pause 時間中または完了時なら currentSlideIndex に留まる
  const isTransitioning =
    !frame.isPaused &&
    frame.progress < 1 &&
    frame.currentSlideIndex !== frame.nextSlideIndex;

  if (isTransitioning) {
    const targetIndex = frame.nextSlideIndex;
    const snapTimeMs = getSlideSnapTime(slides, targetIndex);
    refs.currentPlaybackTimeRef.current = snapTimeMs;
    refs.lastActiveSlideIndexRef.current = targetIndex;
    refs.lastPlaybackIndicesRef.current = {
      slideIndex: targetIndex,
      transitionIndex: null,
    };

    if (refs.timelineRef.current) {
      refs.timelineRef.current.seek(snapTimeMs / 1000, false);
    }

    const targetSlide = slides[targetIndex];
    if (targetSlide) {
      setActiveSlide(targetSlide.id);
    }

    setPlaybackIndices?.(targetIndex, null);

    applyFrameToCanvas(
      snapTimeMs,
      registry,
      pitchDimensions.width,
      pitchDimensions.height,
      false,
      pitchDimensions.x ?? 0,
      pitchDimensions.y ?? 0,
    );
  } else {
    const targetIndex = frame.currentSlideIndex;
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
  slides?: Slide[];
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
      false,
      pitchDimensions.x ?? 0,
      pitchDimensions.y ?? 0,
    );
  }
}

export function pausePlayback(
  refs: AnimationPlaybackRefs,
  setIsPlaying: (playing: boolean) => void,
  options?: {
    slides?: Slide[];
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
    options?.registry &&
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
