import { z } from 'zod';
import { calculateNormalizedPitchBounds } from '@/lib/tactical/pitch-geometry';

// ─────────────────────────────────────────
// § 1. Primitives
// ─────────────────────────────────────────

/** 正規化座標 (ピッチ外・オーバーフロー許容) */
export const NormalizedCoordSchema = z.number();

/** アスペクト比: 16:9 (横), 9:16 (縦), 4:5 (縦長タイムライン), 1:1 (正方形) */
export const AspectRatioSchema = z.enum(['16:9', '9:16', '4:5', '1:1']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export type XMediaPresetKey =
  | 'landscape_16_9'
  | 'portrait_4_5'
  | 'vertical_9_16'
  | 'square_1_1'
  | 'pitch_fit'
  | 'single_image_4_5'
  | 'carousel_image_9_16'
  | 'feed_video_9_16'
  | 'pitch_overview_16_9';

export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '4:5': 4 / 5,
  '1:1': 1,
};

export function isVerticalAspectRatio(ratio: AspectRatio): boolean {
  return ratio === '9:16' || ratio === '4:5' || ratio === '1:1';
}

export function isHorizontalAspectRatio(ratio: AspectRatio): boolean {
  return ratio === '16:9';
}

export function getAspectRatioOrientation(
  ratio: AspectRatio,
): 'horizontal' | 'vertical' {
  return isVerticalAspectRatio(ratio) ? 'vertical' : 'horizontal';
}

/** 正規化座標点 */
export const NormalizedPointSchema = z.object({
  x: NormalizedCoordSchema,
  y: NormalizedCoordSchema,
});
export type NormalizedPoint = z.infer<typeof NormalizedPointSchema>;

// ─────────────────────────────────────────
// § 2. 幾何変換ユーティリティ型
// ─────────────────────────────────────────

/** 正規化座標の幾何変換ロジック（16:9, 9:16, 4:5, 1:1 間） */
export function transformCoord(
  point: { x: number; y: number },
  from: AspectRatio,
  to: AspectRatio,
  options?: { clamp?: boolean },
): { x: number; y: number } {
  const shouldClamp = options?.clamp !== false;

  if (from === to) {
    return {
      x: shouldClamp ? Math.max(0, Math.min(100, point.x)) : point.x,
      y: shouldClamp ? Math.max(0, Math.min(100, point.y)) : point.y,
    };
  }

  const fromOrient = getAspectRatioOrientation(from);
  const toOrient = getAspectRatioOrientation(to);

  // 同一オリエンテーション（垂直同士 4:5 ↔ 9:16 ↔ 1:1、または水平同士）は正規化座標をそのまま維持
  if (fromOrient === toOrient) {
    return {
      x: shouldClamp ? Math.max(0, Math.min(100, point.x)) : point.x,
      y: shouldClamp ? Math.max(0, Math.min(100, point.y)) : point.y,
    };
  }

  const bounds = calculateNormalizedPitchBounds();

  let attackNorm: number;
  let widthNorm: number;

  if (fromOrient === 'horizontal') {
    attackNorm = (point.x - bounds.xMin) / bounds.pitchWidth;
    widthNorm = 1 - (point.y - bounds.yMin) / bounds.pitchHeight;
  } else {
    attackNorm = (bounds.yMax - point.y) / bounds.pitchHeight;
    widthNorm = (point.x - bounds.xMin) / bounds.pitchWidth;
  }

  let nx: number;
  let ny: number;

  if (toOrient === 'horizontal') {
    nx = bounds.xMin + attackNorm * bounds.pitchWidth;
    ny = bounds.yMin + (1 - widthNorm) * bounds.pitchHeight;
  } else {
    nx = bounds.xMin + widthNorm * bounds.pitchWidth;
    ny = bounds.yMax - attackNorm * bounds.pitchHeight;
  }

  return {
    x: shouldClamp ? Math.max(0, Math.min(100, nx)) : nx,
    y: shouldClamp ? Math.max(0, Math.min(100, ny)) : ny,
  };
}

/** NormalizedPoint 配列に変換を適用 */
export function transformPoints(
  points: Array<{ x: number; y: number }>,
  from: AspectRatio,
  to: AspectRatio,
  options?: { clamp?: boolean },
): Array<{ x: number; y: number }> {
  return points.map((p) => transformCoord(p, from, to, options));
}
