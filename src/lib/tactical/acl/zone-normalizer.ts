import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';

export function normalizeZones(rawZones: unknown): DomainZoneAnnotation[] {
  if (!Array.isArray(rawZones)) return [];

  const zones: DomainZoneAnnotation[] = [];
  for (const raw of rawZones) {
    if (!raw || typeof raw !== 'object') continue;
    const z = raw as Record<string, unknown>;

    if (z.isComplete === false) continue;

    const id = typeof z.id === 'string' && z.id ? z.id : crypto.randomUUID();
    const zoneType =
      typeof z.zoneType === 'string' &&
      [
        'highlight',
        'space',
        'danger',
        'pressing',
        'buildup',
        'generic',
      ].includes(z.zoneType)
        ? (z.zoneType as DomainZoneAnnotation['zoneType'])
        : 'generic';

    const color =
      typeof z.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(z.color)
        ? z.color
        : '#f59e0b';

    const opacity =
      typeof z.opacity === 'number'
        ? Math.max(0, Math.min(1, z.opacity))
        : 0.25;

    const strokeColor =
      typeof z.strokeColor === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(z.strokeColor)
        ? z.strokeColor
        : undefined;

    const strokeOpacity =
      typeof z.strokeOpacity === 'number'
        ? Math.max(0, Math.min(1, z.strokeOpacity))
        : undefined;

    const strokeWidth =
      typeof z.strokeWidth === 'number'
        ? Math.max(0, Math.min(8, z.strokeWidth))
        : 3;

    const baseZone = {
      id,
      annotationType: 'zone' as const,
      zoneType,
      color,
      opacity,
      strokeColor,
      strokeOpacity,
      strokeWidth,
      label: typeof z.label === 'string' ? z.label : undefined,
      locked: typeof z.locked === 'boolean' ? z.locked : undefined,
      effect:
        z.effect && typeof z.effect === 'object'
          ? (z.effect as DomainZoneAnnotation['effect'])
          : undefined,
    };

    if (
      z.shapeType === 'polygon' ||
      (Array.isArray(z.points) && z.points.length >= 3)
    ) {
      const points = Array.isArray(z.points)
        ? z.points
            .filter((pt): pt is { x: number; y: number } =>
              Boolean(pt && typeof pt === 'object'),
            )
            .map((pt) => ({
              x: clampToScreenNorm(typeof pt.x === 'number' ? pt.x : 0),
              y: clampToScreenNorm(typeof pt.y === 'number' ? pt.y : 0),
            }))
        : [];

      if (points.length >= 3) {
        zones.push({
          ...baseZone,
          shapeType: 'polygon',
          points: points as [
            {
              x: ReturnType<typeof clampToScreenNorm>;
              y: ReturnType<typeof clampToScreenNorm>;
            },
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
        });
        continue;
      }
    }

    const x = clampToScreenNorm(typeof z.x === 'number' ? z.x : 50);
    const y = clampToScreenNorm(typeof z.y === 'number' ? z.y : 50);
    const width = typeof z.width === 'number' && z.width > 0 ? z.width : 20;
    const height = typeof z.height === 'number' && z.height > 0 ? z.height : 20;
    const rotation = typeof z.rotation === 'number' ? z.rotation : undefined;

    if (z.shapeType === 'ellipse') {
      zones.push({
        ...baseZone,
        shapeType: 'ellipse',
        x,
        y,
        width,
        height,
        rotation,
      });
    } else {
      zones.push({
        ...baseZone,
        shapeType: 'rect',
        x,
        y,
        width,
        height,
        rotation,
      });
    }
  }

  return zones;
}
