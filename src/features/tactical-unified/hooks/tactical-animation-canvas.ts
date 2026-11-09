import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  defaultTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { computeArrowEffectState } from '@/lib/tactical/effect-geometry';
import {
  getInterpolatedUnifiedSlideFrame,
  resolveEffectiveSlideSegments,
} from '@/lib/tactical/unified-interpolation';
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
      arrowState.dashOffset = effectState.dashOffset;
    }
  }

  const effectZones = { ...frame.zones };
  for (const [zoneId, zoneState] of Object.entries(effectZones)) {
    if (!isPlaying) {
      // 再生停止時は通常描画
    } else {
      const originalZone =
        activeSlide?.zones?.find((z) => z.id === zoneId) ??
        currentSlides[frame.nextSlideIndex]?.zones?.find(
          (z) => z.id === zoneId,
        );
      if (originalZone?.effect) {
        zoneState.effect = originalZone.effect;
      }
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
        const trajectoryMarkers = playerGroup.find('.trajectory-start-marker');
        for (const marker of trajectoryMarkers) {
          if (typeof marker.visible === 'function') {
            marker.visible(false);
          }
        }
        const trajectoryLines = playerGroup.find('.trajectory-line');
        for (const line of trajectoryLines) {
          if (typeof line.visible === 'function') {
            line.visible(false);
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
