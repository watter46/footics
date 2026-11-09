import {
  computeArrowEffectState,
  computeRippleRings,
  type RippleRing,
} from '@/lib/tactical/effect-geometry';
import {
  getInterpolatedUnifiedSlideFrame,
  type InterpolatedArrowState,
  type InterpolatedPlayerState,
  type ResolveSyntheticDirectorCameraOptions,
  resolveEffectiveSlideSegments,
} from '@/lib/tactical/unified-interpolation';
import type { DirectorCameraTrack, Slide } from '@/lib/types/tactical-unified';

export interface FrameEffectsResult {
  effectArrows: Record<string, InterpolatedArrowState>;
  playerRings: Record<string, RippleRing[]>;
  timeInSlideMs: number;
}

/**
 * Returns true when `timeMs` falls within a `pauseMs` (static freeze) interval
 * between two slides, meaning the canvas content is identical to the previous frame.
 * Used by the VideoFrame.clone() static-frame cache to skip redundant GPU re-uploads.
 */
export function isPauseFrame(
  slides: Slide[],
  timeMs: number,
  directorCamera?: DirectorCameraTrack | null,
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions,
): boolean {
  if (slides.length <= 1) return false;
  const frame = getInterpolatedUnifiedSlideFrame(
    slides,
    timeMs,
    directorCamera,
    directorCameraOptions,
  );
  return frame.isPaused;
}

export function computeFrameEffects(
  slides: Slide[],
  timeMs: number,
  arrows: Record<string, InterpolatedArrowState>,
  players: Record<string, InterpolatedPlayerState>,
  nextSlideIndex: number,
  baseDim: number,
): FrameEffectsResult {
  let timeInSlideMs = timeMs;
  let activeSlide = slides[0];

  if (slides.length > 1) {
    const segments = resolveEffectiveSlideSegments(slides);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLastSegment = i === segments.length - 1;
      if (timeMs < seg.startTimeMs + seg.effectiveDurationMs || isLastSegment) {
        timeInSlideMs = Math.max(0, timeMs - seg.startTimeMs);
        activeSlide = slides[seg.slideIndex - 1] ?? slides[0];
        break;
      }
    }
  }

  const effectArrows: Record<string, InterpolatedArrowState> = {};
  for (const [arrowId, arrowState] of Object.entries(arrows)) {
    const originalArrow =
      activeSlide?.arrows.find((a) => a.id === arrowId) ??
      slides[nextSlideIndex]?.arrows.find((a) => a.id === arrowId);

    if (arrowState.progress !== undefined && !originalArrow?.effect) {
      effectArrows[arrowId] = arrowState;
      continue;
    }

    const effectState = computeArrowEffectState(
      timeInSlideMs,
      originalArrow?.effect,
    );
    effectArrows[arrowId] = {
      ...arrowState,
      progress: effectState.progress,
      opacity: arrowState.opacity * effectState.opacity,
      visible: arrowState.visible && effectState.visible,
      dashOffset: effectState.dashOffset,
    };
  }

  const playerRings: Record<string, RippleRing[]> = {};
  for (const [id, p] of Object.entries(players)) {
    if (p.style?.markerEffect && p.style.markerEffect.type === 'ripple') {
      const sizeScale =
        (p as { scale?: number }).scale ?? p.style?.sizeScale ?? 1.0;
      const radius = Math.max(8, Math.round(baseDim * 0.032 * sizeScale));
      playerRings[id] = computeRippleRings(
        timeInSlideMs,
        p.style.markerEffect,
        radius,
      );
    }
  }

  return { effectArrows, playerRings, timeInSlideMs };
}
