// Tactical pitch camera interpolation, drift, and segment resolution.
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type {
  CameraTransitionMode,
  DirectorCameraTrack,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';

export type SlideTimingLike = Pick<
  Slide,
  | 'transitionDurationMs'
  | 'pauseMs'
  | 'cameraTransitionMode'
  | 'cameraDurationMs'
>;

import { applyEasing } from './easing';
import {
  hasActiveDirectorCameraTrack,
  isDirectorCameraMoving,
  type ResolveSyntheticDirectorCameraOptions,
  resolveSyntheticDirectorCamera,
} from './interpolation-director';

export * from './interpolation-director';

export interface InterpolatedPitchTransformState {
  panX: number;
  panY: number;
  zoom: number;
  tilt: number;
  yaw: number;
  isLocked: boolean;
}

export interface EffectiveSlideSegment {
  slideIndex: number; // 1 .. slides.length - 1
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

export function hasCameraDelta(
  a?: PitchTransform | null,
  b?: PitchTransform | null,
): boolean {
  if (!a && !b) return false;
  return (
    Math.abs((a?.panX ?? 0) - (b?.panX ?? 0)) > 0.001 ||
    Math.abs((a?.panY ?? 0) - (b?.panY ?? 0)) > 0.001 ||
    Math.abs((a?.zoom ?? 1) - (b?.zoom ?? 1)) > 0.001 ||
    Math.abs((a?.tilt ?? 0) - (b?.tilt ?? 0)) > 0.001 ||
    Math.abs((a?.yaw ?? 90) - (b?.yaw ?? 90)) > 0.001
  );
}

/** スライド間のピッチカメラ変換を補間（水平回転 yaw は最短経路で補間） */
export function interpolatePitchTransform(
  transformA?: PitchTransform | null,
  transformB?: PitchTransform | null,
  t = 0,
): InterpolatedPitchTransformState {
  const [panXA, panXB] = [transformA?.panX ?? 0, transformB?.panX ?? 0];
  const [panYA, panYB] = [transformA?.panY ?? 0, transformB?.panY ?? 0];
  const [zoomA, zoomB] = [transformA?.zoom ?? 1, transformB?.zoom ?? 1];
  const [tiltA, tiltB] = [transformA?.tilt ?? 0, transformB?.tilt ?? 0];
  const [yawA, yawB] = [transformA?.yaw ?? 90, transformB?.yaw ?? 90];
  const [lockedA, lockedB] = [
    transformA?.isLocked ?? false,
    transformB?.isLocked ?? false,
  ];

  let deltaYaw = ((((yawB - yawA) % 360) + 540) % 360) - 180;
  if (deltaYaw === -180 && yawB > yawA) deltaYaw = 180;
  const rawYaw = yawA + deltaYaw * t;
  const yaw = ((rawYaw % 360) + 360) % 360;

  return {
    panX: panXA + (panXB - panXA) * t,
    panY: panYA + (panYB - panYA) * t,
    zoom: zoomA + (zoomB - zoomA) * t,
    tilt: tiltA + (tiltB - tiltA) * t,
    yaw,
    isLocked: t < 0.5 ? lockedA : lockedB,
  };
}

interface RawSegment {
  slideIndex: number;
  playerMoveMs: number;
  playerPauseMs: number;
  baseDurationMs: number;
  cameraMode: CameraTransitionMode;
  cameraDurationMs?: number;
}

interface Span {
  segStart: number;
  segEnd: number;
}

/** スライド配列から各セグメントの実効時間およびカメラスパンを解決 */
export function resolveEffectiveSlideSegments(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
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

  // スパンの検出
  const spans: Span[] = [];
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

    // 末尾が continuous で直前のスパンの終了が slow の場合は直前スパンに結合
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

/** 指定時間におけるカメラ姿勢および移動状態を算出 */
export function resolveCameraAtTime(
  slides: Slide[],
  _segments: EffectiveSlideSegment[],
  activeSegment: EffectiveSlideSegment,
  timeMs: number,
  elapsedInSegment: number,
  directorCamera?: DirectorCameraTrack | null,
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions,
): {
  pitchTransform: InterpolatedPitchTransformState;
  isCameraMoving: boolean;
} {
  if (hasActiveDirectorCameraTrack(directorCamera)) {
    return {
      pitchTransform: resolveSyntheticDirectorCamera(
        directorCamera,
        timeMs,
        directorCameraOptions,
      ),
      isCameraMoving: isDirectorCameraMoving(
        directorCamera,
        timeMs,
        directorCameraOptions,
      ),
    };
  }

  const slideA = slides[activeSegment.cameraSpanStartSlideIdx - 1];
  const slideB = slides[activeSegment.cameraSpanEndSlideIdx];
  const transformA = slideA?.pitchTransform;
  const transformB = slideB?.pitchTransform;
  const hasDelta = hasCameraDelta(transformA, transformB);

  // 1. Cut モード: 遷移開始時点で即座に目標スライドのカメラへ切り替え
  if (activeSegment.cameraMode === 'cut') {
    const destTransform = slides[activeSegment.slideIndex]?.pitchTransform;
    return {
      pitchTransform: interpolatePitchTransform(
        destTransform,
        destTransform,
        0,
      ),
      isCameraMoving: false,
    };
  }

  // 2. 単一セグメントかつ Sync モード
  const isSingleSync =
    activeSegment.cameraSpanStartSlideIdx ===
      activeSegment.cameraSpanEndSlideIdx &&
    activeSegment.cameraMode === 'sync';

  if (isSingleSync) {
    const rawT = elapsedInSegment / Math.max(1, activeSegment.playerMoveMs);
    const clampedRawT = Math.min(1, Math.max(0, rawT));
    const easeT = applyEasing(
      clampedRawT,
      slides[activeSegment.slideIndex]?.easing ?? 'ease-in-out',
    );
    return {
      pitchTransform: interpolatePitchTransform(transformA, transformB, easeT),
      isCameraMoving: rawT < 1 && hasDelta,
    };
  }

  // 3. Slow または Continuous を含むスパン
  const timeInSpan = timeMs - activeSegment.cameraSpanStartTimeMs;
  const spanDuration = Math.max(1, activeSegment.cameraSpanDurationMs);
  const rawCameraT = timeInSpan / spanDuration;
  const clampedCameraT = Math.min(1, Math.max(0, rawCameraT));

  return {
    pitchTransform: interpolatePitchTransform(
      transformA,
      transformB,
      clampedCameraT,
    ),
    isCameraMoving: rawCameraT < 1 && hasDelta,
  };
}
