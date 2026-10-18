import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Ellipse, Group, Rect, Transformer } from 'react-konva';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import { useZoneShape } from './use-zone-shape';
import type { ZoneNodeProps } from './ZonePolygonNode';
import { getZoneStyle } from './zone-geometry';

export const ZoneShapeNode = React.memo(function ZoneShapeNode(
  props: ZoneNodeProps,
) {
  const { zone, isSelected, onSelect, isInteractive = true } = props;
  const { fillRGBA, strokeColor, strokeWidth } = getZoneStyle(zone);
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
          x={cx}
          y={cy}
          radiusX={pxW / 2}
          radiusY={pxH / 2}
          rotation={rotation}
          fill={fillRGBA}
          opacity={zone.opacity ?? 0.25}
          stroke={isSelected ? '#60a5fa' : strokeColor}
          strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
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
          x={cx}
          y={cy}
          width={pxW}
          height={pxH}
          offsetX={pxW / 2}
          offsetY={pxH / 2}
          rotation={rotation}
          fill={fillRGBA}
          opacity={zone.opacity ?? 0.25}
          stroke={isSelected ? '#60a5fa' : strokeColor}
          strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
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
