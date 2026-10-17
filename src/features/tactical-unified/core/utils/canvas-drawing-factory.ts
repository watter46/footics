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
  color: string,
  shirtNo: string,
): Player {
  return {
    id: `marker-${Date.now()}`,
    area: 'pitch',
    x,
    y,
    team: 'neutral',
    shirtNo,
    style: {
      markerType: 'ring',
      color,
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
  color: string,
): TextAnnotation {
  return {
    id: `text-${Date.now()}`,
    annotationType: 'text',
    content: 'Tactics Note',
    x,
    y,
    color,
    fontSize: 18,
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

  if (['pass', 'dribble'].includes(tool) && dist > 1.5) {
    addArrow({
      id: `arrow-${Date.now()}`,
      annotationType: 'arrow',
      arrowType: tool === 'dribble' ? 'dribble' : 'pass',
      curveType: 'straight',
      points: [
        { x: startX, y: startY },
        { x: currentX, y: currentY },
      ],
      color,
      strokeWidth,
      dashArray: tool === 'dribble' ? [6, 4] : [],
      arrowHead: true,
    });
  } else if (tool === 'zone' && dist > 1.5) {
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    addZone({
      id: `zone-${Date.now()}`,
      annotationType: 'zone',
      zoneType: 'highlight',
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
      color,
      opacity: 0.3,
      strokeWidth: 2,
    });
  }
}
