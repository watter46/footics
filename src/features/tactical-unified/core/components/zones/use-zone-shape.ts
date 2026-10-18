import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Box } from 'konva/lib/shapes/Transformer';
import { useCallback, useEffect, useRef } from 'react';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import {
  computeTransformedZonePatch,
  computeZoneShapeMetrics,
  pxToNormX,
  pxToNormY,
} from './zone-geometry';

export interface UseZoneShapeParams {
  zone: ZoneAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  updateZone: (zoneId: string, patch: Partial<ZoneAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<any>;
}

export function useZoneShape({
  zone,
  stageSize,
  isSelected,
  updateZone,
  nodesRegistryRef,
}: UseZoneShapeParams) {
  const { width, height } = stageSize;
  const shapeType = zone.shapeType || 'rect';

  const shapeNodeRef = useRef<Konva.Shape | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    if (!transformerRef.current) return;
    if (isSelected && shapeNodeRef.current) {
      transformerRef.current.nodes([shapeNodeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const { pxW, pxH, cx, cy, rotation } = computeZoneShapeMetrics(
    zone,
    width,
    height,
  );

  const setShapeNodeRef = useCallback(
    (node: Konva.Shape | null) => {
      shapeNodeRef.current = node;
      if (nodesRegistryRef?.current?.zoneNodes) {
        if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
        else nodesRegistryRef.current.zoneNodes.delete(zone.id);
      }
    },
    [nodesRegistryRef, zone.id],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const node = e.target;
      const newNormX = pxToNormX(node.x() - pxW / 2, width);
      const newNormY = pxToNormY(node.y() - pxH / 2, height);
      updateZone(zone.id, {
        x: newNormX,
        y: newNormY,
        rotation: node.rotation(),
      });
    },
    [pxW, pxH, width, height, zone.id, updateZone],
  );

  const boundBoxFunc = useCallback((oldBox: Box, newBox: Box) => {
    if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
      return oldBox;
    return newBox;
  }, []);

  const handleTransformEnd = useCallback(() => {
    const node = shapeNodeRef.current;
    if (!node) return;
    const patch = computeTransformedZonePatch(node, pxW, pxH, width, height);
    updateZone(zone.id, patch);
  }, [pxW, pxH, width, height, zone.id, updateZone]);

  return {
    shapeType,
    cx,
    cy,
    pxW,
    pxH,
    rotation,
    transformerRef,
    setShapeNodeRef,
    handleDragEnd,
    boundBoxFunc,
    handleTransformEnd,
  };
}
