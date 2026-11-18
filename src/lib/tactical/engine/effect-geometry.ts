import type {
  ArrowEffectConfig,
  MarkerEffectConfig,
  ZoneEffectConfig,
} from '@/lib/types/tactical/effect-config';
import type { NormalizedPoint } from '@/lib/types/tactical/primitives';
import { applyEasing } from './easing';

export interface ArrowEffectState {
  progress: number;
  opacity: number;
  visible: boolean;
  dashOffset?: number;
}

export interface TrimmedPointsResult {
  trimmedPoints: NormalizedPoint[];
  tipAngle: number;
}

export interface RippleRing {
  radius: number;
  opacity: number;
  color?: string;
}

/** 矢印の点線フロー用 dashOffset を算出（先端へ向かって流すため負方向） */
export const computeArrowFlowDashOffset = (
  timeInSlideMs: number,
  _config?: Partial<ArrowEffectConfig>,
  speed = 25,
): number => -(timeInSlideMs / 1000) * speed;

/** ゾーンのパルス用 opacity を算出 */
export function computeZonePulseOpacity(
  timeInSlideMs: number,
  config?: ZoneEffectConfig,
  baseOpacity = 0.25,
): number {
  if (!config || config.type !== 'pulse') return baseOpacity;
  const duration = Math.max(0.1, config.duration ?? 1.2);
  const minOpacity = config.minOpacity ?? 0.15;
  const maxOpacity = config.maxOpacity ?? 0.45;
  const cycle = timeInSlideMs / 1000 / duration;
  const pulse = (Math.sin(cycle * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  return minOpacity + pulse * (maxOpacity - minOpacity);
}

/**
 * スライド内時間とエフェクト設定から矢印のアニメーション描画状態を算出
 */
export function computeArrowEffectState(
  timeInSlideMs: number,
  config?: Partial<ArrowEffectConfig>,
): ArrowEffectState {
  if (!config || config.type === 'none') {
    return { progress: 1.0, opacity: 1.0, visible: true };
  }

  if (config.type === 'flow') {
    return {
      progress: 1.0,
      opacity: 1.0,
      visible: true,
      dashOffset: computeArrowFlowDashOffset(timeInSlideMs, config),
    };
  }

  const delayMs = (config.delay ?? 0) * 1000;
  const durationMs = Math.max(1, (config.duration ?? 0.8) * 1000);
  const holdMs = (config.holdDuration ?? 0.5) * 1000;
  const fadeMs = Math.max(1, (config.fadeDuration ?? 0.3) * 1000);
  const isGrowAndFlow = config.type === 'grow-and-flow';

  if (timeInSlideMs < delayMs) {
    return {
      visible: false,
      progress: 0,
      opacity: 0,
      dashOffset: isGrowAndFlow ? 0 : undefined,
    };
  }

  const elapsed = timeInSlideMs - delayMs;
  if (elapsed <= 0) {
    return { progress: 0, opacity: 1, visible: false, dashOffset: 0 };
  }

  // 1. 伸長フェーズ
  if (timeInSlideMs < delayMs + durationMs) {
    const rawProgress = elapsed / durationMs;
    const progress = applyEasing(rawProgress, config.easing ?? 'ease-out');
    return {
      visible: progress > 0,
      progress,
      opacity: 1.0,
      dashOffset: isGrowAndFlow ? 0 : undefined,
    };
  }

  const flowOffset = isGrowAndFlow
    ? computeArrowFlowDashOffset(timeInSlideMs - delayMs - durationMs, config)
    : undefined;

  // 2. 維持フェーズ
  if (timeInSlideMs < delayMs + durationMs + holdMs) {
    return {
      visible: true,
      progress: 1.0,
      opacity: 1.0,
      dashOffset: flowOffset,
    };
  }

  // 3. 退場フェーズ
  if (config.exitAction === 'auto-hide') {
    const fadeStartMs = delayMs + durationMs + holdMs;
    if (timeInSlideMs < fadeStartMs + fadeMs) {
      const elapsedFade = timeInSlideMs - fadeStartMs;
      const opacity = Math.max(0, 1.0 - elapsedFade / fadeMs);
      return { visible: true, progress: 1.0, opacity, dashOffset: flowOffset };
    }
    return {
      visible: false,
      opacity: 0.0,
      progress: 1.0,
      dashOffset: flowOffset,
    };
  }

  // exitAction === 'keep'
  return { visible: true, opacity: 1.0, progress: 1.0, dashOffset: flowOffset };
}

function insertWavyGuidePoint(
  pts: NormalizedPoint[],
  p0: NormalizedPoint,
  mainAngle: number,
): void {
  if (pts.length < 2) return;
  const lastPt = pts[pts.length - 1];
  const distFromStart = Math.hypot(lastPt.x - p0.x, lastPt.y - p0.y);
  if (distFromStart > 0.001) {
    const stepBack = Math.min(0.5, distFromStart * 0.5);
    pts.splice(pts.length - 1, 0, {
      x: lastPt.x - Math.cos(mainAngle) * stepBack,
      y: lastPt.y - Math.sin(mainAngle) * stepBack,
    });
  }
}

/**
 * 進行度 (0.0 〜 1.0) に応じて点列をトリミングし、先端接線角度を算出
 */
export function trimRenderPoints(
  points: NormalizedPoint[],
  progress: number,
  isWavy = false,
): TrimmedPointsResult {
  if (points.length < 2) {
    return { trimmedPoints: [...points], tipAngle: 0 };
  }

  const p0 = points[0];
  const p1 = points[1];
  const pLast = points[points.length - 1];
  const pPrev = points[points.length - 2];
  const fullAngle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
  const mainAngle = Math.atan2(pLast.y - p0.y, pLast.x - p0.x);

  if (progress <= 0) {
    const baseAngle =
      isWavy || points.length < 2
        ? mainAngle
        : Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const epsPt = {
      x: p0.x + Math.cos(baseAngle) * 0.001,
      y: p0.y + Math.sin(baseAngle) * 0.001,
    };
    return { trimmedPoints: [p0, epsPt], tipAngle: baseAngle };
  }

  if (progress >= 1.0) {
    const pts = points.map((p) => ({ x: p.x, y: p.y }));
    if (isWavy) insertWavyGuidePoint(pts, p0, mainAngle);
    return { trimmedPoints: pts, tipAngle: isWavy ? mainAngle : fullAngle };
  }

  // 累積距離テーブルの作成
  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.hypot(dx, dy);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength <= 0) {
    return {
      trimmedPoints: points.map((p) => ({ x: p.x, y: p.y })),
      tipAngle: 0,
    };
  }

  const targetDist = totalLength * progress;
  let accumulatedDist = 0;
  const resultPoints: NormalizedPoint[] = [{ x: p0.x, y: p0.y }];
  let tipAngle = fullAngle;

  for (let i = 0; i < segmentLengths.length; i++) {
    const len = segmentLengths[i];
    const segStart = points[i];
    const segEnd = points[i + 1];
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const currentAngle = Math.atan2(dy, dx);

    if (accumulatedDist + len < targetDist) {
      resultPoints.push({ x: segEnd.x, y: segEnd.y });
      accumulatedDist += len;
    } else {
      const segT = len > 0 ? (targetDist - accumulatedDist) / len : 0;
      resultPoints.push({
        x: segStart.x + dx * segT,
        y: segStart.y + dy * segT,
      });
      tipAngle = currentAngle;
      break;
    }
  }

  if (resultPoints.length === 1) {
    resultPoints.push({ ...resultPoints[0] });
  }

  if (isWavy) {
    tipAngle = mainAngle;
    insertWavyGuidePoint(resultPoints, p0, mainAngle);
  }

  return { trimmedPoints: resultPoints, tipAngle };
}

/**
 * スライド内時間とマーカーエフェクト設定から多重波紋リング（半径・透明度）を算出
 */
export function computeRippleRings(
  timeInSlideMs: number,
  config?: MarkerEffectConfig,
  baseRadius = 15,
): RippleRing[] {
  if (!config || config.type === 'none') {
    return [];
  }

  const delayMs = (config.delay ?? 0) * 1000;
  if (timeInSlideMs < delayMs) {
    return [];
  }

  const durationMs = Math.max(10, (config.duration ?? 1.0) * 1000);
  const elapsedMs = timeInSlideMs - delayMs;

  const repeatCount = config.repeatCount ?? 2;
  if (repeatCount > 0 && elapsedMs >= repeatCount * durationMs) {
    return [];
  }

  const ringsCount = Math.max(1, config.ringsCount ?? 3);
  const maxRadiusScale = config.maxRadiusScale ?? 2.5;
  const cycleProgress = elapsedMs / durationMs;

  const rings: RippleRing[] = [];
  for (let i = 0; i < ringsCount; i++) {
    let p_i = (cycleProgress + i / ringsCount) % 1.0;
    if (p_i < 0) p_i += 1.0;
    const radius = baseRadius * (1.0 + (maxRadiusScale - 1.0) * p_i);
    const opacity = Math.max(0, 1.0 - p_i);
    rings.push({ radius, opacity, color: config.color });
  }

  return rings;
}
