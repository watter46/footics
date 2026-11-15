import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { SelectedObject } from '../types';

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
  markers: readonly DomainPlayer[],
  bbox: NormBBox,
  teamVisibility?: 'both' | 'home' | 'away',
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const m of markers) {
    if (m.area !== 'pitch') {
      continue;
    }
    if (teamVisibility && teamVisibility !== 'both') {
      if (m.team !== teamVisibility && m.team !== 'neutral') {
        continue;
      }
    }
    if (isInsideBBox(m.x, m.y, bbox)) {
      result.push({ id: m.id, kind: 'player' });
    }
  }
  return result;
}

function findEnclosedTexts(
  texts: readonly DomainTextAnnotation[],
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
  arrows: readonly DomainArrowAnnotation[],
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
  zones: readonly DomainZoneAnnotation[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const z of zones) {
    if (z.shapeType === 'polygon') {
      if (z.points.some((pt) => isInsideBBox(pt.x, pt.y, bbox))) {
        result.push({ id: z.id, kind: 'zone' });
      }
    } else if (isInsideBBox(z.x, z.y, bbox)) {
      result.push({ id: z.id, kind: 'zone' });
    }
  }
  return result;
}

export function getEnclosedObjects(
  slide: DomainSlide,
  bbox: NormBBox,
  teamVisibility?: 'both' | 'home' | 'away',
): SelectedObject[] {
  return [
    ...findEnclosedMarkers(slide.players, bbox, teamVisibility),
    ...findEnclosedTexts(slide.texts, bbox),
    ...findEnclosedArrows(slide.arrows, bbox),
    ...findEnclosedZones(slide.zones, bbox),
  ];
}
