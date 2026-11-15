import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
  PolygonZone,
} from '@/lib/types/tactical/domain-entities';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolatePolygonPoints(
  pointsA: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  pointsB: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  t: number,
): Array<{ x: number; y: number }> {
  if (pointsA.length === 0 || pointsB.length === 0) {
    return t < 0.5
      ? pointsA.map((p) => ({ x: p.x, y: p.y }))
      : pointsB.map((p) => ({ x: p.x, y: p.y }));
  }

  const maxLen = Math.max(pointsA.length, pointsB.length);
  const result: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < maxLen; i++) {
    const idxA =
      maxLen === 1 ? 0 : Math.round((i * (pointsA.length - 1)) / (maxLen - 1));
    const idxB =
      maxLen === 1 ? 0 : Math.round((i * (pointsB.length - 1)) / (maxLen - 1));
    const pA = pointsA[idxA];
    const pB = pointsB[idxB];
    result.push({
      x: lerp(pA.x, pB.x, t),
      y: lerp(pA.y, pB.y, t),
    });
  }

  return result;
}

export function interpolateZones(
  zonesA: readonly DomainZoneAnnotation[],
  zonesB: readonly DomainZoneAnnotation[],
  ease: number,
): {
  interpolatedZones: DomainZoneAnnotation[];
  zoneOpacityMap: Record<string, { opacity: number; visible: boolean }>;
} {
  const mapA = new Map(zonesA.map((z) => [z.id, z]));
  const mapB = new Map(zonesB.map((z) => [z.id, z]));
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const interpolatedZones: DomainZoneAnnotation[] = [];
  const zoneOpacityMap: Record<string, { opacity: number; visible: boolean }> =
    {};

  for (const id of allIds) {
    const zA = mapA.get(id);
    const zB = mapB.get(id);

    if (zA && zB) {
      if (zA.shapeType === 'rect' && zB.shapeType === 'rect') {
        interpolatedZones.push({
          ...zB,
          x: clampToScreenNorm(lerp(zA.x, zB.x, ease)),
          y: clampToScreenNorm(lerp(zA.y, zB.y, ease)),
          width: lerp(zA.width, zB.width, ease),
          height: lerp(zA.height, zB.height, ease),
          rotation: lerp(zA.rotation ?? 0, zB.rotation ?? 0, ease),
          opacity: lerp(zA.opacity, zB.opacity, ease),
          strokeWidth: lerp(zA.strokeWidth, zB.strokeWidth, ease),
        });
      } else if (zA.shapeType === 'ellipse' && zB.shapeType === 'ellipse') {
        interpolatedZones.push({
          ...zB,
          x: clampToScreenNorm(lerp(zA.x, zB.x, ease)),
          y: clampToScreenNorm(lerp(zA.y, zB.y, ease)),
          width: lerp(zA.width, zB.width, ease),
          height: lerp(zA.height, zB.height, ease),
          rotation: lerp(zA.rotation ?? 0, zB.rotation ?? 0, ease),
          opacity: lerp(zA.opacity, zB.opacity, ease),
          strokeWidth: lerp(zA.strokeWidth, zB.strokeWidth, ease),
        });
      } else if (zA.shapeType === 'polygon' && zB.shapeType === 'polygon') {
        const morphedPoints = interpolatePolygonPoints(
          zA.points,
          zB.points,
          ease,
        ).map((pt) => toScreenNormPoint(pt.x, pt.y));

        interpolatedZones.push({
          ...zB,
          points: morphedPoints,
          opacity: lerp(zA.opacity, zB.opacity, ease),
          strokeWidth: lerp(zA.strokeWidth, zB.strokeWidth, ease),
        } as PolygonZone);
      } else {
        interpolatedZones.push(ease < 0.5 ? zA : zB);
      }

      const activeZone = ease < 0.5 ? zA : zB;
      zoneOpacityMap[id] = {
        opacity: activeZone.opacity,
        visible: activeZone.opacity > 0,
      };
    } else if (zA && !zB) {
      const opacity = zA.opacity * Math.max(0, 1 - ease);
      interpolatedZones.push(zA);
      zoneOpacityMap[id] = { opacity, visible: opacity > 0 };
    } else if (zB) {
      const opacity = zB.opacity * Math.min(1, ease);
      interpolatedZones.push(zB);
      zoneOpacityMap[id] = { opacity, visible: opacity > 0 };
    }
  }

  return { interpolatedZones, zoneOpacityMap };
}

