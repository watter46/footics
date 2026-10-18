import type {
  ArrowAnnotation,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { AnnotationsData, SelectedObject } from '../types';

export interface NormBBox {
  minNormX: number;
  maxNormX: number;
  minNormY: number;
  maxNormY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isShift: boolean;
}

function isInsideBBox(x: number, y: number, bbox: NormBBox): boolean {
  return (
    x >= bbox.minNormX &&
    x <= bbox.maxNormX &&
    y >= bbox.minNormY &&
    y <= bbox.maxNormY
  );
}

function findEnclosedMarkers(
  markers: Player[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const m of markers) {
    if (isInsideBBox(m.x, m.y, bbox)) {
      result.push({ id: m.id, kind: 'player' });
    }
  }
  return result;
}

function findEnclosedTexts(
  texts: TextAnnotation[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const t of texts) {
    if (isInsideBBox(t.x, t.y, bbox)) {
      result.push({ id: t.id, kind: 'text' });
    }
  }
  return result;
}

function findEnclosedArrows(
  arrows: ArrowAnnotation[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const a of arrows) {
    if (a.points.some((pt) => isInsideBBox(pt.x, pt.y, bbox))) {
      result.push({ id: a.id, kind: 'arrow' });
    }
  }
  return result;
}

function findEnclosedZones(
  zones: ZoneAnnotation[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const z of zones) {
    const pts = z.points ?? [{ x: z.x ?? 0, y: z.y ?? 0 }];
    if (pts.some((pt) => isInsideBBox(pt.x, pt.y, bbox))) {
      result.push({ id: z.id, kind: 'zone' });
    }
  }
  return result;
}

export function getEnclosedObjects(
  annotations: AnnotationsData,
  bbox: NormBBox,
): SelectedObject[] {
  return [
    ...findEnclosedMarkers(annotations.markers, bbox),
    ...findEnclosedTexts(annotations.texts, bbox),
    ...findEnclosedArrows(annotations.arrows, bbox),
    ...findEnclosedZones(annotations.zones, bbox),
  ];
}
