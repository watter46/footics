import type {
  ConnectLine,
  Player,
  PlayerBadge,
  PlayerFocus,
  PlayerTrajectory,
  VisionCone,
} from '@/lib/types/tactical-unified';
import { interpolateColor, lerp, lerpAngle } from './interpolation-geometry';
import { calculateBezierPoint } from './trajectory';

export interface InterpolatedPlayerState {
  id: string;
  playerId?: string;
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
  team: 'home' | 'away' | 'neutral';
  area: 'pitch' | 'bench';
  name?: string;
  shirtNo?: string;
  style: Player['style'];
  visionCone?: VisionCone;
  connectLines: ConnectLine[];
  badges: PlayerBadge[];
  focus?: PlayerFocus;
  trajectory?: PlayerTrajectory;
}

export interface MatchedPlayerPair {
  key: string;
  playerA?: Player;
  playerB?: Player;
}

const playerMatchCache = new WeakMap<
  Player[],
  WeakMap<Player[], MatchedPlayerPair[]>
>();

/**
 * Matches players across two slides by:
 * 1. Exact ID match
 * 2. Team + Shirt Number match (if shirtNo is defined and non-empty)
 * 3. Team + Player Name match (if name is defined and non-empty)
 * 4. Unmatched players in Slide A (fade out)
 * 5. Unmatched players in Slide B (fade in)
 */
export function matchSlidePlayers(
  playersA: Player[],
  playersB: Player[],
): MatchedPlayerPair[] {
  const cachedForA = playerMatchCache.get(playersA);
  if (cachedForA?.has(playersB)) {
    return cachedForA.get(playersB)!;
  }

  const result: MatchedPlayerPair[] = [];
  const unmatchedA = new Map(playersA.map((p) => [p.id, p]));
  const unmatchedB = new Map(playersB.map((p) => [p.id, p]));

  // 1. Exact ID matching
  for (const [id, pA] of Array.from(unmatchedA.entries())) {
    if (unmatchedB.has(id)) {
      const pB = unmatchedB.get(id)!;
      result.push({ key: id, playerA: pA, playerB: pB });
      unmatchedA.delete(id);
      unmatchedB.delete(id);
    }
  }

  // 2. Team + Shirt Number matching
  for (const [idA, pA] of Array.from(unmatchedA.entries())) {
    if (!pA.shirtNo?.trim()) continue;
    const shirtNoA = pA.shirtNo.trim();
    const matchEntry = Array.from(unmatchedB.entries()).find(
      ([, pB]) =>
        pB.team === pA.team && pB.shirtNo && pB.shirtNo.trim() === shirtNoA,
    );
    if (matchEntry) {
      const [idB, pB] = matchEntry;
      result.push({ key: idA, playerA: pA, playerB: pB });
      unmatchedA.delete(idA);
      unmatchedB.delete(idB);
    }
  }

  // 3. Team + Name matching
  for (const [idA, pA] of Array.from(unmatchedA.entries())) {
    if (!pA.name?.trim()) continue;
    const nameA = pA.name.trim().toLowerCase();
    const matchEntry = Array.from(unmatchedB.entries()).find(
      ([, pB]) =>
        pB.team === pA.team &&
        pB.name &&
        pB.name.trim().toLowerCase() === nameA,
    );
    if (matchEntry) {
      const [idB, pB] = matchEntry;
      result.push({ key: idA, playerA: pA, playerB: pB });
      unmatchedA.delete(idA);
      unmatchedB.delete(idB);
    }
  }

  // 4. Remaining in A (disappearing)
  for (const [idA, pA] of unmatchedA.entries()) {
    result.push({ key: idA, playerA: pA });
  }

  // 5. Remaining in B (appearing)
  for (const [idB, pB] of unmatchedB.entries()) {
    result.push({ key: idB, playerB: pB });
  }

  if (!cachedForA) {
    const nextMap = new WeakMap<Player[], MatchedPlayerPair[]>();
    nextMap.set(playersB, result);
    playerMatchCache.set(playersA, nextMap);
  } else {
    cachedForA.set(playersB, result);
  }

  return result;
}