export function interpolateArrows(
  arrowsA: readonly DomainArrowAnnotation[],
  arrowsB: readonly DomainArrowAnnotation[],
  players: readonly DomainPlayer[],
  ease: number,
): {
  interpolatedArrows: DomainArrowAnnotation[];
  arrowProgressMap: Record<
    string,
    { progress: number; dashOffset: number; opacity: number; visible: boolean }
  >;
} {
  const mapA = new Map(arrowsA.map((a) => [a.id, a]));
  const mapB = new Map(arrowsB.map((a) => [a.id, a]));
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const interpolatedArrows: DomainArrowAnnotation[] = [];
  const arrowProgressMap: Record<
    string,
    { progress: number; dashOffset: number; opacity: number; visible: boolean }
  > = {};

  for (const id of allIds) {
    const aA = mapA.get(id);
    const aB = mapB.get(id);

    let arrow: DomainArrowAnnotation;
    let opacity = 1;

    if (aA && aB) {
      const pointsCount = Math.max(aA.points.length, aB.points.length);
      const points = [];
      for (let i = 0; i < pointsCount; i++) {
        const ptA = aA.points[Math.min(i, aA.points.length - 1)];
        const ptB = aB.points[Math.min(i, aB.points.length - 1)];
        points.push(
          toScreenNormPoint(lerp(ptA.x, ptB.x, ease), lerp(ptA.y, ptB.y, ease)),
        );
      }

      let controlPoint = aB.controlPoint;
      if (aA.controlPoint && aB.controlPoint) {
        controlPoint = toScreenNormPoint(
          lerp(aA.controlPoint.x, aB.controlPoint.x, ease),
          lerp(aA.controlPoint.y, aB.controlPoint.y, ease),
        );
      }

      arrow = {
        ...aB,
        points,
        controlPoint,
        strokeWidth: lerp(aA.strokeWidth, aB.strokeWidth, ease),
      };
    } else if (aA && !aB) {
      opacity = Math.max(0, 1 - ease);
      arrow = aA;
    } else {
      opacity = Math.min(1, ease);
      arrow = aB!;
    }

    if (arrow.sourcePlayerId || arrow.targetPlayerId) {
      const sp = arrow.sourcePlayerId
        ? playerMap.get(arrow.sourcePlayerId)
        : undefined;
      const tp = arrow.targetPlayerId
        ? playerMap.get(arrow.targetPlayerId)
        : undefined;

      const nextPoints = [...arrow.points];
      if (sp && nextPoints[0]) {
        nextPoints[0] = toScreenNormPoint(sp.x, sp.y);
      }
      if (tp && nextPoints.length > 1) {
        nextPoints[nextPoints.length - 1] = toScreenNormPoint(tp.x, tp.y);
      }
      arrow = { ...arrow, points: nextPoints };
    }

    interpolatedArrows.push(arrow);
    arrowProgressMap[id] = {
      progress: 1,
      dashOffset: 0,
      opacity,
      visible: opacity > 0,
    };
  }

  return { interpolatedArrows, arrowProgressMap };
}

export function interpolateTexts(
  textsA: readonly DomainTextAnnotation[],
  textsB: readonly DomainTextAnnotation[],
  ease: number,
): DomainTextAnnotation[] {
  const mapA = new Map(textsA.map((t) => [t.id, t]));
  const mapB = new Map(textsB.map((t) => [t.id, t]));
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const interpolatedTexts: DomainTextAnnotation[] = [];

  for (const id of allIds) {
    const tA = mapA.get(id);
    const tB = mapB.get(id);

    if (tA && tB) {
      interpolatedTexts.push({
        ...tB,
        x: clampToScreenNorm(lerp(tA.x, tB.x, ease)),
        y: clampToScreenNorm(lerp(tA.y, tB.y, ease)),
        fontSize: lerp(tA.fontSize, tB.fontSize, ease),
      });
    } else if (tA && !tB) {
      interpolatedTexts.push(tA);
    } else if (tB) {
      interpolatedTexts.push(tB);
    }
  }

  return interpolatedTexts;
}
