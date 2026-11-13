import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

interface Point {
  readonly x: number;
  readonly y: number;
}

export const DEFAULT_ERASER_RADIUS = 4.0;

function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2),
  );
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.y - (v.y + t * (w.y - v.y)),
  );
}

function isInsidePolygon(p: Point, vs: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const { x: xi, y: yi } = vs[i];
    const { x: xj, y: yj } = vs[j];
    const crosses =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function isNearPolyline(
  pts: readonly Point[],
  p: Point,
  r: number,
  closed: boolean,
): boolean {
  if (pts.some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) <= r)) return true;
  const count = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) {
    if (distToSegment(p, pts[i], pts[(i + 1) % pts.length]) <= r) return true;
  }
  return false;
}

/**
 * 指点（ScreenNorm 0〜100）と半径に当たる矢印・ゾーン・テキストの ID を返す純粋関数。
 * ロック中のエンティティは対象外。削除は DELETE_ENTITIES 命令で行う。
 */
export function findEraseTargetIds(
  slide: DomainSlide,
  point: Point,
  radius: number = DEFAULT_ERASER_RADIUS,
): readonly string[] {
  const ids: string[] = [];

  for (const a of slide.arrows) {
    if (!a.locked && isNearPolyline(a.points, point, radius, false)) {
      ids.push(a.id);
    }
  }

  for (const z of slide.zones) {
    if (z.locked) continue;
    if (z.shapeType === 'polygon') {
      if (
        isNearPolyline(z.points, point, radius, true) ||
        isInsidePolygon(point, z.points)
      ) {
        ids.push(z.id);
      }
      continue;
    }
    const inBox =
      point.x >= z.x - radius &&
      point.x <= z.x + z.width + radius &&
      point.y >= z.y - radius &&
      point.y <= z.y + z.height + radius;
    if (inBox) ids.push(z.id);
  }

  for (const t of slide.texts) {
    if (!t.locked && Math.hypot(t.x - point.x, t.y - point.y) <= radius) {
      ids.push(t.id);
    }
  }

  return ids;
}
