import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Box } from 'konva/lib/shapes/Transformer';
import { useCallback, useEffect, useRef } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';
import {
  computeTransformedZonePatch,
  computeZoneShapeMetrics,
  pxToNormX,
  pxToNormY,
} from './zone-geometry';

export interface UseZoneShapeParams {
  zone: DomainZoneAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  updateZone: (zoneId: string, patch: Partial<DomainZoneAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  resolvedWidthPx?: number;
  resolvedHeightPx?: number;
  resolvedRotationDeg?: number;
}

export function useZoneShape({
  zone,
  stageSize,
  isSelected,
  updateZone,
  nodesRegistryRef,
  resolvedWidthPx,
  resolvedHeightPx,
  resolvedRotationDeg,
}: UseZoneShapeParams) {
  const { width, height } = stageSize;
  const shapeType = zone.shapeType || 'rect';

  const shapeNodeRef = useRef<Konva.Shape | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  const { pxW, pxH, cx, cy, rotation } = computeZoneShapeMetrics(
    zone,
    width,
    height,
  );
  const effectivePxW = resolvedWidthPx ?? pxW;
  const effectivePxH = resolvedHeightPx ?? pxH;

  useEffect(() => {
    if (!transformerRef.current) return;
    if (isSelected && shapeNodeRef.current) {
      transformerRef.current.nodes([shapeNodeRef.current]);
      transformerRef.current.forceUpdate();
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, effectivePxW, effectivePxH, resolvedRotationDeg, zone]);

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
      const newNormX = pxToNormX(node.x() - effectivePxW / 2, width);
      const newNormY = pxToNormY(node.y() - effectivePxH / 2, height);
      updateZone(zone.id, {
        x: clampToScreenNorm(newNormX),
        y: clampToScreenNorm(newNormY),
        rotation: node.rotation(),
      });
    },
    [effectivePxW, effectivePxH, width, height, zone.id, updateZone],
  );

  const boundBoxFunc = useCallback((oldBox: Box, newBox: Box) => {
    if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
      return oldBox;
    return newBox;
  }, []);

  const handleTransformEnd = useCallback(() => {
    const node = shapeNodeRef.current;
    if (!node) return;
    const patch = computeTransformedZonePatch(
      node,
      effectivePxW,
      effectivePxH,
      width,
      height,
    );
    updateZone(zone.id, patch);
  }, [effectivePxW, effectivePxH, width, height, zone.id, updateZone]);

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
