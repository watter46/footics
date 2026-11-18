import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  ArrowMarkerType,
  DomainArrowAnnotation,
} from '@/lib/types/tactical/domain-entities';

export function normalizeArrows(rawArrows: unknown): DomainArrowAnnotation[] {
  if (!Array.isArray(rawArrows)) return [];

  const arrows: DomainArrowAnnotation[] = [];
  for (const raw of rawArrows) {
    if (!raw || typeof raw !== 'object') continue;
    const a = raw as Record<string, unknown>;

    const id = typeof a.id === 'string' && a.id ? a.id : crypto.randomUUID();
    const arrowType =
      typeof a.arrowType === 'string' &&
      [
        'pass',
        'move',
        'dribble',
        'defend',
        'run',
        'line',
        'route_line',
        'generic',
      ].includes(a.arrowType)
        ? (a.arrowType as DomainArrowAnnotation['arrowType'])
        : 'pass';

    const curveType =
      typeof a.curveType === 'string' &&
      ['straight', 'curved', 'arc'].includes(a.curveType)
        ? (a.curveType as DomainArrowAnnotation['curveType'])
        : 'straight';

    let points: {
      x: ReturnType<typeof clampToScreenNorm>;
      y: ReturnType<typeof clampToScreenNorm>;
    }[] = [];

    if (Array.isArray(a.points)) {
      points = a.points
        .filter((pt): pt is { x: number; y: number } =>
          Boolean(pt && typeof pt === 'object'),
        )
        .map((pt) => ({
          x: clampToScreenNorm(typeof pt.x === 'number' ? pt.x : 0),
          y: clampToScreenNorm(typeof pt.y === 'number' ? pt.y : 0),
        }));
    }

    if (points.length < 2) {
      points = [
        { x: clampToScreenNorm(0), y: clampToScreenNorm(0) },
        { x: clampToScreenNorm(10), y: clampToScreenNorm(10) },
      ];
    }

    const rawStartMarker: ArrowMarkerType =
      a.startMarker === 'arrow' || a.startMarker === 'dot'
        ? a.startMarker
        : 'none';

    let endMarker: ArrowMarkerType = 'arrow';
    if (
      a.endMarker === 'none' ||
      a.endMarker === 'arrow' ||
      a.endMarker === 'dot'
    ) {
      endMarker = a.endMarker;
    } else if (a.arrowHead === false) {
      endMarker = 'none';
    }

    const startMarker: ArrowMarkerType =
      arrowType === 'route_line' &&
      rawStartMarker === 'none' &&
      endMarker === 'dot'
        ? 'dot'
        : rawStartMarker;

    const color =
      typeof a.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(a.color)
        ? a.color
        : '#ffffff';

    const strokeWidth =
      typeof a.strokeWidth === 'number'
        ? Math.max(1, Math.min(10, a.strokeWidth))
        : 3;

    const dashArray = Array.isArray(a.dashArray)
      ? a.dashArray.filter((n): n is number => typeof n === 'number')
      : [];

    arrows.push({
      id,
      annotationType: 'arrow',
      arrowType,
      curveType,
      points: points as [
        {
          x: ReturnType<typeof clampToScreenNorm>;
          y: ReturnType<typeof clampToScreenNorm>;
        },
        {
          x: ReturnType<typeof clampToScreenNorm>;
          y: ReturnType<typeof clampToScreenNorm>;
        },
        ...{
          x: ReturnType<typeof clampToScreenNorm>;
          y: ReturnType<typeof clampToScreenNorm>;
        }[],
      ],
      controlPoint:
        a.controlPoint && typeof a.controlPoint === 'object'
          ? {
              x: clampToScreenNorm((a.controlPoint as { x: number }).x ?? 0),
              y: clampToScreenNorm((a.controlPoint as { y: number }).y ?? 0),
            }
          : undefined,
      color,
      strokeWidth,
      dashArray,
      startMarker,
      endMarker,
      label: typeof a.label === 'string' ? a.label : undefined,
      sourcePlayerId:
        typeof a.sourcePlayerId === 'string' ? a.sourcePlayerId : undefined,
      targetPlayerId:
        typeof a.targetPlayerId === 'string' ? a.targetPlayerId : undefined,
      locked: typeof a.locked === 'boolean' ? a.locked : undefined,
      effect:
        a.effect && typeof a.effect === 'object'
          ? (a.effect as DomainArrowAnnotation['effect'])
          : undefined,
    });
  }

  return arrows;
}
