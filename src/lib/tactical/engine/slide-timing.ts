import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { CameraTransitionMode } from '@/lib/types/tactical-unified';

export type SlideTimingLike = {
  transitionDurationMs?: number;
  pauseMs?: number;
  cameraTransitionMode?: CameraTransitionMode;
  cameraDurationMs?: number;
  duration?: number;
  pauseDuration?: number;
};

export interface EffectiveSlideSegment {
  slideIndex: number;
  startTimeMs: number;
  effectiveDurationMs: number;
  playerMoveMs: number;
  playerPauseMs: number;
  cameraSpanStartSlideIdx: number;
  cameraSpanEndSlideIdx: number;
  cameraSpanStartTimeMs: number;
  cameraSpanDurationMs: number;
  cameraMode: CameraTransitionMode;
}

interface RawSegment {
  slideIndex: number;
  playerMoveMs: number;
  playerPauseMs: number;
  baseDurationMs: number;
  cameraMode: CameraTransitionMode;
  cameraDurationMs?: number;
}

export function resolveEffectiveSlideSegments(
  slides: readonly (DomainSlide | SlideTimingLike)[],
): EffectiveSlideSegment[] {
  if (slides.length <= 1) return [];
  const rawSegments: RawSegment[] = [];
  for (let i = 1; i < slides.length; i++) {
    const slide = slides[i];
    const playerMoveMs = Math.max(100, slide.transitionDurationMs ?? 1000);
    const playerPauseMs = Math.max(0, slide.pauseMs ?? 500);
    rawSegments.push({
      slideIndex: i,
      playerMoveMs,
      playerPauseMs,
      baseDurationMs: playerMoveMs + playerPauseMs,
      cameraMode: slide.cameraTransitionMode ?? 'sync',
      cameraDurationMs: slide.cameraDurationMs,
    });
  }

  const spans: { segStart: number; segEnd: number }[] = [];
  let i = 0;
  while (i < rawSegments.length) {
    const startIndex = i;
    while (
      i < rawSegments.length - 1 &&
      rawSegments[i].cameraMode === 'continuous'
    ) {
      i++;
    }
    const spanStart = rawSegments[startIndex].slideIndex;
    const spanEnd = rawSegments[i].slideIndex;
    if (rawSegments[i].cameraMode === 'continuous' && spans.length > 0) {
      const prevSpan = spans[spans.length - 1];
      const prevSeg = rawSegments.find((r) => r.slideIndex === prevSpan.segEnd);
      if (prevSeg && prevSeg.cameraMode === 'slow') {
        prevSpan.segEnd = spanEnd;
        i++;
        continue;
      }
    }
    spans.push({ segStart: spanStart, segEnd: spanEnd });
    i++;
  }

  const segmentMap = new Map<number, EffectiveSlideSegment>();
  let accumulatedStartTime = 0;

  for (const span of spans) {
    const spanRawSegs = rawSegments.filter(
      (s) => s.slideIndex >= span.segStart && s.slideIndex <= span.segEnd,
    );
    const segStartRaw = spanRawSegs[0];
    const segEndRaw = spanRawSegs[spanRawSegs.length - 1];

    let cameraSpanDurationMs: number;
    if (segEndRaw.cameraMode === 'slow') {
      cameraSpanDurationMs = Math.max(500, segEndRaw.cameraDurationMs ?? 10000);
    } else if (segStartRaw.cameraMode === 'slow') {
      cameraSpanDurationMs = Math.max(
        500,
        segStartRaw.cameraDurationMs ?? 10000,
      );
    } else {
      const intermediateSum = spanRawSegs
        .slice(0, -1)
        .reduce((sum, s) => sum + s.baseDurationMs, 0);
      cameraSpanDurationMs = intermediateSum + segEndRaw.playerMoveMs;
    }

    const cameraSpanStartTimeMs = accumulatedStartTime;
    let precedingSpanDurationMs = 0;

    for (let idx = 0; idx < spanRawSegs.length; idx++) {
      const raw = spanRawSegs[idx];
      const isLastInSpan = idx === spanRawSegs.length - 1;
      const effectiveDurationMs = isLastInSpan
        ? Math.max(
            raw.baseDurationMs,
            cameraSpanDurationMs - precedingSpanDurationMs,
          )
        : raw.baseDurationMs;

      segmentMap.set(raw.slideIndex, {
        slideIndex: raw.slideIndex,
        startTimeMs: accumulatedStartTime,
        effectiveDurationMs,
        playerMoveMs: raw.playerMoveMs,
        playerPauseMs: raw.playerPauseMs,
        cameraSpanStartSlideIdx: span.segStart,
        cameraSpanEndSlideIdx: span.segEnd,
        cameraSpanStartTimeMs,
        cameraSpanDurationMs,
        cameraMode: raw.cameraMode,
      });
      accumulatedStartTime += effectiveDurationMs;
      precedingSpanDurationMs += effectiveDurationMs;
    }
  }

  return rawSegments.map((r) => segmentMap.get(r.slideIndex)!);
}

export function calculateUnifiedTotalDuration(
  slides: readonly (DomainSlide | SlideTimingLike)[],
): number {
  if (slides.length <= 1) return 0;
  return resolveEffectiveSlideSegments(slides).reduce(
    (sum, seg) => sum + seg.effectiveDurationMs,
    0,
  );
}

export function resolvePlaybackDurationMs(
  slides: readonly (DomainSlide | SlideTimingLike)[],
): number {
  if (!slides || slides.length === 0) return 0;
  if (slides.length === 1) {
    const s = slides[0] as SlideTimingLike;
    const dur =
      s.duration ??
      (s.transitionDurationMs !== undefined
        ? s.transitionDurationMs / 1000
        : 2);
    const pause =
      s.pauseDuration ?? (s.pauseMs !== undefined ? s.pauseMs / 1000 : 1);
    return Math.max(1000, (dur + pause) * 1000);
  }
  return calculateUnifiedTotalDuration(slides);
}
