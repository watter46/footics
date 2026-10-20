/**
 * pitch-stage-mapping.ts
 * Stage全面基準の正規化座標(0-100)と、ピッチ矩形基準(0-100)の相互変換（純粋関数）。
 *
 * Stage は常にコンテナ全面。ピッチは aspectRatio 通りに中央 contain 描画される
 * （BackgroundImageLayer の calculatePitchRect と同一幾何）。
 * フォーメーション等が持つ「ピッチ基準座標」を Stage 正規化座標へ写像するために使う。
 */

import type { AspectRatio } from '@/lib/types/tactical-unified';
import { ASPECT_RATIOS } from '@/lib/types/tactical-unified';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Stage全面を 0-100 とした時のピッチ矩形。stageAspect = width / height */
export function getPitchRectNormalized(
  stageAspect: number | null | undefined,
  aspectRatio: AspectRatio,
): NormalizedRect {
  if (!stageAspect || stageAspect <= 0 || Number.isNaN(stageAspect)) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  const ratio = ASPECT_RATIOS[aspectRatio];
  if (stageAspect >= ratio) {
    const width = (100 * ratio) / stageAspect;
    return { x: (100 - width) / 2, y: 0, width, height: 100 };
  }
  const height = (100 * stageAspect) / ratio;
  return { x: 0, y: (100 - height) / 2, width: 100, height };
}

export function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** ピッチ基準座標 → Stage正規化座標（キャンバス内にclamp） */
export function pitchToStageCoord(
  p: { x: number; y: number },
  rect: NormalizedRect,
): { x: number; y: number } {
  return {
    x: clampPercent(rect.x + (p.x * rect.width) / 100),
    y: clampPercent(rect.y + (p.y * rect.height) / 100),
  };
}

/** Stage正規化座標 → ピッチ基準座標（範囲外は clamp しない） */
export function stageToPitchCoord(
  p: { x: number; y: number },
  rect: NormalizedRect,
): { x: number; y: number } {
  return {
    x: ((p.x - rect.x) * 100) / rect.width,
    y: ((p.y - rect.y) * 100) / rect.height,
  };
}

/** ピッチ基準で配置済みのマーカー群を Stage 正規化座標へ写像 */
export function mapPlayersToPitchRect<T extends { x: number; y: number }>(
  players: T[],
  rect: NormalizedRect,
): T[] {
  return players.map((p) => ({ ...p, ...pitchToStageCoord(p, rect) }));
}
