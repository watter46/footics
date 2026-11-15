import type {
  DomainArrowAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

type Point2D = { readonly x: number; readonly y: number };

function distToSegment(p: Point2D, v: Point2D, w: Point2D): number {
  const dx = w.x - v.x;
  const dy = w.y - v.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * dx + (p.y - v.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * dx), p.y - (v.y + t * dy));
}

function isPointInPolygon(p: Point2D, polygon: readonly Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;
    const intersect =
      pi.y > p.y !== pj.y > p.y &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isArrowHit(
  arrow: DomainArrowAnnotation,
  p: Point2D,
  r: number,
): boolean {
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

function isZonePolygonHit(
  pts: readonly Point2D[],
  p: Point2D,
  r: number,
): boolean {
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

function isZoneHit(zone: DomainZoneAnnotation, p: Point2D, r: number): boolean {
  if (zone.shapeType === 'polygon') {
    return isZonePolygonHit(zone.points, p, r);
  }
  // rect / ellipse: rotate point around zone center if rotated
  const cx = zone.x + zone.width / 2;
  const cy = zone.y + zone.height / 2;
  let px = p.x;
  let py = p.y;
  if (zone.rotation && zone.rotation !== 0) {
    const rad = (-zone.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = p.x - cx;
    const dy = p.y - cy;
    px = cx + dx * cos - dy * sin;
    py = cy + dx * sin + dy * cos;
  }
  if (zone.shapeType === 'ellipse') {
    const rx = zone.width / 2 + r;
    const ry = zone.height / 2 + r;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (px - cx) / rx;
    const ny = (py - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }
  return (
    px >= zone.x - r &&
    px <= zone.x + zone.width + r &&
    py >= zone.y - r &&
    py <= zone.y + zone.height + r
  );
}

export function eraseEntitiesAtPoint(
  slide: DomainSlide,
  point: { readonly x: number; readonly y: number },
  radius = 4.0,
): readonly string[] {
  const ids: string[] = [];

  for (const arrow of slide.arrows) {
    if (arrow.locked) continue;
    if (isArrowHit(arrow, point, radius)) {
      ids.push(arrow.id);
    }
  }

  for (const zone of slide.zones) {
    if (zone.locked) continue;
    if (isZoneHit(zone, point, radius)) {
      ids.push(zone.id);
    }
  }

  for (const text of slide.texts) {
    if (text.locked) continue;
    if (Math.hypot(text.x - point.x, text.y - point.y) <= radius) {
      ids.push(text.id);
    }
  }

  for (const player of slide.players) {
    if (player.locked) continue;
    if (
      player.area === 'pitch' &&
      player.shirtNo === '' &&
      (player.style.markerType === 'ring' ||
        player.style.markerType === 'ring-fade') &&
      Math.hypot(player.x - point.x, player.y - point.y) <= radius
    ) {
      ids.push(player.id);
    }
  }

  return ids;
}
