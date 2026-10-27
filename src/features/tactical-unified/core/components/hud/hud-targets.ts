import type React from 'react';
import type { SelectedObject } from '@/features/tactical-unified/core/types';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import type {
  ArrowAnnotation,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

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

function resolvePlayerTarget(
  player: Player,
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
  arrow: ArrowAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget | null {
  const node = nodesRegistryRef?.current?.arrowNodes?.get?.(arrow.id)?.node;
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        height: Math.max(rect.height, 24),
      };
    } catch {
      // fallback
    }
  }
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
  zone: ZoneAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const node = nodesRegistryRef?.current?.zoneNodes?.get?.(zone.id);
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        height: Math.max(rect.height, 30),
      };
    } catch {
      // fallback
    }
  }

  let normX = zone.x ?? 20;
  let normY = zone.y ?? 20;
  let normW = zone.width ?? 30;
  let normH = zone.height ?? 20;

  if (zone.points && zone.points.length > 0) {
    const xs = zone.points.map((p) => p.x);
    const ys = zone.points.map((p) => p.y);
    normX = Math.min(...xs);
    normY = Math.min(...ys);
    normW = Math.max(...xs) - normX;
    normH = Math.max(...ys) - normY;
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
  text: TextAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const node = nodesRegistryRef?.current?.textNodes?.get?.(text.id);
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        height: Math.max(rect.height, 24),
      };
    } catch {
      // fallback
    }
  }
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
  markers: Player[],
): HudTarget | null {
  const p1 = parentPlayerId
    ? markers.find((m) => m.id === parentPlayerId)
    : markers.find((m) => m.connectLines?.some((cl) => cl.id === selectedId));
  if (!p1) return null;
  const cl = p1.connectLines?.find((c) => c.id === selectedId);
  if (!cl) return null;
  const p2 = markers.find((m) => m.id === cl.toPlayerId);
  if (!p2) return null;

  const sX = offset.x + (p1.x / 100) * offset.width;
  const sY = offset.y + (p1.y / 100) * offset.height;
  const eX = offset.x + (p2.x / 100) * offset.width;
  const eY = offset.y + (p2.y / 100) * offset.height;
  return { x: (sX + eX) / 2, y: (sY + eY) / 2, height: 16 };
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
  data: {
    markers: Player[];
    arrows: ArrowAnnotation[];
    zones: ZoneAnnotation[];
    texts: TextAnnotation[];
  };
  resolveExtraTarget?: (
    selected: SelectedObject,
    offset: HudOffsetRect,
  ) => HudTarget | null;
}): HudTarget | null {
  if (resolveExtraTarget) {
    const extra = resolveExtraTarget(selected, offset);
    if (extra) return extra;
  }

  if (selected.kind === 'ball') {
    const ballNode = nodesRegistryRef?.current?.ballNode;
    if (ballNode) {
      try {
        const rect = ballNode.getClientRect();
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          height: Math.max(rect.height, 24),
        };
      } catch {
        // fallback
      }
    }
    return null;
  }

  if (selected.kind === 'player') {
    const player = data.markers.find((p) => p.id === selected.id);
    return player
      ? resolvePlayerTarget(player, offset, nodesRegistryRef)
      : null;
  }
  if (selected.kind === 'arrow') {
    const arrow = data.arrows.find((a) => a.id === selected.id);
    return arrow ? resolveArrowTarget(arrow, offset, nodesRegistryRef) : null;
  }
  if (selected.kind === 'zone') {
    const zone = data.zones.find((z) => z.id === selected.id);
    return zone ? resolveZoneTarget(zone, offset, nodesRegistryRef) : null;
  }
  if (selected.kind === 'text') {
    const text = data.texts.find((t) => t.id === selected.id);
    return text ? resolveTextTarget(text, offset, nodesRegistryRef) : null;
  }
  if (selected.kind === 'connect-line') {
    return resolveConnectLineTarget(
      selected.id,
      selected.parentPlayerId,
      offset,
      data.markers,
    );
  }
  return null;
}
