import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../canvas-registry';

export type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface ZoneObjectProps {
  zone: ZoneAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateZone: (
    slideId: string,
    zoneId: string,
    patch: Partial<ZoneAnnotation>,
  ) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  isCreatingThis?: boolean;
  mousePreviewPos?: { x: number; y: number } | null;
}

export interface ZoneStyle {
  fillRGBA: string;
  strokeColor: string;
  strokeWidth: number;
}

export function getZoneStyle(zone: ZoneAnnotation): ZoneStyle {
  const opacity = zone.opacity ?? 0.25;
  const alphaHex = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  const fillRGBA = (zone.color || '#22c55e') + alphaHex;
  const strokeColor = zone.strokeColor ?? zone.color ?? '#22c55e';
  const strokeWidth = zone.strokeWidth || 2;
  return { fillRGBA, strokeColor, strokeWidth };
}
