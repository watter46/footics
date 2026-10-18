'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Group, Line } from 'react-konva';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import { useZonePolygon } from './use-zone-polygon';
import { ZonePolygonHandles } from './ZonePolygonHandles';
import { getZoneStyle } from './zone-geometry';

export interface ZoneNodeProps {
  zone: ZoneAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive?: boolean;
  onSelect: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  updateZone: (zoneId: string, patch: Partial<ZoneAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<any>;
  isCreatingThis?: boolean;
  mousePreviewPos?: { x: number; y: number } | null;
}

export const ZonePolygonNode = React.memo(function ZonePolygonNode(
  props: ZoneNodeProps,
) {
  const { zone, isSelected, onSelect, isInteractive = true } = props;
  const { fillRGBA, strokeColor, strokeWidth } = getZoneStyle(zone);
  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);
  const {
    isComplete,
    renderPts,
    vertexPairs,
    handleGroupDragStart,
    handleGroupDragEnd,
    setLineRef,
  } = useZonePolygon(props);

  return (
    <Group
      draggable={isInteractive && isComplete && !zone.locked}
      onDragStart={(e) => {
        setIsDragging(true);
        setIsHudOpen(false);
        if (!isSelected) {
          onSelect(e);
          setIsHudOpen(false);
        }
        handleGroupDragStart(e);
      }}
      onDragEnd={handleGroupDragEnd}
    >
      <Line
        ref={setLineRef}
        points={renderPts}
        closed={isComplete}
        fill={isComplete ? fillRGBA : undefined}
        opacity={zone.opacity ?? 0.25}
        stroke={isSelected ? '#60a5fa' : strokeColor}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={20}
        onClick={onSelect}
        onTap={onSelect}
      />

      <ZonePolygonHandles
        zone={zone}
        stageSize={props.stageSize}
        isSelected={isSelected}
        isComplete={isComplete}
        vertexPairs={vertexPairs}
        updateZone={props.updateZone}
      />
    </Group>
  );
});
