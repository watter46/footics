/**
 * interpolation-camera.ts
 * Tactical pitch camera interpolation, drift, and segment resolution.
 */

import type {
  CameraTransitionMode,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';

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
  const panXA = a?.panX ?? 0;
  const panXB = b?.panX ?? 0;
  const panYA = a?.panY ?? 0;
  const panYB = b?.panY ?? 0;
  const zoomA = a?.zoom ?? 1;
  const zoomB = b?.zoom ?? 1;
  const tiltA = a?.tilt ?? 0;
  const tiltB = b?.tilt ?? 0;
  const yawA = a?.yaw ?? 90;
  const yawB = b?.yaw ?? 90;
  return (
    Math.abs(panXA - panXB) > 0.001 ||
    Math.abs(panYA - panYB) > 0.001 ||
    Math.abs(zoomA - zoomB) > 0.001 ||
    Math.abs(tiltA - tiltB) > 0.001 ||
    Math.abs(yawA - yawB) > 0.001
  );
}

/**
 * スライド間のピッチカメラ変換（panX, panY, zoom, tilt, yaw, isLocked）を補間
 * 水平回転 yaw（0〜360度）は最短経路で補間
 */
export function interpolatePitchTransform(
  transformA?: PitchTransform | null,
  transformB?: PitchTransform | null,
  t = 0,
): InterpolatedPitchTransformState {
  const panXA = transformA?.panX ?? 0;
  const panXB = transformB?.panX ?? 0;
  const panYA = transformA?.panY ?? 0;
  const panYB = transformB?.panY ?? 0;
  const zoomA = transformA?.zoom ?? 1;
  const zoomB = transformB?.zoom ?? 1;
  const tiltA = transformA?.tilt ?? 0;
  const tiltB = transformB?.tilt ?? 0;
  const yawA = transformA?.yaw ?? 90;
  const yawB = transformB?.yaw ?? 90;
  const lockedA = transformA?.isLocked ?? false;
  const lockedB = transformB?.isLocked ?? false;

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

/**
 * スライド配列から各セグメントの実効時間およびカメラスパンを解決
 */
export function resolveEffectiveSlideSegments(
  slides: Slide[],
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
      let intermediateSum = 0;
      for (let k = 0; k < spanRawSegs.length - 1; k++) {
        intermediateSum += spanRawSegs[k].baseDurationMs;
      }
      cameraSpanDurationMs = intermediateSum + segEndRaw.playerMoveMs;
    }

    const cameraSpanStartTimeMs = accumulatedStartTime;
    let precedingSpanDurationMs = 0;

    for (let idx = 0; idx < spanRawSegs.length; idx++) {
      const raw = spanRawSegs[idx];
      const isLastInSpan = idx === spanRawSegs.length - 1;

      let effectiveDurationMs = raw.baseDurationMs;
      if (isLastInSpan) {
        effectiveDurationMs = Math.max(
          raw.baseDurationMs,
          cameraSpanDurationMs - precedingSpanDurationMs,
        );
      }

      const seg: EffectiveSlideSegment = {
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
      };

      segmentMap.set(raw.slideIndex, seg);
      accumulatedStartTime += effectiveDurationMs;
      precedingSpanDurationMs += effectiveDurationMs;
    }
  }

  return rawSegments.map((r) => segmentMap.get(r.slideIndex)!);
}

/**
 * 指定時間におけるカメラ姿勢および移動状態を算出
 */
export function resolveCameraAtTime(
  slides: Slide[],
  _segments: EffectiveSlideSegment[],
  activeSegment: EffectiveSlideSegment,
  timeMs: number,
  elapsedInSegment: number,
): {
  pitchTransform: InterpolatedPitchTransformState;
  isCameraMoving: boolean;
} {
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
    const isCameraMoving = rawT < 1 && hasDelta;
    return {
      pitchTransform: interpolatePitchTransform(transformA, transformB, easeT),
      isCameraMoving,
    };
  }

  // 3. Slow または Continuous を含むスパン
  const timeInSpan = timeMs - activeSegment.cameraSpanStartTimeMs;
  const spanDuration = Math.max(1, activeSegment.cameraSpanDurationMs);
  const rawCameraT = timeInSpan / spanDuration;
  const clampedCameraT = Math.min(1, Math.max(0, rawCameraT));

  const isCameraMoving = rawCameraT < 1 && hasDelta;
  return {
    pitchTransform: interpolatePitchTransform(
      transformA,
      transformB,
      clampedCameraT,
    ),
    isCameraMoving,
  };
}
