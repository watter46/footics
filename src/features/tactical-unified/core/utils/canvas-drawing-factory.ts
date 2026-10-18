import type {
  ArrowAnnotation,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { DrawingPreviewState } from '../types';

export function createRingMarker(
  x: number,
  y: number,
  color = '#034694',
  _shirtNo = '',
): Player {
  return {
    id: `marker-${Date.now()}`,
    area: 'pitch',
    x,
    y,
    team: 'neutral',
    shirtNo: '',
    style: {
      markerType: 'ring',
      color: color || '#034694',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
      insideContent: 'none',
      bottomLabel: 'none',
    },
    badges: [],
    connectLines: [],
  };
}

export function create2DPlayerMarker(
  x: number,
  y: number,
  color = '#034694',
  shirtNo: string,
): Player {
  return {
    id: `player-${Date.now()}`,
    area: 'pitch',
    x,
    y,
    team: 'home',
    shirtNo,
    name: `Player ${shirtNo}`,
    position: 'SUB',
    style: {
      markerType: 'circle',
      color: color || '#034694',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
      insideContent: 'number',
      bottomLabel: 'number',
    },
    badges: [],
    connectLines: [],
  };
}

export function createTextAnnotation(
  x: number,
  y: number,
  color = '#ffffff',
): TextAnnotation {
  return {
    id: `text-${Date.now()}`,
    annotationType: 'text',
    content: 'Tactics Note',
    x,
    y,
    color: color || '#ffffff',
    fontSize: 16,
    bold: false,
    italic: false,
  };
}

export function commitDrawingShape(
  preview: DrawingPreviewState,
  color: string,
  strokeWidth: number,
  addArrow: (a: ArrowAnnotation) => void,
  addZone: (z: ZoneAnnotation) => void,
): void {
  const { tool, startX, startY, currentX, currentY } = preview;
  const dist = Math.hypot(currentX - startX, currentY - startY);

  const isArrowTool = [
    'arrow_solid',
    'arrow_dash',
    'arrow_wavy',
    'arrow-straight',
    'arrow-curved',
    'line',
    'route_line',
    'pass',
    'dribble',
  ].includes(tool as string);

  if (isArrowTool && dist > 1.5) {
    const isCurve = tool === 'arrow-curved';
    let arrowType: ArrowAnnotation['arrowType'] = 'pass';
    let arrowHead = true;
    let dashArray: number[] = [];
    let endMarker: ArrowAnnotation['endMarker'] = 'arrow';

    if (tool === 'line') {
      arrowType = 'line';
      arrowHead = false;
      dashArray = [];
      endMarker = 'none';
    } else if (tool === 'route_line') {
      arrowType = 'route_line';
      arrowHead = false;
      dashArray = [];
      endMarker = 'dot';
    } else if (tool === 'arrow_solid') {
      arrowType = 'pass';
      arrowHead = true;
      dashArray = [];
      endMarker = 'arrow';
    } else if (tool === 'arrow_dash') {
      arrowType = 'pass';
      arrowHead = true;
      dashArray = [6, 4];
      endMarker = 'arrow';
    } else if (tool === 'arrow_wavy') {
      arrowType = 'dribble';
      arrowHead = true;
      dashArray = [];
      endMarker = 'arrow';
    } else if ((tool as string) === 'dribble') {
      arrowType = 'dribble';
      arrowHead = true;
      dashArray = [6, 4];
      endMarker = 'arrow';
    }

    let finalColor = color || '#ffffff';
    if (color === '#ffffff' || !color) {
      if (tool === 'arrow_wavy') finalColor = '#eab308';
      else if (tool === 'route_line') finalColor = '#38bdf8';
    }

    addArrow({
      id: `arrow-${Date.now()}`,
      annotationType: 'arrow',
      arrowType,
      curveType: isCurve ? 'curved' : 'straight',
      points: [
        { x: startX, y: startY },
        { x: currentX, y: currentY },
      ],
      color: finalColor,
      strokeWidth,
      dashArray,
      arrowHead,
      endMarker,
    });
  } else if (
    ((tool as string) === 'zone' || (tool as string) === 'zone_circle') &&
    dist > 1.5
  ) {
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const zoneColor = color && color !== '#ffffff' ? color : '#ef4444';

    addZone({
      id: `zone-${Date.now()}`,
      annotationType: 'zone',
      zoneType: 'highlight',
      shapeType: (tool as string) === 'zone_circle' ? 'ellipse' : 'rect',
      x: minX,
      y: minY,
      width,
      height,
      points: [
        { x: minX, y: minY },
        { x: minX + width, y: minY },
        { x: minX + width, y: minY + height },
        { x: minX, y: minY + height },
      ],
      color: zoneColor,
      opacity: 0.25,
      strokeWidth: 2,
    });
  }
}
