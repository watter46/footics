'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Group, Line } from 'react-konva';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import type { ResolvedZonePrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
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
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  isCreatingThis?: boolean;
  mousePreviewPos?: { x: number; y: number } | null;
  resolvedZone?: ResolvedZonePrimitive | null;
}

export const ZonePolygonNode = React.memo(function ZonePolygonNode(
  props: ZoneNodeProps,
) {
  const {
    zone,
    isSelected,
    onSelect,
    isInteractive = true,
    resolvedZone,
    isCreatingThis,
  } = props;
  const { fillRGBA, strokeColorRGBA, strokeWidth } = getZoneStyle(zone);
  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);
  const {
    isComplete,
    renderPts,
    vertexPairs,
    handleGroupDragStart,
    handleGroupDragEnd: rawHandleGroupDragEnd,
    setLineRef,
  } = useZonePolygon(props);

  const effectivePoints =
    !isCreatingThis &&
    resolvedZone?.flatPointsPx &&
    resolvedZone.flatPointsPx.length >= 4
      ? [...resolvedZone.flatPointsPx]
      : renderPts;
  const effectiveStrokeWidth = resolvedZone?.strokeWidthPx ?? strokeWidth;

  const handleGroupDragEnd = (e: KonvaEventObject<DragEvent>) => {
    rawHandleGroupDragEnd(e);
    setIsDragging(false);
    setIsHudOpen(true);
  };

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
        points={effectivePoints}
        closed={isComplete}
        fill={isComplete ? fillRGBA : undefined}
        opacity={1}
        stroke={isSelected ? '#60a5fa' : strokeColorRGBA}
        strokeWidth={
          isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth
        }
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
