/**
 * unified-interpolation.ts
 * Unified Tactical Canvas — Animation Interpolation & Zone Vertex Morphing Engine
 *
 * Responsibilities:
 *   - スライド間の時間・イージング進捗計算
 *   - 選手・ボール・矢印・テキストの座標・属性補間 (Lerp / Bezier)
 *   - ゾーン頂点モーフィング (Zone Vertex Morphing - 多角形/Rect/Ellipse 変形連動)
 *   - ピッチ ⇄ ベンチのフェード遷移
 */

import type { Slide } from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';
import {
  type InterpolatedArrowState,
  type InterpolatedTextState,
  type InterpolatedZoneState,
  interpolateArrow,
  interpolateText,
  interpolateZone,
} from './interpolation-annotation';
import {
  BALL_ROTATION_FACTOR,
  calculateAccumulatedBallRotation,
  type InterpolatedBallState,
  interpolateBall,
} from './interpolation-ball';
import {
  type InterpolatedPitchTransformState,
  interpolatePitchTransform,
  resolveCameraAtTime,
  resolveEffectiveSlideSegments,
} from './interpolation-camera';
import {
  type InterpolatedPlayerState,
  interpolatePlayer,
  matchSlidePlayers,
} from './interpolation-player';

export * from './interpolation-annotation';
export * from './interpolation-ball';
export * from './interpolation-camera';
// Re-export submodules to preserve public API without breaking changes
export * from './interpolation-geometry';
export * from './interpolation-player';

export interface InterpolatedUnifiedFrame {
  players: Record<string, InterpolatedPlayerState>;
  ball: InterpolatedBallState;
  zones: Record<string, InterpolatedZoneState>;
  arrows: Record<string, InterpolatedArrowState>;
  texts: Record<string, InterpolatedTextState>;
  pitchTransform: InterpolatedPitchTransformState;
  currentSlideIndex: number;
  nextSlideIndex: number;
  progress: number;
  isPaused: boolean;
}

/**
 * 全スライドの総再生時間 (ms) を計算
 */
export function calculateUnifiedTotalDuration(slides: Slide[]): number {
  if (slides.length <= 1) return 0;
  const segments = resolveEffectiveSlideSegments(slides);
  return segments.reduce((sum, seg) => sum + seg.effectiveDurationMs, 0);
}

const EMPTY_FRAME: InterpolatedUnifiedFrame = {
  players: {},
  ball: { x: 50, y: 50, visible: true, opacity: 1, rotation: 0 },
  zones: {},
  arrows: {},
  texts: {},
  pitchTransform: {
    panX: 0,
    panY: 0,
    zoom: 1,
    tilt: 0,
    yaw: 90,
    isLocked: false,
  },
  currentSlideIndex: 0,
  nextSlideIndex: 0,
  progress: 0,
  isPaused: false,
};

/**
 * 指定時間 (timeMs) における全オブジェクトの補間フレーム状態を計算
 */
