import type { Slide } from '@/lib/types/tactical-unified';
import { distToSegment, isPointInPolygon } from './tactical-geometry-helpers';

/**
 * 消しゴムツール: 指定座標と半径に基づき、スライド内の矢印・ゾーン・テキストおよび選手描画オプションを消去する。
 */
export function eraseAnnotationsAtPoint(
  slide: Slide,
  point: { x: number; y: number },
  radius = 4.0,
): Slide {
  // 1. 矢印・線の消去（プレイヤーは絶対に削除しない）
  const remainingArrows = slide.arrows.filter((arrow) => {
    const pts = arrow.points;
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      if (pt && Math.hypot(pt.x - point.x, pt.y - point.y) <= radius) {
        return false;
      }
    }
    if (pts.length >= 2) {
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        if (p1 && p2 && distToSegment(point, p1, p2) <= radius) {
          return false;
        }
      }
    }
    return true;
  });

  // 2. ゾーンの消去 (矩形・楕円・多角形フリーゾーンすべてに対応)
  const remainingZones = slide.zones.filter((zone) => {
    const pts = zone.points;
    if (pts && pts.length >= 2) {
      // 頂点チェック
      for (const pt of pts) {
        if (Math.hypot(pt.x - point.x, pt.y - point.y) <= radius) {
          return false;
        }
      }
      // エッジ線分チェック
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        if (p1 && p2 && distToSegment(point, p1, p2) <= radius) {
          return false;
        }
      }
      // 内部チェック（3点以上の多角形）
      if (pts.length >= 3 && isPointInPolygon(point, pts)) {
        return false;
      }
    }
    if (
      zone.x !== undefined &&
      zone.y !== undefined &&
      zone.width !== undefined &&
      zone.height !== undefined
    ) {
      if (
        point.x >= zone.x - radius &&
        point.x <= zone.x + zone.width + radius &&
        point.y >= zone.y - radius &&
        point.y <= zone.y + zone.height + radius
      ) {
        return false;
      }
    }
    return true;
  });

  // 3. テキストの消去
  const remainingTexts = slide.texts.filter(
    (t) => Math.hypot(t.x - point.x, t.y - point.y) > radius,
  );

  // 4. リングマーカー（描画オブジェクトとしての3D足元リング）は消しゴムで削除可能、通常選手はマーカーオプション（視野コーン・バッジ・コネクト線）を個別消去
  const updatedPlayers = slide.players
    .filter((player) => {
      if (player.style.markerType === 'ring') {
        return Math.hypot(player.x - point.x, player.y - point.y) > radius;
      }
      return true;
    })
    .map((player) => {
      let visionCone = player.visionCone;
      if (visionCone) {
        const dist = Math.hypot(player.x - point.x, player.y - point.y);
        if (dist <= radius + visionCone.radius && dist >= 3.0) {
          visionCone = undefined;
        }
      }

      const badges = player.badges.filter((b) => {
        const bx = player.x + (b.offsetX || 0) * 0.1;
        const by = player.y + (b.offsetY || 0) * 0.1;
        return Math.hypot(bx - point.x, by - point.y) > radius;
      });

      const connectLines = player.connectLines.filter((cl) => {
        const target = slide.players.find((p) => p.id === cl.toPlayerId);
        if (!target) return false;
        const dist = distToSegment(
          point,
          { x: player.x, y: player.y },
          { x: target.x, y: target.y },
        );
        return dist > radius;
      });

      return {
        ...player,
        visionCone,
        badges,
        connectLines,
      };
    });

  return {
    ...slide,
    arrows: remainingArrows,
    zones: remainingZones,
    texts: remainingTexts,
    players: updatedPlayers,
  };
}
