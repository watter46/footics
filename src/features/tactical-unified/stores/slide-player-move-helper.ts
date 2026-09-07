import type { Slide } from '@/lib/types/tactical-unified';

/**
 * 複数選手の delta 移動とそれに伴う矢印追従を計算する純粋関数
 */
export function computeSlideAfterPlayerMoveByDelta(
  slide: Slide,
  playerIds: string[],
  deltaX: number,
  deltaY: number,
): Slide {
  const playerIdSet = new Set(playerIds);
  const targetPlayers = slide.players.filter(
    (p) => playerIdSet.has(p.id) && !p.locked,
  );
  if (targetPlayers.length === 0) return slide;

  // 1. 選手位置更新 (クランプ [-100, 200] セーフティリミット)
  const updatedPlayers = slide.players.map((p) => {
    if (!playerIdSet.has(p.id) || p.locked) return p;
    return {
      ...p,
      x: Math.max(-100, Math.min(200, p.x + deltaX)),
      y: Math.max(-100, Math.min(200, p.y + deltaY)),
    };
  });

  // 2. 矢印追従
  const updatedArrows = slide.arrows.map((arrow) => {
    const p0 = arrow.points[0];
    const p1 = arrow.points[1];
    const isStartAttached = Boolean(
      arrow.sourcePlayerId && playerIdSet.has(arrow.sourcePlayerId),
    );
    const isEndAttached = Boolean(
      arrow.targetPlayerId && playerIdSet.has(arrow.targetPlayerId),
    );

    if (!isStartAttached && !isEndAttached) return arrow;

    // 始点・終点ともに移動対象選手
    if (isStartAttached && isEndAttached) {
      const newPoints = arrow.points.map((pt) => ({
        x: pt.x + deltaX,
        y: pt.y + deltaY,
      }));
      const newCp = arrow.controlPoint
        ? {
            x: arrow.controlPoint.x + deltaX,
            y: arrow.controlPoint.y + deltaY,
          }
        : undefined;
      return {
        ...arrow,
        points: newPoints,
        controlPoint: newCp,
      };
    }

    if (isStartAttached && p0 && p1) {
      // 始点のみ追従
      const newP0 = { x: p0.x + deltaX, y: p0.y + deltaY };
      const newCp = arrow.controlPoint
        ? {
            x: arrow.controlPoint.x + deltaX / 2,
            y: arrow.controlPoint.y + deltaY / 2,
          }
        : undefined;
      return { ...arrow, points: [newP0, p1], controlPoint: newCp };
    }

    if (isEndAttached && p0 && p1) {
      // 終点のみ追従
      const newP1 = { x: p1.x + deltaX, y: p1.y + deltaY };
      const newCp = arrow.controlPoint
        ? {
            x: arrow.controlPoint.x + deltaX / 2,
            y: arrow.controlPoint.y + deltaY / 2,
          }
        : undefined;
      return { ...arrow, points: [p0, newP1], controlPoint: newCp };
    }

    return arrow;
  });

  return {
    ...slide,
    players: updatedPlayers,
    arrows: updatedArrows,
  };
}
