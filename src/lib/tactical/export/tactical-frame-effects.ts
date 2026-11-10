import {
  computeArrowEffectState,
  computeRippleRings,
  computeZonePulseOpacity,
  type RippleRing,
} from '@/lib/tactical/effect-geometry';
import type {
  InterpolatedArrowState,
  InterpolatedZoneState,
} from '@/lib/tactical/interpolation-annotation';
import {
  getInterpolatedUnifiedSlideFrame,
  type InterpolatedPlayerState,
  type ResolveSyntheticDirectorCameraOptions,
  resolveEffectiveSlideSegments,
} from '@/lib/tactical/unified-interpolation';
import type { DirectorCameraTrack, Slide } from '@/lib/types/tactical-unified';

export interface ComputeFrameEffectsOptions {
  applyEffects?: boolean;
  effectTimeOverrideMs?: number;
  zones?: Record<string, InterpolatedZoneState>;
}

export interface FrameEffectsResult {
  effectArrows: Record<string, InterpolatedArrowState>;
  effectZones: Record<string, InterpolatedZoneState>;
  playerRings: Record<string, RippleRing[]>;
  timeInSlideMs: number;
}

/**
 * Returns true when any slide contains an active animated effect:
 * - Player ripple effect (style.markerEffect) or trajectory effect
 * - Arrow effect (effect.type !== 'none')
 * - Zone effect (effect.type !== 'none')
 */
export function hasActiveFrameEffects(slides: Slide[]): boolean {
  if (!slides || slides.length === 0) return false;
  return slides.some((slide) => {
    const hasPlayerEffect = slide.players?.some(
      (p) =>
        (p.style?.markerEffect?.type && p.style.markerEffect.type !== 'none') ||
        p.trajectoryEffect?.enabled,
    );
    const hasArrowEffect = slide.arrows?.some(
      (a) => a.effect?.type && a.effect.type !== 'none',
    );
    const hasZoneEffect = slide.zones?.some(
      (z) => z.effect?.type && z.effect.type !== 'none',
    );
    return Boolean(hasPlayerEffect || hasArrowEffect || hasZoneEffect);
  });
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
  if (hasActiveFrameEffects(slides)) return false;
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
  options?: ComputeFrameEffectsOptions,
): FrameEffectsResult {
  const applyEffects = options?.applyEffects ?? true;

  let elapsedInSegmentMs = timeMs;
  let activeSlide = slides[0];

  if (slides.length === 1) {
    activeSlide = slides[0];
    elapsedInSegmentMs = Math.max(0, timeMs);
  } else if (slides.length > 1) {
    const segments = resolveEffectiveSlideSegments(slides);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLastSegment = i === segments.length - 1;
      if (timeMs < seg.startTimeMs + seg.effectiveDurationMs || isLastSegment) {
        elapsedInSegmentMs = Math.max(0, timeMs - seg.startTimeMs);
        activeSlide = slides[seg.slideIndex - 1] ?? slides[0];
        break;
      }
    }
  }

  const timeInSlideMs =
    options?.effectTimeOverrideMs !== undefined
      ? Math.max(0, options.effectTimeOverrideMs)
      : elapsedInSegmentMs;

  if (!applyEffects) {
    const effectArrows: Record<string, InterpolatedArrowState> = {};
    for (const [arrowId, arrowState] of Object.entries(arrows)) {
      effectArrows[arrowId] = {
        ...arrowState,
        dashOffset: 0,
        progress: 1,
      };
    }

    const effectZones: Record<string, InterpolatedZoneState> = {};
    if (options?.zones) {
      for (const [zoneId, zoneState] of Object.entries(options.zones)) {
        effectZones[zoneId] = {
          ...zoneState,
          effect: undefined,
        };
      }
    }

    return {
      effectArrows,
      effectZones,
      playerRings: {},
      timeInSlideMs: 0,
    };
  }

  const effectArrows: Record<string, InterpolatedArrowState> = {};
  for (const [arrowId, arrowState] of Object.entries(arrows)) {
    const activeArrow =
      activeSlide?.arrows?.find((a) => a.id === arrowId) ??
      slides[nextSlideIndex]?.arrows?.find((a) => a.id === arrowId);

    const arrowCfg = activeArrow?.effect ?? arrowState.effect;

    if (arrowState.progress !== undefined && !arrowCfg) {
      effectArrows[arrowId] = arrowState;
      continue;
    }

    const effectState = computeArrowEffectState(timeInSlideMs, arrowCfg);
    effectArrows[arrowId] = {
      ...arrowState,
      progress: effectState.progress,
      opacity: arrowState.opacity * effectState.opacity,
      visible: arrowState.visible && effectState.visible,
      dashOffset: effectState.dashOffset,
    };
  }

  const effectZones: Record<string, InterpolatedZoneState> = {};
  if (options?.zones) {
    for (const [zoneId, zoneState] of Object.entries(options.zones)) {
      const activeZone =
        activeSlide?.zones?.find((z) => z.id === zoneId) ??
        slides[nextSlideIndex]?.zones?.find((z) => z.id === zoneId);
      const zoneCfg = activeZone?.effect ?? zoneState.effect;
      if (zoneCfg && zoneCfg.type !== 'none') {
        effectZones[zoneId] = {
          ...zoneState,
          opacity: computeZonePulseOpacity(
            timeInSlideMs,
            zoneCfg,
            zoneState.opacity,
          ),
          effect: undefined,
        };
      } else {
        effectZones[zoneId] = zoneState;
      }
    }
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

  return { effectArrows, effectZones, playerRings, timeInSlideMs };
}
