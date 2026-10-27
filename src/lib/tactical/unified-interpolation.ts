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
  type InterpolatedPlayerState,
  interpolatePlayer,
  matchSlidePlayers,
} from './interpolation-player';

export * from './interpolation-annotation';
export * from './interpolation-ball';
// Re-export submodules to preserve public API without breaking changes
export * from './interpolation-geometry';
export * from './interpolation-player';

export interface InterpolatedUnifiedFrame {
  players: Record<string, InterpolatedPlayerState>;
  ball: InterpolatedBallState;
  zones: Record<string, InterpolatedZoneState>;
  arrows: Record<string, InterpolatedArrowState>;
  texts: Record<string, InterpolatedTextState>;
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
  return slides.slice(1).reduce((acc, slide) => {
    const duration = slide.transitionDurationMs ?? 1000;
    const pause = slide.pauseMs ?? 500;
    return acc + duration + pause;
  }, 0);
}

const EMPTY_FRAME: InterpolatedUnifiedFrame = {
  players: {},
  ball: { x: 50, y: 50, visible: true, opacity: 1, rotation: 0 },
  zones: {},
  arrows: {},
  texts: {},
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
      currentSlideIndex: 0,
      nextSlideIndex: 0,
      progress: 0,
      isPaused: false,
    };
  }

  // スライド区間の特定
  let accumulatedTime = 0;
  let currentSlideIdx = 0;
  let nextSlideIdx = 1;
  let elapsedInSegment = 0;
  let segmentSlide = slides[1] ?? slides[0];

  for (let i = 0; i < slides.length - 1; i++) {
    const s = slides[i + 1];
    const segDuration = (s.transitionDurationMs ?? 1000) + (s.pauseMs ?? 500);
    if (timeMs <= accumulatedTime + segDuration || i === slides.length - 2) {
      currentSlideIdx = i;
      nextSlideIdx = i + 1;
      elapsedInSegment = Math.max(0, timeMs - accumulatedTime);
      segmentSlide = s;
      break;
    }
    accumulatedTime += segDuration;
  }

  const slideA = slides[currentSlideIdx];
  const slideB = slides[nextSlideIdx];

  const transitionDuration = Math.max(
    100,
    segmentSlide.transitionDurationMs ?? 1000,
  );

  let rawT = elapsedInSegment / transitionDuration;
  const isPaused = rawT >= 1;
  if (rawT > 1) rawT = 1;

  const ease = applyEasing(rawT, segmentSlide.easing ?? 'ease-in-out');

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
    currentSlideIndex: resolvedCurrentSlideIndex,
    nextSlideIndex: resolvedNextSlideIndex,
    progress: rawT,
    isPaused: isPaused || isPastTotal,
  };
}
