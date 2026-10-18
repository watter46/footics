import type React from 'react';
import type {
  ArrowAnnotation,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { SelectedObject } from '../../types';

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

export function resolveHudTarget({
  selected,
  offset,
  nodesRegistryRef,
  data,
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
}): HudTarget | null {
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
  return null;
}
