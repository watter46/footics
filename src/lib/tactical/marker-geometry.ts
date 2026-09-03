/**
 * marker-geometry.ts
 * マーカー外周クリップ・オフセット幾何計算ユーティリティ
 */

import type { Player } from '@/lib/types/tactical-unified';

/**
 * 選手のマーカー半径 (px) を算出
 */
export function getPlayerMarkerRadius(
  player: Player,
  stageSize: { width: number; height: number },
): number {
  const baseDim = Math.min(stageSize.width, stageSize.height);
  const sizeScale = player.style.sizeScale ?? 1.0;
  return baseDim * 0.032 * sizeScale;
}

/**
 * 選手マーカーの外周との交点オフセット座標を計算
 * `onlyRing: true` の場合は `markerType === 'ring'` の時のみ楕円外周交点を計算し、それ以外は中心座標を返す
 *
 * @param center 選手中心座標 (px)
 * @param target 接続先座標 (px)
 * @param player 選手データ
 * @param stageSize キャンバスサイズ
 * @param onlyRing リングマーカー時のみ外周オフセットを適用するか (default: true)
 * @returns 接続点座標 (px)
 */
export function getMarkerBoundaryPoint(
  center: { x: number; y: number },
  target: { x: number; y: number },
  player: Player,
  stageSize: { width: number; height: number },
  onlyRing = true,
): { x: number; y: number } {
  const isRing = player.style.markerType === 'ring';
  if (onlyRing && !isRing) {
    return { x: center.x, y: center.y };
  }

  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const dist = Math.hypot(dx, dy);

  // 同一座標または距離が極小の場合は中心を返す
  if (dist < 1e-4) {
    return { x: center.x, y: center.y };
  }

  const radius = getPlayerMarkerRadius(player, stageSize);

  if (isRing) {
    // 3D Foot Ring (横長楕円: rx = radius * 1.15, ry = radius * 0.55)
    const rx = radius * 1.15;
    const ry = radius * 0.55;

    // 楕円方程式: (t*dx / rx)^2 + (t*dy / ry)^2 = 1 => t = 1 / hypot(dx/rx, dy/ry)
    const termX = dx / rx;
    const termY = dy / ry;
    const scale = Math.hypot(termX, termY);
    if (scale < 1e-4) {
      return { x: center.x, y: center.y };
    }
    const t = 1 / scale;

    // 接続先までの距離を超えないようクランプ (短すぎる場合に交点が target を追い越さない)
    const clampedT = Math.min(t, 1);
    return {
      x: center.x + dx * clampedT,
      y: center.y + dy * clampedT,
    };
  }

  // 通常マーカー (正円: r = radius)
  const r = radius;
  if (dist <= r) {
    return { x: center.x, y: center.y };
  }
  const ratio = r / dist;
  return {
    x: center.x + dx * ratio,
    y: center.y + dy * ratio,
  };
}
