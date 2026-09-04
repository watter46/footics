import type React from 'react';
import type {
  ArrowAnnotation,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../canvas/helpers/canvas-registry';
import type { HudRect, HudTarget } from './hud-marker-targets';

export function getArrowTarget(
  arrow: ArrowAnnotation,
  offset: HudRect,
  nodesRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const konvaEntry = nodesRef?.current?.arrowNodes.get(arrow.id);
  if (konvaEntry?.node) {
    try {
      const rect = konvaEntry.node.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y,
        height: rect.height || 20,
      };
    } catch {
      // Fallback below
    }
  }

  if (arrow.points && arrow.points.length >= 2) {
    const sX = offset.x + (arrow.points[0].x / 100) * offset.width;
    const sY = offset.y + (arrow.points[0].y / 100) * offset.height;
    const eX = offset.x + (arrow.points[1].x / 100) * offset.width;
    const eY = offset.y + (arrow.points[1].y / 100) * offset.height;
    if (arrow.controlPoint) {
      return {
        x: offset.x + (arrow.controlPoint.x / 100) * offset.width,
        y: offset.y + (arrow.controlPoint.y / 100) * offset.height,
        height: 20,
      };
    }
    return { x: (sX + eX) / 2, y: (sY + eY) / 2, height: 20 };
  }

  return {
    x: offset.x + offset.width / 2,
    y: offset.y + offset.height / 2,
    height: 20,
  };
}

export function getZoneTarget(
  zone: ZoneAnnotation,
  offset: HudRect,
  nodesRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const zoneNode = nodesRef?.current?.zoneNodes.get(zone.id);
  if (zoneNode) {
    try {
      const rect = zoneNode.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y,
        height: rect.height || 30,
      };
    } catch {
      // Fallback
    }
  }

  const normPosX = zone.x ?? zone.points?.[0]?.x ?? 20;
  const normPosY = zone.y ?? zone.points?.[0]?.y ?? 20;
  const normH = zone.height ?? 20;
  return {
    x: offset.x + (normPosX / 100) * offset.width + 30,
    y: offset.y + (normPosY / 100) * offset.height,
    height: (normH / 100) * offset.height,
  };
}

export function getTextTarget(
  text: TextAnnotation,
  offset: HudRect,
  nodesRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  const textNode = nodesRef?.current?.textNodes.get(text.id);
  if (textNode) {
    try {
      const rect = textNode.getClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y,
        height: rect.height || 24,
      };
    } catch {
      // Fallback
    }
  }

  return {
    x: offset.x + (text.x / 100) * offset.width,
    y: offset.y + (text.y / 100) * offset.height,
    height: 24,
  };
}
