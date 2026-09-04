import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Box } from 'konva/lib/shapes/Transformer';
import { useCallback, useEffect, useRef } from 'react';
import { pxToNormX, pxToNormY } from './math-utils';
import {
  computeTransformedZonePatch,
  computeZoneShapeMetrics,
} from './zone-shape-geometry';
import type { ZoneObjectProps } from './zone-types';

export function useZoneShape({
  zone,
  slideId,
  stageSize,
  isSelected,
  updateZone,
  nodesRegistryRef,
}: Pick<
  ZoneObjectProps,
  | 'zone'
  | 'slideId'
  | 'stageSize'
  | 'isSelected'
  | 'updateZone'
  | 'nodesRegistryRef'
>) {
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
      if (nodesRegistryRef) {
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
      updateZone(slideId, zone.id, {
        x: newNormX,
        y: newNormY,
        rotation: node.rotation(),
      });
    },
    [pxW, pxH, width, height, slideId, zone.id, updateZone],
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
    updateZone(slideId, zone.id, patch);
  }, [pxW, pxH, width, height, slideId, zone.id, updateZone]);

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
