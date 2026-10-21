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

/**
 * ピッチ上の既存選手と重ならない安全な空き座標（0..100%）を自動算出する純粋関数
 */
export function findSafePitchPosition(
  existingPlayers: Array<{ x: number; y: number; area: string }>,
  team: 'home' | 'away' | 'neutral' = 'home',
): { x: number; y: number } {
  const pitchPlayers = existingPlayers.filter((p) => p.area === 'pitch');
  if (pitchPlayers.length === 0) {
    return team === 'away' ? { x: 60, y: 50 } : { x: 40, y: 50 };
  }

  // チームに応じた探索範囲 (Home は自陣〜中盤 x: 25..55, Away は自陣〜中盤 x: 45..75, y: 20..80)
  const minX = team === 'away' ? 45 : 25;
  const maxX = team === 'away' ? 75 : 55;
  const minY = 20;
  const maxY = 80;

  // グリッド候補（5%刻み）
  const candidates: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x += 5) {
    for (let y = minY; y <= maxY; y += 5) {
      candidates.push({ x, y });
    }
  }

  let bestCandidate = candidates[0] ?? { x: 50, y: 50 };
  let maxMinDist = -1;

  for (const cand of candidates) {
    let minDist = Number.POSITIVE_INFINITY;
    for (const p of pitchPlayers) {
      const dist = Math.hypot(cand.x - p.x, cand.y - p.y);
      if (dist < minDist) {
        minDist = dist;
      }
    }
    // 既存選手との最小距離が最も大きい（最も余裕のある）候補点を選択
    if (minDist > maxMinDist) {
      maxMinDist = minDist;
      bestCandidate = cand;
    }
  }

  return bestCandidate;
}