export function getInterpolatedUnifiedSlideFrame(
  slides: Slide[],
  timeMs: number,
): InterpolatedUnifiedFrame {
  if (slides.length === 0) return EMPTY_FRAME;

  if (slides.length === 1) {
    const slide = slides[0];
    const players = Object.fromEntries(
      slide.players.map((p) => [p.id, interpolatePlayer(p, p, 0)!]),
    );
    const zones = Object.fromEntries(
      slide.zones.map((z) => [z.id, interpolateZone(z, z, 0)!]),
    );
    const arrows = Object.fromEntries(
      slide.arrows.map((a) => [a.id, interpolateArrow(a, a, 0)!]),
    );
    const texts = Object.fromEntries(
      slide.texts.map((t) => [t.id, interpolateText(t, t, 0)!]),
    );

    return {
      players,
      ball: {
        x: slide.ball?.x ?? 50,
        y: slide.ball?.y ?? 50,
        visible: slide.ball?.visible ?? true,
        opacity: 1,
        rotation: 0,
      },
      zones,
      arrows,
      texts,
      pitchTransform: interpolatePitchTransform(
        slide.pitchTransform,
        slide.pitchTransform,
        0,
      ),
      currentSlideIndex: 0,
      nextSlideIndex: 0,
      progress: 0,
      isPaused: false,
    };
  }

  // スライド区間の特定
  const segments = resolveEffectiveSlideSegments(slides);
  let currentSlideIdx = 0;
  let nextSlideIdx = 1;
  let elapsedInSegment = 0;
  let activeSegment = segments[0];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLastSegment = i === segments.length - 1;
    if (timeMs < seg.startTimeMs + seg.effectiveDurationMs || isLastSegment) {
      currentSlideIdx = seg.slideIndex - 1;
      nextSlideIdx = seg.slideIndex;
      elapsedInSegment = Math.max(0, timeMs - seg.startTimeMs);
      activeSegment = seg;
      break;
    }
  }

  const slideA = slides[currentSlideIdx];
  const slideB = slides[nextSlideIdx];
  const segmentSlide = slideB ?? slides[0];

  const transitionDuration = Math.max(100, activeSegment.playerMoveMs);

  let rawT = elapsedInSegment / transitionDuration;
  const isPlayerPaused = rawT >= 1;
  if (rawT > 1) rawT = 1;

  const ease = applyEasing(rawT, segmentSlide.easing ?? 'ease-in-out');

  // カメラ補間（Slow / Continuous / Cut / Sync）
  const { pitchTransform, isCameraMoving } = resolveCameraAtTime(
    slides,
    segments,
    activeSegment,
    timeMs,
    elapsedInSegment,
  );

  // 1. Players 補間 (ID / 背番号 / 名前マッチングによるスムーズモーフィング)
  const players: Record<string, InterpolatedPlayerState> = {};
  const matchedPairs = matchSlidePlayers(slideA.players, slideB.players);

  matchedPairs.forEach(({ key, playerA, playerB }) => {
    const interpolated = interpolatePlayer(playerA, playerB, ease);
    if (interpolated) {
      players[key] = interpolated;
    }
  });

  // 2. Ball 補間
  const accumulatedRotation = calculateAccumulatedBallRotation(
    slides,
    currentSlideIdx,
  );
  const ball = interpolateBall(
    slideA.ball,
    slideB.ball,
    ease,
    accumulatedRotation,
  );

  // 3. Zones 補間 (Vertex Morphing)
  const zones: Record<string, InterpolatedZoneState> = {};
  const zoneMapA = new Map(slideA.zones.map((z) => [z.id, z]));
  const zoneMapB = new Map(slideB.zones.map((z) => [z.id, z]));
  const allZoneIds = new Set([...zoneMapA.keys(), ...zoneMapB.keys()]);

  allZoneIds.forEach((id) => {
    const zA = zoneMapA.get(id);
    const zB = zoneMapB.get(id);
    const interpolated = interpolateZone(zA, zB, ease);
    if (interpolated) zones[id] = interpolated;
  });

  // 4. Arrows 補間
  const arrows: Record<string, InterpolatedArrowState> = {};
  const arrowMapA = new Map(slideA.arrows.map((a) => [a.id, a]));
  const arrowMapB = new Map(slideB.arrows.map((a) => [a.id, a]));
  const allArrowIds = new Set([...arrowMapA.keys(), ...arrowMapB.keys()]);

  allArrowIds.forEach((id) => {
    const aA = arrowMapA.get(id);
    const aB = arrowMapB.get(id);
    const interpolated = interpolateArrow(aA, aB, ease);
    if (interpolated) arrows[id] = interpolated;
  });

  // 5. Texts 補間
  const texts: Record<string, InterpolatedTextState> = {};
  const textMapA = new Map(slideA.texts.map((t) => [t.id, t]));
  const textMapB = new Map(slideB.texts.map((t) => [t.id, t]));
  const allTextIds = new Set([...textMapA.keys(), ...textMapB.keys()]);

  allTextIds.forEach((id) => {
    const tA = textMapA.get(id);
    const tB = textMapB.get(id);
    const interpolated = interpolateText(tA, tB, ease);
    if (interpolated) texts[id] = interpolated;
  });

  const totalDurationMs = calculateUnifiedTotalDuration(slides);
  const isPastTotal = totalDurationMs > 0 && timeMs >= totalDurationMs;
  const isPaused = (isPlayerPaused && !isCameraMoving) || isPastTotal;

  const resolvedCurrentSlideIndex = isPastTotal
    ? slides.length - 1
    : isPaused
      ? nextSlideIdx
      : currentSlideIdx;
  const resolvedNextSlideIndex = isPastTotal
    ? slides.length - 1
    : isPaused
      ? nextSlideIdx
      : nextSlideIdx;

  return {
    players,
    ball,
    zones,
    arrows,
    texts,
    pitchTransform,
    currentSlideIndex: resolvedCurrentSlideIndex,
    nextSlideIndex: resolvedNextSlideIndex,
    progress: rawT,
    isPaused,
  };
}
