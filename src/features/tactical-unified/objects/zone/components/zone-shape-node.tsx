'use client';

import React from 'react';
import { Ellipse, Group, Rect, Transformer } from 'react-konva';
import { useZoneShape } from '../hooks/use-zone-shape';
import { getZoneStyle, type ZoneObjectProps } from '../types';

export const ZoneShapeNode = React.memo(function ZoneShapeNode(
  props: ZoneObjectProps,
) {
  const { zone, isSelected, onSelect } = props;
  const { fillRGBA, strokeColor, strokeWidth } = getZoneStyle(zone);
  const {
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
  } = useZoneShape(props);

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
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          draggable={isSelected && !zone.locked}
          onClick={onSelect}
          onTap={onSelect}
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
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          draggable={isSelected && !zone.locked}
          onClick={onSelect}
          onTap={onSelect}
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
            'top-right',
            'bottom-left',
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
