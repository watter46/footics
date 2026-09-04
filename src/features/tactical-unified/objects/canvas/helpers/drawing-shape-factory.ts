import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

export interface Point2D {
  x: number;
  y: number;
}

const ARROW_CONFIGS: Record<string, Partial<ArrowAnnotation>> = {
  line: {
    arrowType: 'line',
    curveType: 'straight',
    color: '#ef4444',
    strokeWidth: 2.5,
    dashArray: [],
    arrowHead: false,
    endMarker: 'none',
  },
  route_line: {
    arrowType: 'route_line',
    curveType: 'straight',
    color: '#38bdf8',
    strokeWidth: 3,
    dashArray: [],
    arrowHead: false,
    endMarker: 'dot',
  },
  arrow_solid: {
    arrowType: 'pass',
    curveType: 'straight',
    color: '#38bdf8',
    strokeWidth: 3,
    dashArray: [],
    arrowHead: true,
    endMarker: 'arrow',
  },
  'arrow-straight': {
    arrowType: 'pass',
    curveType: 'straight',
    color: '#38bdf8',
    strokeWidth: 3,
    dashArray: [],
    arrowHead: true,
    endMarker: 'arrow',
  },
  arrow_dash: {
    arrowType: 'move',
    curveType: 'straight',
    color: '#ffffff',
    strokeWidth: 3,
    dashArray: [6, 4],
    arrowHead: true,
    endMarker: 'arrow',
  },
  'arrow-curved': {
    arrowType: 'move',
    curveType: 'straight',
    color: '#ffffff',
    strokeWidth: 3,
    dashArray: [6, 4],
    arrowHead: true,
    endMarker: 'arrow',
  },
  arrow_wavy: {
    arrowType: 'dribble',
    curveType: 'straight',
    color: '#fbbf24',
    strokeWidth: 3,
    dashArray: [],
    arrowHead: true,
    endMarker: 'arrow',
  },
};

export function createDrawnArrow(
  tool: string,
  startPoint: Point2D,
  endPoint: Point2D,
): ArrowAnnotation | null {
  const config = ARROW_CONFIGS[tool];
  if (!config) return null;

  return {
    id: crypto.randomUUID(),
    annotationType: 'arrow',
    points: [startPoint, endPoint],
    ...config,
  } as ArrowAnnotation;
}

export function createDrawnZone(
  sNormX: number,
  sNormY: number,
  cNormX: number,
  cNormY: number,
): ZoneAnnotation {
  const minX = Math.min(sNormX, cNormX);
  const maxX = Math.max(sNormX, cNormX);
  const minY = Math.min(sNormY, cNormY);
  const maxY = Math.max(sNormY, cNormY);

  return {
    id: crypto.randomUUID(),
    annotationType: 'zone',
    zoneType: 'generic',
    shapeType: 'rect',
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
    points: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    color: '#22c55e',
    opacity: 0.35,
    strokeColor: '#22c55e',
    strokeWidth: 2,
    isComplete: true,
  };
}
