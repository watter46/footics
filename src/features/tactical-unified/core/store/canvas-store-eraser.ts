import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { AnnotationsData } from '../types';
import { distToSegment, isPointInPolygon } from '../utils/geometry';

type Point = { x: number; y: number };

function isArrowHit(arrow: ArrowAnnotation, p: Point, r: number): boolean {
  const pts = arrow.points;
  for (const pt of pts) {
    if (Math.hypot(pt.x - p.x, pt.y - p.y) <= r) return true;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (p1 && p2 && distToSegment(p, p1, p2) <= r) return true;
  }
  return false;
}

function isZonePolygonHit(pts: Point[], p: Point, r: number): boolean {
  for (const pt of pts) {
    if (Math.hypot(pt.x - p.x, pt.y - p.y) <= r) return true;
  }
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    if (p1 && p2 && distToSegment(p, p1, p2) <= r) return true;
  }
  return pts.length >= 3 && isPointInPolygon(p, pts);
}

function isZoneRectHit(z: ZoneAnnotation, p: Point, r: number): boolean {
  if (
    z.x === undefined ||
    z.y === undefined ||
    z.width === undefined ||
    z.height === undefined
  ) {
    return false;
  }
  return (
    p.x >= z.x - r &&
    p.x <= z.x + z.width + r &&
    p.y >= z.y - r &&
    p.y <= z.y + z.height + r
  );
}

function isZoneHit(zone: ZoneAnnotation, p: Point, r: number): boolean {
  if (zone.points && zone.points.length >= 2) {
    if (isZonePolygonHit(zone.points, p, r)) return true;
  }
  return isZoneRectHit(zone, p, r);
}

export function eraseAnnotationsAtPoint(
  annotations: AnnotationsData,
  point: Point,
  radius = 4.0,
): { nextAnnotations: AnnotationsData; hasChanged: boolean } {
  let changed = false;

  const arrows = annotations.arrows.filter((a) => {
    if (isArrowHit(a, point, radius)) {
      changed = true;
      return false;
    }
    return true;
  });

  const zones = annotations.zones.filter((z) => {
    if (isZoneHit(z, point, radius)) {
      changed = true;
      return false;
    }
    return true;
  });

  const texts = annotations.texts.filter((t) => {
    if (Math.hypot(t.x - point.x, t.y - point.y) <= radius) {
      changed = true;
      return false;
    }
    return true;
  });

  const markers = annotations.markers.filter((m) => {
    if (Math.hypot(m.x - point.x, m.y - point.y) <= radius) {
      changed = true;
      return false;
    }
    return true;
  });

  return {
    nextAnnotations: { arrows, zones, texts, markers },
    hasChanged: changed,
  };
}
