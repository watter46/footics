import type React from 'react';
import type { SelectedObject } from '@/features/tactical-unified/core/types';
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
  nodesRegistryRef?: React.MutableRefObject<any>,
): HudTarget {
  const node = nodesRegistryRef?.current?.playerNodes?.get?.(player.id);
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y,
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
  nodesRegistryRef?: React.MutableRefObject<any>,
): HudTarget | null {
  const node = nodesRegistryRef?.current?.arrowNodes?.get?.(arrow.id)?.node;
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y,
        height: rect.height || 20,
      };
    } catch {
      // fallback
    }
  }
  if (arrow.points && arrow.points.length >= 2) {
    if (arrow.controlPoint) {
      return {
        x: offset.x + (arrow.controlPoint.x / 100) * offset.width,
        y: offset.y + (arrow.controlPoint.y / 100) * offset.height,
        height: 20,
      };
    }
    const sX = offset.x + (arrow.points[0].x / 100) * offset.width;
    const sY = offset.y + (arrow.points[0].y / 100) * offset.height;
    const eX = offset.x + (arrow.points[1].x / 100) * offset.width;
    const eY = offset.y + (arrow.points[1].y / 100) * offset.height;
    return { x: (sX + eX) / 2, y: (sY + eY) / 2, height: 20 };
  }
  return null;
}

function resolveZoneTarget(
  zone: ZoneAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<any>,
): HudTarget {
  const node = nodesRegistryRef?.current?.zoneNodes?.get?.(zone.id);
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y,
        height: rect.height || 30,
      };
    } catch {
      // fallback
    }
  }
  const normX = zone.x ?? zone.points?.[0]?.x ?? 20;
  const normY = zone.y ?? zone.points?.[0]?.y ?? 20;
  const normH = zone.height ?? 20;
  return {
    x: offset.x + (normX / 100) * offset.width + 30,
    y: offset.y + (normY / 100) * offset.height,
    height: (normH / 100) * offset.height,
  };
}

function resolveTextTarget(
  text: TextAnnotation,
  offset: HudOffsetRect,
  nodesRegistryRef?: React.MutableRefObject<any>,
): HudTarget {
  const node = nodesRegistryRef?.current?.textNodes?.get?.(text.id);
  if (node) {
    try {
      const rect = node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y,
        height: rect.height || 24,
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
  nodesRegistryRef?: React.MutableRefObject<any>;
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
          y: rect.y,
          height: rect.height || 24,
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
