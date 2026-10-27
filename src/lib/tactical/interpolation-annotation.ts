import type {
  ArrowAnnotation,
  NormalizedPoint,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  interpolateColor,
  interpolatePolygonPoints,
  lerp,
  rectToPoints,
} from './interpolation-geometry';

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
    return {
      ...startZone,
      shapeType: startZone.shapeType || 'rect',
      points: startZone.points || [],
      color: startZone.color || '#f59e0b',
      strokeWidth: startZone.strokeWidth ?? 2,
      opacity: (startZone.opacity ?? 0.25) * Math.max(0, 1 - ease),
      visible: ease < 1,
    };
  }
  if (!startZone && endZone) {
    return {
      ...endZone,
      shapeType: endZone.shapeType || 'rect',
      points: endZone.points || [],
      color: endZone.color || '#f59e0b',
      strokeWidth: endZone.strokeWidth ?? 2,
      opacity: (endZone.opacity ?? 0.25) * Math.min(1, ease),
      visible: true,
    };
  }
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
  const strokeWidth = lerp(zA.strokeWidth ?? 2, zB.strokeWidth ?? 2, ease);

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

  const aAIsCurved =
    aA.curveType === 'curved' ||
    aA.curveType === 'arc' ||
    aA.controlPoint !== undefined;
  const aBIsCurved =
    aB.curveType === 'curved' ||
    aB.curveType === 'arc' ||
    aB.controlPoint !== undefined;

  let controlPoint: NormalizedPoint | undefined;
  let curveType = aB.curveType;

  if (aAIsCurved || aBIsCurved) {
    const cpA = aA.controlPoint ?? {
      x: ((aA.points[0]?.x ?? 0) + (aA.points[1]?.x ?? 0)) / 2,
      y: ((aA.points[0]?.y ?? 0) + (aA.points[1]?.y ?? 0)) / 2,
    };
    const cpB = aB.controlPoint ?? {
      x: ((aB.points[0]?.x ?? 0) + (aB.points[1]?.x ?? 0)) / 2,
      y: ((aB.points[0]?.y ?? 0) + (aB.points[1]?.y ?? 0)) / 2,
    };

    controlPoint = {
      x: lerp(cpA.x, cpB.x, ease),
      y: lerp(cpA.y, cpB.y, ease),
    };

    if (ease === 0) {
      curveType = aA.curveType;
    } else if (ease === 1) {
      curveType = aB.curveType;
    } else {
      curveType =
        aB.curveType === 'arc' || aA.curveType === 'arc' ? 'arc' : 'curved';
    }
  }

  return {
    id: aB.id,
    arrowType: aB.arrowType,
    curveType,
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
