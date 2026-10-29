import { z } from 'zod';

// ─────────────────────────────────────────
// § 1. Primitives
// ─────────────────────────────────────────

/** 正規化座標 (ピッチ外・オーバーフロー許容) */
export const NormalizedCoordSchema = z.number();

/** アスペクト比: 16:9 (横), 9:16 (縦), 4:5 (縦長タイムライン), 1:1 (正方形) */
export const AspectRatioSchema = z.enum(['16:9', '9:16', '4:5', '1:1']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

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
): { x: number; y: number } {
  const clampedX = Math.max(0, Math.min(100, point.x));
  const clampedY = Math.max(0, Math.min(100, point.y));

  if (from === to) {
    return {
      x: clampedX,
      y: clampedY,
    };
  }

  const fromVertical = isVerticalAspectRatio(from);
  const toVertical = isVerticalAspectRatio(to);

  // 同系統（横同士: 16:9、縦同士: 9:16 ⇄ 4:5 ⇄ 1:1）の場合、向きは変わらないためそのまま維持
  if (fromVertical === toVertical) {
    return {
      x: clampedX,
      y: clampedY,
    };
  }

  // 横→縦: x_v = y_h, y_v = 100 - x_h
  if (!fromVertical && toVertical) {
    return {
      x: clampedY,
      y: Math.max(0, Math.min(100, 100 - clampedX)),
    };
  }

  // 縦→横: x_h = 100 - y_v, y_h = x_v
  return {
    x: Math.max(0, Math.min(100, 100 - clampedY)),
    y: clampedX,
  };
}

/** NormalizedPoint 配列に変換を適用 */
export function transformPoints(
  points: Array<{ x: number; y: number }>,
  from: AspectRatio,
  to: AspectRatio,
): Array<{ x: number; y: number }> {
  return points.map((p) => transformCoord(p, from, to));
}
