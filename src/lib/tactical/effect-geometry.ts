import type {
  ArrowEffectConfig,
  EffectEasing,
} from '@/lib/types/tactical/annotations';
import type { MarkerEffectConfig } from '@/lib/types/tactical/player';
import type { NormalizedPoint } from '@/lib/types/tactical/primitives';

export interface ArrowEffectState {
  progress: number;
  opacity: number;
  visible: boolean;
}

export interface TrimmedPointsResult {
  trimmedPoints: NormalizedPoint[];
  tipAngle: number;
}

export interface RippleRing {
  radius: number;
  opacity: number;
}

function applyEasing(t: number, easing?: EffectEasing): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return clamped;
    case 'ease-out':
      return 1 - (1 - clamped) ** 3;
    case 'ease-in-out':
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - (-2 * clamped + 2) ** 3 / 2;
    default:
      return 1 - (1 - clamped) ** 3;
  }
}

/**
 * スライド内時間とエフェクト設定から矢印のアニメーション描画状態を算出
 */
export function computeArrowEffectState(
  timeInSlideMs: number,
  config?: ArrowEffectConfig,
): ArrowEffectState {
  if (!config || config.type === 'none') {
    return { progress: 1.0, opacity: 1.0, visible: true };
  }

  const delayMs = (config.delay ?? 0) * 1000;
  const durationMs = Math.max(1, (config.duration ?? 0.8) * 1000);
  const holdMs = (config.holdDuration ?? 0.5) * 1000;
  const fadeMs = Math.max(1, (config.fadeDuration ?? 0.3) * 1000);

  if (timeInSlideMs < delayMs) {
    return { visible: false, progress: 0.0, opacity: 0.0 };
  }

  // 1. 伸長フェーズ
  if (timeInSlideMs < delayMs + durationMs) {
    const rawProgress = (timeInSlideMs - delayMs) / durationMs;
    const progress = applyEasing(rawProgress, config.easing);
    return { visible: true, progress, opacity: 1.0 };
  }

  // 2. 維持フェーズ
  if (timeInSlideMs < delayMs + durationMs + holdMs) {
    return { visible: true, progress: 1.0, opacity: 1.0 };
  }

  // 3. 退場フェーズ
  if (config.exitAction === 'auto-hide') {
    const fadeStartMs = delayMs + durationMs + holdMs;
    if (timeInSlideMs < fadeStartMs + fadeMs) {
      const elapsedFade = timeInSlideMs - fadeStartMs;
      const opacity = Math.max(0, 1.0 - elapsedFade / fadeMs);
      return { visible: true, progress: 1.0, opacity };
    }
    return { visible: false, opacity: 0.0, progress: 1.0 };
  }

  // exitAction === 'keep'
  return { visible: true, opacity: 1.0, progress: 1.0 };
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
    const tipAngle = isWavy ? mainAngle : Math.atan2(p1.y - p0.y, p1.x - p0.x);
    return {
      trimmedPoints: [
        isWavy
          ? {
              x: p0.x - Math.cos(mainAngle) * 0.1,
              y: p0.y - Math.sin(mainAngle) * 0.1,
            }
          : { x: p0.x, y: p0.y },
        { x: p0.x, y: p0.y },
      ],
      tipAngle,
    };
  }

  if (progress >= 1.0) {
    const pts = points.map((p) => ({ x: p.x, y: p.y }));
    if (isWavy && pts.length >= 2) {
      const lastPt = pts[pts.length - 1];
      pts[pts.length - 2] = {
        x: lastPt.x - Math.cos(mainAngle) * 0.1,
        y: lastPt.y - Math.sin(mainAngle) * 0.1,
      };
    }
    return {
      trimmedPoints: pts,
      tipAngle: isWavy ? mainAngle : fullAngle,
    };
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
    if (resultPoints.length >= 2) {
      const lastPt = resultPoints[resultPoints.length - 1];
      resultPoints[resultPoints.length - 2] = {
        x: lastPt.x - Math.cos(mainAngle) * 0.1,
        y: lastPt.y - Math.sin(mainAngle) * 0.1,
      };
    }
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
    rings.push({ radius, opacity });
  }

  return rings;
}
