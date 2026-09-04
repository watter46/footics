/**
 * unified-interpolation.ts
 * Unified Tactical Canvas — Animation Interpolation & Zone Vertex Morphing Engine
 *
 * Responsibilities:
 *   - スライド間の時間・イージング進捗計算
 *   - 選手・ボール・矢印・テキストの座標・属性補間 (Lerp / Bezier)
 *   - ゾーン頂点モーフィング (Zone Vertex Morphing - 多角形/Rect/Ellipse 変形連動)
 *   - ピッチ ⇄ ベンチのフェード遷移
 */

import type {
  ArrowAnnotation,
  BallState,
  ConnectLine,
  NormalizedPoint,
  Player,
  PlayerBadge,
  PlayerFocus,
  PlayerTrajectory,
  Slide,
  TextAnnotation,
  VisionCone,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';
import { calculateBezierPoint } from './trajectory';

// ─────────────────────────────────────────
// § 1. ユーティリティ計算
// ─────────────────────────────────────────

export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

/**
 * 2つの角度 (rad) の最短回転方向での Lerp
 */
export function lerpAngle(startRad: number, endRad: number, t: number): number {
  const diff = (endRad - startRad) % (Math.PI * 2);
  const shortestDiff =
    diff > Math.PI
      ? diff - Math.PI * 2
      : diff < -Math.PI
        ? diff + Math.PI * 2
        : diff;
  return startRad + shortestDiff * t;
}

/**
 * 16進数カラー (#rrggbb) の線形補間
 */
export function interpolateColor(
  colorA: string,
  colorB: string,
  t: number,
): string {
  const clampT = Math.max(0, Math.min(1, t));
  const cleanA = colorA.replace('#', '');
  const cleanB = colorB.replace('#', '');

  if (cleanA.length !== 6 || cleanB.length !== 6) {
    return clampT < 0.5 ? colorA : colorB;
  }

  const rA = Number.parseInt(cleanA.substring(0, 2), 16);
  const gA = Number.parseInt(cleanA.substring(2, 4), 16);
  const bA = Number.parseInt(cleanA.substring(4, 6), 16);

  const rB = Number.parseInt(cleanB.substring(0, 2), 16);
  const gB = Number.parseInt(cleanB.substring(2, 4), 16);
  const bB = Number.parseInt(cleanB.substring(4, 6), 16);

  const r = Math.round(lerp(rA, rB, clampT));
  const g = Math.round(lerp(gA, gB, clampT));
  const b = Math.round(lerp(bA, bB, clampT));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─────────────────────────────────────────
// § 2. 多角形リサンプリング & 頂点モーフィング (Polygon Vertex Morphing)
// ─────────────────────────────────────────

/**
 * 頂点列の周長（パス距離）を計算
 */
function getPolygonPerimeter(points: NormalizedPoint[], closed = true): number {
  if (points.length <= 1) return 0;
  let total = 0;
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  return total;
}

/**
 * 多角形の頂点列を指定した頂点数 targetCount にリサンプリングして均等展開
 */
export function resamplePolygon(
  points: NormalizedPoint[],
  targetCount: number,
  closed = true,
): NormalizedPoint[] {
  if (points.length === 0) return [];
  if (points.length === targetCount) return points.map((p) => ({ ...p }));
  if (points.length === 1) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  const perimeter = getPolygonPerimeter(points, closed);
  if (perimeter === 0) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  // 累積距離テーブルの作成
  const segLengths: number[] = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    segLengths.push(Math.hypot(p2.x - p1.x, p2.y - p1.y));
  }

  const resampled: NormalizedPoint[] = [];
  const step = closed ? perimeter / targetCount : perimeter / (targetCount - 1);

  for (let k = 0; k < targetCount; k++) {
    const targetDist = k * step;
    let accumulated = 0;
    let segIdx = 0;
    let segT = 0;

    for (let i = 0; i < segLengths.length; i++) {
      const len = segLengths[i];
      if (accumulated + len >= targetDist || i === segLengths.length - 1) {
        segIdx = i;
        const remain = targetDist - accumulated;
        segT = len > 0 ? Math.max(0, Math.min(1, remain / len)) : 0;
        break;
      }
      accumulated += len;
    }

    const p1 = points[segIdx];
    const p2 = points[(segIdx + 1) % points.length];
    resampled.push({
      x: lerp(p1.x, p2.x, segT),
      y: lerp(p1.y, p2.y, segT),
    });
  }

  return resampled;
}

/**
 * 2つの多角形頂点列をスムーズに変形補間（頂点数不一致時も自動リサンプリング）
 */
export function interpolatePolygonPoints(
  pointsA: NormalizedPoint[],
  pointsB: NormalizedPoint[],
  t: number,
  closed = true,
): NormalizedPoint[] {
  if (pointsA.length === 0 && pointsB.length === 0) return [];
  if (pointsA.length === 0) return pointsB.map((p) => ({ ...p }));
  if (pointsB.length === 0) return pointsA.map((p) => ({ ...p }));

  const maxVertices = Math.max(pointsA.length, pointsB.length);
  const normalizedA =
    pointsA.length === maxVertices
      ? pointsA
      : resamplePolygon(pointsA, maxVertices, closed);
  const normalizedB =
    pointsB.length === maxVertices
      ? pointsB
      : resamplePolygon(pointsB, maxVertices, closed);

  return normalizedA.map((pA, idx) => {
    const pB = normalizedB[idx];
    return {
      x: lerp(pA.x, pB.x, t),
      y: lerp(pA.y, pB.y, t),
    };
  });
}

/**
 * 四角形 (Rect) を回転考慮の 4 頂点配列に展開
 */
export function rectToPoints(
  x = 0,
  y = 0,
  width = 20,
  height = 15,
  rotation = 0,
): NormalizedPoint[] {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const hw = width / 2;
  const hh = height / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  return localCorners.map((pt) => ({
    x: Math.max(0, Math.min(100, cx + pt.x * cos - pt.y * sin)),
    y: Math.max(0, Math.min(100, cy + pt.x * sin + pt.y * cos)),
  }));
}

// ─────────────────────────────────────────
// § 3. 補間データ型定義
// ─────────────────────────────────────────

export interface InterpolatedPlayerState {
  id: string;
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

export interface InterpolatedBallState {
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
}

export interface InterpolatedZoneState {
  id: string;
  zoneType: ZoneAnnotation['zoneType'];
  shapeType: 'rect' | 'ellipse' | 'polygon';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  points: NormalizedPoint[];
  color: string;
  opacity: number;
  strokeColor?: string;
  strokeWidth: number;
  label?: string;
  visible: boolean;
}

export interface InterpolatedArrowState {
  id: string;
  arrowType: ArrowAnnotation['arrowType'];
  curveType: ArrowAnnotation['curveType'];
  points: NormalizedPoint[];
  controlPoint?: NormalizedPoint;
  color: string;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  sourcePlayerId?: string;
  targetPlayerId?: string;
}

export interface InterpolatedTextState {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  opacity: number;
  visible: boolean;
}

export interface InterpolatedUnifiedFrame {
  players: Record<string, InterpolatedPlayerState>;
  ball: InterpolatedBallState;
  zones: Record<string, InterpolatedZoneState>;
  arrows: Record<string, InterpolatedArrowState>;
  texts: Record<string, InterpolatedTextState>;
  currentSlideIndex: number;
  nextSlideIndex: number;
  progress: number;
  isPaused: boolean;
}

// ─────────────────────────────────────────
// § 4. 各種オブジェクト補間関数
// ─────────────────────────────────────────

/**
 * ゾーンの補間（頂点モーフィング ＋ Rect/Ellipse/Polygon 対応）
 */
export function interpolateZone(
  startZone: ZoneAnnotation | undefined,
  endZone: ZoneAnnotation | undefined,
  ease: number,
): InterpolatedZoneState | null {
  if (!startZone && !endZone) return null;

  if (startZone && !endZone) {
    // スライド A のみ存在 → フェードアウト
    return {
      ...startZone,
      shapeType: startZone.shapeType || 'rect',
      points: startZone.points || [],
      color: startZone.color || '#f59e0b',
      strokeWidth: startZone.strokeWidth || 0,
      opacity: (startZone.opacity ?? 0.25) * Math.max(0, 1 - ease),
      visible: ease < 1,
    };
  }

  if (!startZone && endZone) {
    // スライド B のみ存在 → フェードイン
    return {
      ...endZone,
      shapeType: endZone.shapeType || 'rect',
      points: endZone.points || [],
      color: endZone.color || '#f59e0b',
      strokeWidth: endZone.strokeWidth || 0,
      opacity: (endZone.opacity ?? 0.25) * Math.min(1, ease),
      visible: true,
    };
  }

  // startZone と endZone の両方が存在 → モーフィング補間
  const zA = startZone;
  const zB = endZone;
  if (!zA || !zB) return null;

  const shapeA = zA.shapeType || 'rect';
  const shapeB = zB.shapeType || 'rect';

  const opacity = lerp(zA.opacity ?? 0.25, zB.opacity ?? 0.25, ease);
  const color = interpolateColor(
    zA.color || '#f59e0b',
    zB.color || '#f59e0b',
    ease,
  );
  const strokeColor =
    zA.strokeColor && zB.strokeColor
      ? interpolateColor(zA.strokeColor, zB.strokeColor, ease)
      : zB.strokeColor || zA.strokeColor;
  const strokeWidth = lerp(zA.strokeWidth || 0, zB.strokeWidth || 0, ease);

  // 1. Polygon ⇄ Polygon または Polygon ⇄ Rect モーフィング
  if (shapeA === 'polygon' || shapeB === 'polygon') {
    const ptsA =
      shapeA === 'polygon' && zA.points.length > 0
        ? zA.points
        : rectToPoints(zA.x, zA.y, zA.width, zA.height, zA.rotation);
    const ptsB =
      shapeB === 'polygon' && zB.points.length > 0
        ? zB.points
        : rectToPoints(zB.x, zB.y, zB.width, zB.height, zB.rotation);

    const morphPoints = interpolatePolygonPoints(ptsA, ptsB, ease, true);

    return {
      id: zB.id || zA.id,
      zoneType: zB.zoneType || zA.zoneType,
      shapeType: 'polygon',
      points: morphPoints,
      color,
      opacity,
      strokeColor,
      strokeWidth,
      label: zB.label || zA.label,
      visible: true,
    };
  }

  // 2. Rect ⇄ Rect または Ellipse ⇄ Ellipse
  const startX = zA.x ?? zA.points?.[0]?.x ?? 20;
  const startY = zA.y ?? zA.points?.[0]?.y ?? 20;
  const endX = zB.x ?? zB.points?.[0]?.x ?? 20;
  const endY = zB.y ?? zB.points?.[0]?.y ?? 20;

  const startW = zA.width ?? 30;
  const startH = zA.height ?? 20;
  const endW = zB.width ?? 30;
  const endH = zB.height ?? 20;

  const x = lerp(startX, endX, ease);
  const y = lerp(startY, endY, ease);
  const width = lerp(startW, endW, ease);
  const height = lerp(startH, endH, ease);
  const rotation = lerp(zA.rotation || 0, zB.rotation || 0, ease);

  return {
    id: zB.id || zA.id,
    zoneType: zB.zoneType || zA.zoneType,
    shapeType: shapeB,
    x,
    y,
    width,
    height,
    rotation,
    points:
      zA.points.length > 0 && zB.points.length > 0
        ? interpolatePolygonPoints(zA.points, zB.points, ease, true)
        : [],
    color,
    opacity,
    strokeColor,
    strokeWidth,
    label: zB.label || zA.label,
    visible: true,
  };
}

export interface MatchedPlayerPair {
  key: string;
  playerA?: Player;
  playerB?: Player;
}

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
    if (!pA.shirtNo || !pA.shirtNo.trim()) continue;
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
    if (!pA.name || !pA.name.trim()) continue;
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

/**
 * ボールの補間
 */
export function interpolateBall(
  ballA: BallState | undefined,
  ballB: BallState | undefined,
  ease: number,
): InterpolatedBallState {
  if (!ballA && !ballB) {
    return { x: 50, y: 50, visible: true, opacity: 1 };
  }
  if (!ballA && ballB) {
    return {
      x: ballB.x,
      y: ballB.y,
      visible: ballB.visible,
      opacity: ease,
    };
  }
  if (ballA && !ballB) {
    return {
      x: ballA.x,
      y: ballA.y,
      visible: ballA.visible,
      opacity: 1 - ease,
    };
  }
  if (!ballA || !ballB) {
    return { x: 50, y: 50, visible: true, opacity: 1 };
  }

  let x: number;
  let y: number;
  if (ballB.trajectory && ballB.trajectory.type !== 'straight') {
    const pt = calculateBezierPoint(
      { x: ballA.x, y: ballA.y },
      { x: ballB.x, y: ballB.y },
      ease,
      ballB.trajectory,
    );
    x = pt.x;
    y = pt.y;
  } else {
    x = lerp(ballA.x, ballB.x, ease);
    y = lerp(ballA.y, ballB.y, ease);
  }

  return {
    x,
    y,
    visible: ballA.visible || ballB.visible,
    opacity: 1,
  };
}

/**
 * 矢印アノテーションの補間
 */
export function interpolateArrow(
  arrowA: ArrowAnnotation | undefined,
  arrowB: ArrowAnnotation | undefined,
  ease: number,
): InterpolatedArrowState | null {
  if (!arrowA && !arrowB) return null;

  if (arrowA && !arrowB) {
    return {
      ...arrowA,
      opacity: Math.max(0, 1 - ease),
      visible: ease < 1,
    };
  }

  if (!arrowA && arrowB) {
    return {
      ...arrowB,
      opacity: Math.min(1, ease),
      visible: true,
    };
  }

  const aA = arrowA;
  const aB = arrowB;
  if (!aA || !aB) return null;

  const pts = interpolatePolygonPoints(aA.points, aB.points, ease, false);

  let controlPoint: NormalizedPoint | undefined;
  if (aA.controlPoint && aB.controlPoint) {
    controlPoint = {
      x: lerp(aA.controlPoint.x, aB.controlPoint.x, ease),
      y: lerp(aA.controlPoint.y, aB.controlPoint.y, ease),
    };
  } else {
    controlPoint = aB.controlPoint || aA.controlPoint;
  }

  return {
    id: aB.id,
    arrowType: aB.arrowType,
    curveType: aB.curveType,
    points: pts,
    controlPoint,
    color: interpolateColor(aA.color || '#ffffff', aB.color || '#ffffff', ease),
    strokeWidth: lerp(aA.strokeWidth || 3, aB.strokeWidth || 3, ease),
    opacity: 1,
    visible: true,
    sourcePlayerId: aB.sourcePlayerId,
    targetPlayerId: aB.targetPlayerId,
  };
}

/**
 * テキストアノテーションの補間
 */
export function interpolateText(
  textA: TextAnnotation | undefined,
  textB: TextAnnotation | undefined,
  ease: number,
): InterpolatedTextState | null {
  if (!textA && !textB) return null;

  if (textA && !textB) {
    return {
      ...textA,
      opacity: Math.max(0, 1 - ease),
      visible: ease < 1,
    };
  }

  if (!textA && textB) {
    return {
      ...textB,
      opacity: Math.min(1, ease),
      visible: true,
    };
  }

  const tA = textA;
  const tB = textB;
  if (!tA || !tB) return null;

  return {
    id: tB.id,
    x: lerp(tA.x, tB.x, ease),
    y: lerp(tA.y, tB.y, ease),
    content: ease < 0.5 ? tA.content : tB.content,
    fontSize: lerp(tA.fontSize || 16, tB.fontSize || 16, ease),
    color: interpolateColor(tA.color || '#ffffff', tB.color || '#ffffff', ease),
    bold: tB.bold ?? tA.bold ?? false,
    italic: tB.italic ?? tA.italic ?? false,
    opacity: 1,
    visible: true,
  };
}

// ─────────────────────────────────────────
// § 5. 全体タイムライン補間エンジン
// ─────────────────────────────────────────

/**
 * 全スライドの総再生時間 (ms) を計算
 */
export function calculateUnifiedTotalDuration(slides: Slide[]): number {
  if (slides.length <= 1) return 0;
  return slides.slice(0, -1).reduce((acc, slide) => {
    const duration = slide.transitionDurationMs ?? 1000;
    const pause = slide.pauseMs ?? 500;
    return acc + duration + pause;
  }, 0);
}

/**
 * 指定時間 (timeMs) における全オブジェクトの補間フレーム状態を計算
 */
export function getInterpolatedUnifiedSlideFrame(
  slides: Slide[],
  timeMs: number,
): InterpolatedUnifiedFrame {
  if (slides.length === 0) {
    return {
      players: {},
      ball: { x: 50, y: 50, visible: true, opacity: 1 },
      zones: {},
      arrows: {},
      texts: {},
      currentSlideIndex: 0,
      nextSlideIndex: 0,
      progress: 0,
      isPaused: false,
    };
  }

  if (slides.length === 1) {
    const slide = slides[0];
    const players: Record<string, InterpolatedPlayerState> = {};
    slide.players.forEach((p) => {
      players[p.id] = {
        id: p.id,
        x: p.x,
        y: p.y,
        opacity: 1,
        visible: p.area === 'pitch',
        team: p.team,
        area: p.area,
        name: p.name,
        shirtNo: p.shirtNo,
        style: p.style,
        visionCone: p.visionCone,
        connectLines: p.connectLines,
        badges: p.badges,
        focus: p.focus,
        trajectory: p.trajectory,
      };
    });

    const zones: Record<string, InterpolatedZoneState> = {};
    slide.zones.forEach((z) => {
      zones[z.id] = {
        id: z.id,
        zoneType: z.zoneType,
        shapeType: z.shapeType || 'rect',
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height,
        rotation: z.rotation,
        points: z.points || [],
        color: z.color || '#f59e0b',
        opacity: z.opacity ?? 0.25,
        strokeColor: z.strokeColor,
        strokeWidth: z.strokeWidth || 0,
        label: z.label,
        visible: true,
      };
    });

    const arrows: Record<string, InterpolatedArrowState> = {};
    slide.arrows.forEach((a) => {
      arrows[a.id] = {
        id: a.id,
        arrowType: a.arrowType,
        curveType: a.curveType,
        points: a.points,
        controlPoint: a.controlPoint,
        color: a.color || '#ffffff',
        strokeWidth: a.strokeWidth || 3,
        opacity: 1,
        visible: true,
        sourcePlayerId: a.sourcePlayerId,
        targetPlayerId: a.targetPlayerId,
      };
    });

    const texts: Record<string, InterpolatedTextState> = {};
    slide.texts.forEach((t) => {
      texts[t.id] = {
        id: t.id,
        x: t.x,
        y: t.y,
        content: t.content,
        fontSize: t.fontSize || 16,
        color: t.color || '#ffffff',
        bold: t.bold || false,
        italic: t.italic || false,
        opacity: 1,
        visible: true,
      };
    });

    return {
      players,
      ball: {
        x: slide.ball?.x ?? 50,
        y: slide.ball?.y ?? 50,
        visible: slide.ball?.visible ?? true,
        opacity: 1,
      },
      zones,
      arrows,
      texts,
      currentSlideIndex: 0,
      nextSlideIndex: 0,
      progress: 0,
      isPaused: false,
    };
  }

  // スライド区間の特定
  let accumulatedTime = 0;
  let currentSlideIdx = 0;
  let nextSlideIdx = 1;
  let elapsedInSegment = 0;
  let segmentSlide = slides[0];

  for (let i = 0; i < slides.length - 1; i++) {
    const s = slides[i];
    const segDuration = (s.transitionDurationMs ?? 1000) + (s.pauseMs ?? 500);
    if (timeMs <= accumulatedTime + segDuration || i === slides.length - 2) {
      currentSlideIdx = i;
      nextSlideIdx = i + 1;
      elapsedInSegment = Math.max(0, timeMs - accumulatedTime);
      segmentSlide = s;
      break;
    }
    accumulatedTime += segDuration;
  }

  const slideA = slides[currentSlideIdx];
  const slideB = slides[nextSlideIdx];

  const transitionDuration = Math.max(
    100,
    segmentSlide.transitionDurationMs ?? 1000,
  );

  let rawT = elapsedInSegment / transitionDuration;
  const isPaused = rawT >= 1;
  if (rawT > 1) rawT = 1;

  const ease = applyEasing(rawT, segmentSlide.easing ?? 'ease-in-out');

  // 1. Players 補間 (ID / 背番号 / 名前マッチングによるスムーズモーフィング)
  const players: Record<string, InterpolatedPlayerState> = {};
  const matchedPairs = matchSlidePlayers(slideA.players, slideB.players);

  matchedPairs.forEach(({ key, playerA, playerB }) => {
    const interpolated = interpolatePlayer(playerA, playerB, ease);
    if (interpolated) {
      players[key] = interpolated;
    }
  });

  // 2. Ball 補間
  const ball = interpolateBall(slideA.ball, slideB.ball, ease);

  // 3. Zones 補間 (Vertex Morphing)
  const zones: Record<string, InterpolatedZoneState> = {};
  const zoneMapA = new Map(slideA.zones.map((z) => [z.id, z]));
  const zoneMapB = new Map(slideB.zones.map((z) => [z.id, z]));
  const allZoneIds = new Set([...zoneMapA.keys(), ...zoneMapB.keys()]);

  allZoneIds.forEach((id) => {
    const zA = zoneMapA.get(id);
    const zB = zoneMapB.get(id);
    const interpolated = interpolateZone(zA, zB, ease);
    if (interpolated) zones[id] = interpolated;
  });

  // 4. Arrows 補間
  const arrows: Record<string, InterpolatedArrowState> = {};
  const arrowMapA = new Map(slideA.arrows.map((a) => [a.id, a]));
  const arrowMapB = new Map(slideB.arrows.map((a) => [a.id, a]));
  const allArrowIds = new Set([...arrowMapA.keys(), ...arrowMapB.keys()]);

  allArrowIds.forEach((id) => {
    const aA = arrowMapA.get(id);
    const aB = arrowMapB.get(id);
    const interpolated = interpolateArrow(aA, aB, ease);
    if (interpolated) arrows[id] = interpolated;
  });

  // 5. Texts 補間
  const texts: Record<string, InterpolatedTextState> = {};
  const textMapA = new Map(slideA.texts.map((t) => [t.id, t]));
  const textMapB = new Map(slideB.texts.map((t) => [t.id, t]));
  const allTextIds = new Set([...textMapA.keys(), ...textMapB.keys()]);

  allTextIds.forEach((id) => {
    const tA = textMapA.get(id);
    const tB = textMapB.get(id);
    const interpolated = interpolateText(tA, tB, ease);
    if (interpolated) texts[id] = interpolated;
  });

  return {
    players,
    ball,
    zones,
    arrows,
    texts,
    currentSlideIndex: currentSlideIdx,
    nextSlideIndex: nextSlideIdx,
    progress: rawT,
    isPaused,
  };
}
