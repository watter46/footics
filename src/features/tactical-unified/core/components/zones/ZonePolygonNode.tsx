'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Group, Line } from 'react-konva';
import { useObjectDragLifecycle } from '@/features/tactical-unified/core/hooks/use-object-drag-lifecycle';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import type { ResolvedZonePrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';
import { useZonePolygon } from './use-zone-polygon';
import { ZonePolygonHandles } from './ZonePolygonHandles';

export interface ZoneNodeProps {
  zone: DomainZoneAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive?: boolean;
  onSelect: (e: KonvaEventObject<MouseEvent | TouchEvent | DragEvent>) => void;
  updateZone: (zoneId: string, patch: Partial<DomainZoneAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  resolvedZone: ResolvedZonePrimitive;
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
  } = props;
  const { beginDrag, endDrag } = useObjectDragLifecycle({
    isSelected,
    onSelect: (_isShift, e) => onSelect(e),
    reopenHudOnEnd: true,
  });
  const polygonZone =
    zone.shapeType === 'polygon'
      ? zone
      : {
          ...zone,
          shapeType: 'polygon' as const,
          points: [],
        };
  const {
    isComplete,
    renderPts,
    vertexPairs,
    handleGroupDragStart,
    handleGroupDragEnd: rawHandleGroupDragEnd,
    setLineRef,
  } = useZonePolygon({
    ...props,
    zone: polygonZone,
  });

  const effectivePoints = resolvedZone.flatPointsPx
    ? [...resolvedZone.flatPointsPx]
    : renderPts;
  const effectiveStrokeWidth = resolvedZone.strokeWidthPx;

  const handleGroupDragEnd = (e: KonvaEventObject<DragEvent>) => {
    rawHandleGroupDragEnd(e);
    endDrag();
  };

  return (
    <Group
      draggable={isInteractive && isComplete && !zone.locked}
      onDragStart={(e) => {
        beginDrag(e);
        handleGroupDragStart(e);
      }}
      onDragEnd={handleGroupDragEnd}
    >
      <Line
        ref={setLineRef}
        points={effectivePoints}
        closed={isComplete}
        fill={isComplete ? resolvedZone.color : undefined}
        opacity={resolvedZone.opacity}
        stroke={isSelected ? '#60a5fa' : resolvedZone.strokeColor}
        strokeWidth={
          isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth
        }
        visible={resolvedZone.visible}
        perfectDrawEnabled={false}
        listening={isInteractive}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={20}
        onClick={onSelect}
        onTap={onSelect}
      />

      <ZonePolygonHandles
        zone={polygonZone}
        stageSize={props.stageSize}
        isSelected={isSelected}
        isComplete={isComplete}
        vertexPairs={vertexPairs}
        updateZone={props.updateZone}
      />
    </Group>
  );
});
