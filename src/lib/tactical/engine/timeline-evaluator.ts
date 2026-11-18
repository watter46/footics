import {
  computeArrowEffectState,
  computeZonePulseOpacity,
} from '@/lib/tactical/effect-geometry';
import {
  type Milliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import { applyEasing } from './easing';
import { interpolateSlide } from './slide-interpolator';

export interface EvaluatedTimelineFrame {
  readonly slideIndex: number;
  readonly nextSlideIndex: number;
  readonly progress: number;
  readonly easedProgress: number;
  readonly isPaused: boolean;
  readonly timeInSlideMs: number;
  readonly slide: DomainSlide;
  readonly transitionSourceSlide?: DomainSlide | null;
  readonly transitionTargetSlide?: DomainSlide | null;
  readonly arrowProgressMap: Readonly<
    Record<
      string,
      {
        readonly progress: number;
        readonly dashOffset: number;
        readonly opacity: number;
        readonly visible: boolean;
      }
    >
  >;
  readonly zoneOpacityMap: Readonly<
    Record<string, { readonly opacity: number; readonly visible: boolean }>
  >;
  readonly playerOpacityMap: Readonly<
    Record<string, { readonly opacity: number; readonly visible: boolean }>
  >;
}

function applyEffectsToMaps(
  slide: DomainSlide,
  timeInSlideMs: number,
  baseArrowProgressMap: Record<
    string,
    { progress: number; dashOffset: number; opacity: number; visible: boolean }
  >,
  baseZoneOpacityMap: Record<string, { opacity: number; visible: boolean }>,
  basePlayerOpacityMap: Record<string, { opacity: number; visible: boolean }>,
) {
  const arrowProgressMap = { ...baseArrowProgressMap };
  for (const arrow of slide.arrows) {
    if (arrow.effect && arrow.effect.type !== 'none') {
      const effectState = computeArrowEffectState(timeInSlideMs, arrow.effect);
      const current = arrowProgressMap[arrow.id] ?? {
        progress: 1,
        dashOffset: 0,
        opacity: 1,
        visible: true,
      };
      arrowProgressMap[arrow.id] = {
        progress: effectState.progress,
        dashOffset: effectState.dashOffset ?? 0,
        opacity: current.opacity * effectState.opacity,
        visible: current.visible && effectState.visible,
      };
    }
  }

  const zoneOpacityMap = { ...baseZoneOpacityMap };
  for (const zone of slide.zones) {
    if (zone.effect && zone.effect.type !== 'none') {
      const current = zoneOpacityMap[zone.id] ?? {
        opacity: zone.opacity,
        visible: zone.opacity > 0,
      };
      const pulsedOpacity = computeZonePulseOpacity(
        timeInSlideMs,
        zone.effect,
        current.opacity,
      );
      zoneOpacityMap[zone.id] = {
        opacity: pulsedOpacity,
        visible: pulsedOpacity > 0,
      };
    }
  }

  return {
    arrowProgressMap,
    zoneOpacityMap,
    playerOpacityMap: basePlayerOpacityMap,
  };
}

export function evaluateStaticSlideFrame(
  slide: DomainSlide,
  slideIndex: number = slide.index ?? 0,
): EvaluatedTimelineFrame {
  const arrowProgressMap = Object.fromEntries(
    slide.arrows.map((a) => [
      a.id,
      { progress: 1, dashOffset: 0, opacity: 1, visible: true },
    ]),
  );
  const zoneOpacityMap = Object.fromEntries(
    slide.zones.map((z) => [
      z.id,
      { opacity: z.opacity, visible: z.opacity > 0 },
    ]),
  );
  const playerOpacityMap = Object.fromEntries(
    slide.players.map((p) => [
      p.id,
      { opacity: 1, visible: p.area === 'pitch' },
    ]),
  );

  return {
    slideIndex,
    nextSlideIndex: slideIndex,
    progress: 0,
    easedProgress: 0,
    isPaused: true,
    timeInSlideMs: 0,
    slide,
    transitionSourceSlide: null,
    transitionTargetSlide: null,
    arrowProgressMap,
    zoneOpacityMap,
    playerOpacityMap,
  };
}

export function evaluateTimelineFrame(
  phase: DomainTacticalPhase,
  timeMs: Milliseconds,
): EvaluatedTimelineFrame {
  const slides = phase.slides;
  if (!slides || slides.length === 0) {
    const dummySlide: DomainSlide = {
      id: 'empty',
      index: 0,
      players: [],
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: toScreenNormCoord(50),
        y: toScreenNormCoord(50),
        visible: true,
      },
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'linear',
    };
    return evaluateStaticSlideFrame(dummySlide, 0);
  }

  if (slides.length === 1) {
    const staticFrame = evaluateStaticSlideFrame(slides[0], 0);
    const timeInSlideMs = Math.max(0, timeMs as number);
    const effects = applyEffectsToMaps(
      slides[0],
      timeInSlideMs,
      staticFrame.arrowProgressMap,
      staticFrame.zoneOpacityMap,
      staticFrame.playerOpacityMap,
    );
    return { ...staticFrame, timeInSlideMs, ...effects };
  }

  const segments = slides.slice(0, -1).map((sA, i) => {
    const pauseMs = Math.max(0, sA.pauseMs ?? 500);
    const transitionMs = Math.max(100, sA.transitionDurationMs ?? 1000);
    return {
      segIndex: i,
      pauseMs,
      transitionMs,
      totalMs: pauseMs + transitionMs,
    };
  });

  const totalDurationMs = segments.reduce((sum, s) => sum + s.totalMs, 0);
  const currentTimeMs = Math.max(0, timeMs as number);

  if (currentTimeMs >= totalDurationMs) {
    const lastIndex = slides.length - 1;
    const lastSlide = slides[lastIndex];
    const staticFrame = evaluateStaticSlideFrame(lastSlide, lastIndex);
    const timeInSlideMs =
      currentTimeMs - (totalDurationMs - segments[segments.length - 1].totalMs);
    const effects = applyEffectsToMaps(
      lastSlide,
      timeInSlideMs,
      staticFrame.arrowProgressMap,
      staticFrame.zoneOpacityMap,
      staticFrame.playerOpacityMap,
    );

    return {
      slideIndex: lastIndex,
      nextSlideIndex: lastIndex,
      progress: 1,
      easedProgress: 1,
      isPaused: true,
      timeInSlideMs,
      slide: lastSlide,
      transitionSourceSlide: null,
      transitionTargetSlide: null,
      ...effects,
    };
  }

  let accumulatedMs = 0;
  let activeSeg = { ...segments[0], startMs: 0 };
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1;
    if (currentTimeMs < accumulatedMs + seg.totalMs || isLast) {
      activeSeg = { ...seg, startMs: accumulatedMs };
      break;
    }
    accumulatedMs += seg.totalMs;
  }

  const elapsedInSeg = Math.max(0, currentTimeMs - activeSeg.startMs);
  const timeInSlideMs = elapsedInSeg;
  const slideA = slides[activeSeg.segIndex];
  const slideB = slides[activeSeg.segIndex + 1];

  let progress = 0;
  let easedProgress = 0;
  let isPaused = false;
  let slide: DomainSlide;
  let transitionSourceSlide: DomainSlide | null = null;
  let transitionTargetSlide: DomainSlide | null = null;
  let baseArrowMap: Record<
    string,
    { progress: number; dashOffset: number; opacity: number; visible: boolean }
  >;
  let baseZoneMap: Record<string, { opacity: number; visible: boolean }>;
  let basePlayerMap: Record<string, { opacity: number; visible: boolean }>;

  if (elapsedInSeg < activeSeg.pauseMs) {
    progress = 0;
    easedProgress = 0;
    isPaused = true;
    slide = slideA;
    const staticFrame = evaluateStaticSlideFrame(slideA, activeSeg.segIndex);
    baseArrowMap = { ...staticFrame.arrowProgressMap };
    baseZoneMap = { ...staticFrame.zoneOpacityMap };
    basePlayerMap = { ...staticFrame.playerOpacityMap };
  } else {
    const rawT = Math.min(
      1,
      Math.max(0, (elapsedInSeg - activeSeg.pauseMs) / activeSeg.transitionMs),
    );
    progress = rawT;
    isPaused = rawT >= 1;
    const ease = applyEasing(rawT, slideA.easing ?? 'linear');
    easedProgress = ease;
    if (rawT < 1) {
      transitionSourceSlide = slideA;
      transitionTargetSlide = slideB;
    }

    const interpolated = interpolateSlide(slideA, slideB, ease);
    slide = interpolated.slide;
    baseArrowMap = interpolated.arrowProgressMap;
    baseZoneMap = interpolated.zoneOpacityMap;
    basePlayerMap = interpolated.playerOpacityMap;
  }
  const effects = applyEffectsToMaps(
    slide,
    timeInSlideMs,
    baseArrowMap,
    baseZoneMap,
    basePlayerMap,
  );

  return {
    slideIndex: activeSeg.segIndex,
    nextSlideIndex: activeSeg.segIndex + 1,
    progress,
    easedProgress,
    isPaused,
    timeInSlideMs,
    slide,
    transitionSourceSlide,
    transitionTargetSlide,
    ...effects,
  };
}
