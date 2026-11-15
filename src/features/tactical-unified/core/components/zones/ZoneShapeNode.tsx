import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Ellipse, Group, Rect, Transformer } from 'react-konva';
import { useSessionStore } from '@/features/tactical-unified/stores/tactical-store-provider';
import { useZoneShape } from './use-zone-shape';
import type { ZoneNodeProps } from './ZonePolygonNode';

export const ZoneShapeNode = React.memo(function ZoneShapeNode(
  props: ZoneNodeProps,
) {
  const {
    zone,
    isSelected,
    onSelect,
    isInteractive = true,
    resolvedZone,
  } = props;
  const setIsDragging = useSessionStore((s) => s.setIsDragging);
  const setIsHudOpen = useSessionStore((s) => s.setIsHudOpen);
  const {
    shapeType,
    transformerRef,
    setShapeNodeRef,
    handleDragEnd: rawHandleDragEnd,
    boundBoxFunc,
    handleTransformEnd: rawHandleTransformEnd,
  } = useZoneShape({
    ...props,
    resolvedWidthPx: resolvedZone.widthPx,
    resolvedHeightPx: resolvedZone.heightPx,
    resolvedRotationDeg: resolvedZone.rotationDeg,
  });

  const effectivePxW = resolvedZone.widthPx ?? 0;
  const effectivePxH = resolvedZone.heightPx ?? 0;
  const effectiveCx = (resolvedZone.xPx ?? 0) + effectivePxW / 2;
  const effectiveCy = (resolvedZone.yPx ?? 0) + effectivePxH / 2;
  const effectiveRotation = resolvedZone.rotationDeg ?? 0;
  const effectiveStrokeWidth = resolvedZone.strokeWidthPx;

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

  const handleTransformStart = () => {
    setIsDragging(true);
    setIsHudOpen(false);
  };

  const handleTransformEnd = () => {
    rawHandleTransformEnd();
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
          fill={resolvedZone.color}
          opacity={resolvedZone.opacity}
          stroke={isSelected ? '#60a5fa' : resolvedZone.strokeColor}
          strokeWidth={
            isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth
          }
          visible={resolvedZone.visible}
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
          fill={resolvedZone.color}
          opacity={resolvedZone.opacity}
          stroke={isSelected ? '#60a5fa' : resolvedZone.strokeColor}
          strokeWidth={
            isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth
          }
          visible={resolvedZone.visible}
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
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </Group>
  );
});
