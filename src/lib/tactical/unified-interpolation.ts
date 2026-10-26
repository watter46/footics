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

/**
 * 指定時間 (timeMs) における全オブジェクトの補間フレーム状態を計算
 */
export function getInterpolatedUnifiedSlideFrame(
  slides: Slide[],
  timeMs: number,
): InterpolatedUnifiedFrame {
  if (slides.length === 0) {
    return {
      players: {},
      ball: { x: 50, y: 50, visible: true, opacity: 1 },
      zones: {},
      arrows: {},
      texts: {},
      currentSlideIndex: 0,
      nextSlideIndex: 0,
      progress: 0,
      isPaused: false,
    };
  }

  if (slides.length === 1) {
    const slide = slides[0];
    const players: Record<string, InterpolatedPlayerState> = {};
    slide.players.forEach((p) => {
      players[p.id] = {
        id: p.id,
        playerId: p.playerId,
        x: p.x,
        y: p.y,
        opacity: 1,
        visible: p.area === 'pitch',
        team: p.team,
        area: p.area,
        name: p.name,
        shirtNo: p.shirtNo,
        style: p.style,
        visionCone: p.visionCone,
        connectLines: p.connectLines,
        badges: p.badges,
        focus: p.focus,
        trajectory: p.trajectory,
      };
    });

    const zones: Record<string, InterpolatedZoneState> = {};
    slide.zones.forEach((z) => {
      zones[z.id] = {
        id: z.id,
        zoneType: z.zoneType,
        shapeType: z.shapeType || 'rect',
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height,
        rotation: z.rotation,
        points: z.points || [],
        color: z.color || '#f59e0b',
        opacity: z.opacity ?? 0.25,
        strokeColor: z.strokeColor,
        strokeWidth: z.strokeWidth || 0,
        label: z.label,
        visible: true,
      };
    });

    const arrows: Record<string, InterpolatedArrowState> = {};
    slide.arrows.forEach((a) => {
      arrows[a.id] = {
        id: a.id,
        arrowType: a.arrowType,
        curveType: a.curveType,
        points: a.points,
        controlPoint: a.controlPoint,
        color: a.color || '#ffffff',
        strokeWidth: a.strokeWidth || 3,
        opacity: 1,
        visible: true,
        sourcePlayerId: a.sourcePlayerId,
        targetPlayerId: a.targetPlayerId,
      };
    });

    const texts: Record<string, InterpolatedTextState> = {};
    slide.texts.forEach((t) => {
      texts[t.id] = {
        id: t.id,
        x: t.x,
        y: t.y,
        content: t.content,
        fontSize: t.fontSize || 16,
        color: t.color || '#ffffff',
        bold: t.bold || false,
        italic: t.italic || false,
        opacity: 1,
        visible: true,
      };
    });

    return {
      players,
      ball: {
        x: slide.ball?.x ?? 50,
        y: slide.ball?.y ?? 50,
        visible: slide.ball?.visible ?? true,
        opacity: 1,
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
  const ball = interpolateBall(slideA.ball, slideB.ball, ease);

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

  return {
    players,
    ball,
    zones,
    arrows,
    texts,
    currentSlideIndex: currentSlideIdx,
    nextSlideIndex: nextSlideIdx,
    progress: rawT,
    isPaused,
  };
}
