import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  defaultTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { computeFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
import {
  batchDrawLayers,
  updateArrowNodes,
  updateBallNode,
  updatePlayerNodes,
  updateTextNodes,
  updateZoneNodes,
} from './animation-node-updater';

export * from './tactical-timeline';

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

  const isPlaying = storeApi.getState().isPlaying;

  if (frame.currentSlideIndex !== lastActiveSlideIndexRef.current) {
    lastActiveSlideIndexRef.current = frame.currentSlideIndex;
    if (!isPlaying) {
      const targetSlide = currentSlides[frame.currentSlideIndex];
      if (targetSlide && targetSlide.id !== storeApi.getState().activeSlideId) {
        setActiveSlide(targetSlide.id);
      }
    }
  }

  const { effectArrows, effectZones, timeInSlideMs } = computeFrameEffects(
    currentSlides,
    timeMs,
    frame.arrows,
    frame.players,
    frame.nextSlideIndex,
    stageWidth,
    { applyEffects: isPlaying, zones: frame.zones },
  );

  if (!isPlaying) {
    for (const arrowState of Object.values(effectArrows)) {
      arrowState.opacity = 1.0;
      arrowState.visible = true;
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
    effectZones,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
    timeInSlideMs,
  );
  updateArrowNodes(
    effectArrows,
    registry,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
    frame.players,
    isPlaying,
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
