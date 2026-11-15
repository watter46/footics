import type React from 'react';
import type {
  SelectedObject,
  SelectedObjectKind,
} from '@/features/tactical-unified/core/types';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';

export interface HudTarget {
  x: number;
  y: number;
  height: number;
}

export interface HudOffsetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getNodeCenterTarget(
  node:
    | {
        getClientRect: () => {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }
    | undefined
    | null,
  minHeight: number,
): HudTarget | null {
  if (!node) return null;
  try {
    const rect = node.getClientRect();
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      height: Math.max(rect.height, minHeight),
    };
  } catch {
    return null;
  }
}

function resolvePlayerTarget(
  player: DomainPlayer,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const node = nodesRegistryRef?.current?.playerNodes?.get?.(player.id);
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        height: rect.height || 30,
      };
    } catch {
      // fallback
    }
  }
  const pxX = offset.x + (player.x / 100) * offset.width;
  const pxY = offset.y + (player.y / 100) * offset.height;
  return { x: pxX, y: pxY, height: 32 };
}

function resolveArrowTarget(
  arrow: DomainArrowAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget | null {
  const nodeTarget = getNodeCenterTarget(
    nodesRegistryRef?.current?.arrowNodes?.get?.(arrow.id)?.node,
    24,
  );
  if (nodeTarget) return nodeTarget;
  if (arrow.points && arrow.points.length >= 2) {
    const allPoints = [...arrow.points];
    if (arrow.controlPoint) {
      allPoints.push(arrow.controlPoint);
    }
    const xs = allPoints.map((p) => offset.x + (p.x / 100) * offset.width);
    const ys = allPoints.map((p) => offset.y + (p.y / 100) * offset.height);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      height: Math.max(maxY - minY, 24),
    };
  }
  return null;
}

function resolveZoneTarget(
  zone: DomainZoneAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const nodeTarget = getNodeCenterTarget(
    nodesRegistryRef?.current?.zoneNodes?.get?.(zone.id),
    30,
  );
  if (nodeTarget) return nodeTarget;

  let normX = 20;
  let normY = 20;
  let normW = 30;
  let normH = 20;

  if (zone.shapeType === 'polygon' && zone.points.length > 0) {
    const xs = zone.points.map((p) => p.x);
    const ys = zone.points.map((p) => p.y);
    normX = Math.min(...xs);
    normY = Math.min(...ys);
    normW = Math.max(...xs) - normX;
    normH = Math.max(...ys) - normY;
  } else if (zone.shapeType !== 'polygon') {
    normX = zone.x;
    normY = zone.y;
    normW = zone.width;
    normH = zone.height;
  }

  const pxW = (normW / 100) * offset.width;
  const pxH = Math.max((normH / 100) * offset.height, 30);

  return {
    x: offset.x + (normX / 100) * offset.width + pxW / 2,
    y: offset.y + (normY / 100) * offset.height + pxH / 2,
    height: pxH,
  };
}

function resolveTextTarget(
  text: DomainTextAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const nodeTarget = getNodeCenterTarget(
    nodesRegistryRef?.current?.textNodes?.get?.(text.id),
    24,
  );
  if (nodeTarget) return nodeTarget;
  return {
    x: offset.x + (text.x / 100) * offset.width,
    y: offset.y + (text.y / 100) * offset.height,
    height: 24,
  };
}

function resolveConnectLineTarget(
  selectedId: string,
  parentPlayerId: string | undefined,
  offset: HudOffsetRect,
  players: readonly DomainPlayer[],
): HudTarget | null {
  const p1 = parentPlayerId
    ? players.find((m) => m.id === parentPlayerId)
    : players.find(
        (m) =>
          m.area !== 'bench' &&
          m.connectLines?.some((cl) => cl.id === selectedId),
      );
  if (!p1 || p1.area === 'bench') return null;
  const cl = p1.connectLines?.find((c) => c.id === selectedId);
  if (!cl) return null;
  const p2 = players.find((m) => m.id === cl.toPlayerId);
  if (!p2) return null;

  const sX = offset.x + (p1.x / 100) * offset.width;
  const sY = offset.y + (p1.y / 100) * offset.height;
  const eX = offset.x + (p2.x / 100) * offset.width;
  const eY = offset.y + (p2.y / 100) * offset.height;
  return { x: (sX + eX) / 2, y: (sY + eY) / 2, height: 16 };
}

export type HudTargetData = {
  players: readonly DomainPlayer[];
  arrows: readonly DomainArrowAnnotation[];
  zones: readonly DomainZoneAnnotation[];
  texts: readonly DomainTextAnnotation[];
};

export type HudTargetResolver = (ctx: {
  selected: SelectedObject;
  offset: HudOffsetRect;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  data: HudTargetData;
}) => HudTarget | null;

export const HUD_TARGET_RESOLVERS = new Map<
  SelectedObjectKind,
  HudTargetResolver
>([
  [
    'ball',
    ({ nodesRegistryRef }) =>
      getNodeCenterTarget(nodesRegistryRef?.current?.ballNode, 24),
  ],
  [
    'player',
    ({ selected, offset, nodesRegistryRef, data }) => {
      const player = data.players.find((p) => p.id === selected.id);
      if (!player || player.area === 'bench') return null;
      return resolvePlayerTarget(player, offset, nodesRegistryRef);
    },
  ],
  [
    'arrow',
    ({ selected, offset, nodesRegistryRef, data }) => {
      const arrow = data.arrows.find((a) => a.id === selected.id);
      return arrow ? resolveArrowTarget(arrow, offset, nodesRegistryRef) : null;
    },
  ],
  [
    'zone',
    ({ selected, offset, nodesRegistryRef, data }) => {
      const zone = data.zones.find((z) => z.id === selected.id);
      return zone ? resolveZoneTarget(zone, offset, nodesRegistryRef) : null;
    },
  ],
  [
    'text',
    ({ selected, offset, nodesRegistryRef, data }) => {
      const text = data.texts.find((t) => t.id === selected.id);
      return text ? resolveTextTarget(text, offset, nodesRegistryRef) : null;
    },
  ],
  [
    'connect-line',
    ({ selected, offset, data }) => {
      return resolveConnectLineTarget(
        selected.id,
        selected.parentPlayerId,
        offset,
        data.players,
      );
    },
  ],
]);

export function registerHudTargetResolver(
  kind: SelectedObjectKind,
  resolver: HudTargetResolver,
): void {
  HUD_TARGET_RESOLVERS.set(kind, resolver);
}

export function resolveHudTarget({
  selected,
  offset,
  nodesRegistryRef,
  data,
  resolveExtraTarget,
}: {
  selected: SelectedObject;
  offset: HudOffsetRect;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  data: HudTargetData;
  resolveExtraTarget?: (
    selected: SelectedObject,
    offset: HudOffsetRect,
  ) => HudTarget | null;
}): HudTarget | null {
  if (resolveExtraTarget) {
    const extra = resolveExtraTarget(selected, offset);
    if (extra) return extra;
  }

  const resolver = HUD_TARGET_RESOLVERS.get(selected.kind);
  if (resolver) {
    return resolver({ selected, offset, nodesRegistryRef, data });
  }

  return null;
}