/**
 * 選手の補間（座標、視野コーン、コネクトライン、出入りフェード）
 */
export function interpolatePlayer(
  pA: Player | undefined,
  pB: Player | undefined,
  ease: number,
): InterpolatedPlayerState | null {
  if (!pA && !pB) return null;

  if (pA && !pB) {
    return {
      id: pA.id,
      playerId: pA.playerId,
      x: pA.x,
      y: pA.y,
      opacity: Math.max(0, 1 - ease),
      visible: ease < 1 && pA.area === 'pitch',
      team: pA.team,
      area: pA.area,
      name: pA.name,
      shirtNo: pA.shirtNo,
      style: pA.style,
      visionCone: pA.visionCone,
      connectLines: pA.connectLines,
      badges: pA.badges,
      focus: pA.focus,
    };
  }

  if (!pA && pB) {
    return {
      id: pB.id,
      playerId: pB.playerId,
      x: pB.x,
      y: pB.y,
      opacity: Math.min(1, ease),
      visible: pB.area === 'pitch',
      team: pB.team,
      area: pB.area,
      name: pB.name,
      shirtNo: pB.shirtNo,
      style: pB.style,
      visionCone: pB.visionCone,
      connectLines: pB.connectLines,
      badges: pB.badges,
      focus: pB.focus,
    };
  }

  const startP = pA;
  const endP = pB;
  if (!startP || !endP) return null;

  // 1. 座標計算 (ピッチ内同士は移動、それ以外はフェード)
  let x = endP.x;
  let y = endP.y;
  let opacity = 1;
  let visible = true;

  if (startP.area === 'pitch' && endP.area === 'pitch') {
    // 軌道設定 (trajectory) に基づくベジェ曲線または直線移動補間
    if (endP.trajectory && endP.trajectory.type !== 'straight') {
      const pt = calculateBezierPoint(
        { x: startP.x, y: startP.y },
        { x: endP.x, y: endP.y },
        ease,
        endP.trajectory,
      );
      x = pt.x;
      y = pt.y;
    } else {
      x = lerp(startP.x, endP.x, ease);
      y = lerp(startP.y, endP.y, ease);
    }
    opacity = 1;
    visible = true;
  } else if (startP.area === 'pitch' && endP.area === 'bench') {
    x = startP.x;
    y = startP.y;
    opacity = Math.max(0, 1 - ease);
    visible = ease < 1;
  } else if (startP.area === 'bench' && endP.area === 'pitch') {
    x = endP.x;
    y = endP.y;
    opacity = Math.min(1, ease);
    visible = true;
  } else {
    opacity = 0;
    visible = false;
  }

  // 2. 視野コーン (VisionCone) 補間
  let visionCone: VisionCone | undefined;
  if (startP.visionCone && endP.visionCone) {
    visionCone = {
      ...endP.visionCone,
      angleRad: lerpAngle(
        startP.visionCone.angleRad,
        endP.visionCone.angleRad,
        ease,
      ),
      spreadRad: lerp(
        startP.visionCone.spreadRad,
        endP.visionCone.spreadRad,
        ease,
      ),
      radius: lerp(startP.visionCone.radius, endP.visionCone.radius, ease),
      opacity: lerp(
        startP.visionCone.opacity ?? 0.3,
        endP.visionCone.opacity ?? 0.3,
        ease,
      ),
      color: interpolateColor(
        startP.visionCone.color || '#3b82f6',
        endP.visionCone.color || '#3b82f6',
        ease,
      ),
      visible: startP.visionCone.visible || endP.visionCone.visible,
    };
  } else {
    visionCone = endP.visionCone || startP.visionCone;
  }

  return {
    id: endP.id,
    playerId: endP.playerId ?? startP.playerId,
    x,
    y,
    opacity,
    visible,
    team: endP.team,
    area: endP.area,
    name: endP.name,
    shirtNo: endP.shirtNo,
    style: endP.style,
    visionCone,
    connectLines: endP.connectLines,
    badges: endP.badges,
    focus: endP.focus,
    trajectory: endP.trajectory,
  };
}
