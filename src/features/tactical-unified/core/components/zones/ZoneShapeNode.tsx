import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Ellipse, Group, Rect, Transformer } from 'react-konva';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import { useZoneShape } from './use-zone-shape';
import type { ZoneNodeProps } from './ZonePolygonNode';
import { getZoneStyle } from './zone-geometry';

export const ZoneShapeNode = React.memo(function ZoneShapeNode(
  props: ZoneNodeProps,
) {
  const { zone, isSelected, onSelect, isInteractive = true } = props;
  const { fillRGBA, strokeColorRGBA, strokeWidth } = getZoneStyle(zone);
  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);
  const {
    shapeType,
    cx,
    cy,
    pxW,
    pxH,
    rotation,
    transformerRef,
    setShapeNodeRef,
    handleDragEnd: rawHandleDragEnd,
    boundBoxFunc,
    handleTransformEnd,
  } = useZoneShape(props);

  const hasResolvedRect =
    props.resolvedZone != null &&
    props.resolvedZone.xPx !== undefined &&
    props.resolvedZone.yPx !== undefined &&
    props.resolvedZone.widthPx !== undefined &&
    props.resolvedZone.heightPx !== undefined;
  const effectivePxW = hasResolvedRect
    ? (props.resolvedZone!.widthPx as number)
    : pxW;
  const effectivePxH = hasResolvedRect
    ? (props.resolvedZone!.heightPx as number)
    : pxH;
  const effectiveCx = hasResolvedRect
    ? (props.resolvedZone!.xPx as number) + effectivePxW / 2
    : cx;
  const effectiveCy = hasResolvedRect
    ? (props.resolvedZone!.yPx as number) + effectivePxH / 2
    : cy;
  const effectiveRotation = props.resolvedZone?.rotationDeg ?? rotation;
  const effectiveStrokeWidth = props.resolvedZone?.strokeWidthPx ?? strokeWidth;

  const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
    setIsDragging(true);
    setIsHudOpen(false);
    if (!isSelected) {
      onSelect(e);
      setIsHudOpen(false);
    }
  };

  const handleDragMove = () => {
    transformerRef.current?.getLayer()?.batchDraw();
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    rawHandleDragEnd(e);
    setIsDragging(false);
    setIsHudOpen(true);
  };

  return (
    <Group>
      {shapeType === 'ellipse' ? (
        <Ellipse
          ref={setShapeNodeRef}
          x={effectiveCx}
          y={effectiveCy}
          radiusX={effectivePxW / 2}
          radiusY={effectivePxH / 2}
          rotation={effectiveRotation}
          fill={fillRGBA}
          opacity={1}
          stroke={isSelected ? '#60a5fa' : strokeColorRGBA}
          strokeWidth={
            isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth
          }
          draggable={isInteractive && !zone.locked}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <Rect
          ref={setShapeNodeRef}
          x={effectiveCx}
          y={effectiveCy}
          width={effectivePxW}
          height={effectivePxH}
          offsetX={effectivePxW / 2}
          offsetY={effectivePxH / 2}
          rotation={effectiveRotation}
          fill={fillRGBA}
          opacity={1}
          stroke={isSelected ? '#60a5fa' : strokeColorRGBA}
          strokeWidth={
            isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth
          }
          draggable={isInteractive && !zone.locked}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      )}

      {isSelected && !zone.locked && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={boundBoxFunc}
          keepRatio={false}
          enabledAnchors={[
            'top-left',
            'top-center',
            'top-right',
            'middle-right',
            'middle-left',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ]}
          rotateEnabled={false}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorSize={9}
          anchorCornerRadius={2}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </Group>
  );
});
