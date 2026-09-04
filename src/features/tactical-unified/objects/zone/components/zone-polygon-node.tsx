'use client';

import React from 'react';
import { Group, Line } from 'react-konva';
import { useZonePolygon } from '../hooks/use-zone-polygon';
import { getZoneStyle, type ZoneObjectProps } from '../types';
import { ZonePolygonHandles } from './zone-polygon-handles';

export const ZonePolygonNode = React.memo(function ZonePolygonNode(
  props: ZoneObjectProps,
) {
  const { zone, isSelected, onSelect } = props;
  const { fillRGBA, strokeColor, strokeWidth } = getZoneStyle(zone);
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
      draggable={isSelected && !zone.locked}
      onDragStart={handleGroupDragStart}
      onDragEnd={handleGroupDragEnd}
    >
      <Line
        ref={setLineRef}
        points={renderPts}
        closed={isComplete}
        fill={isComplete ? fillRGBA : undefined}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={20}
        onClick={onSelect}
        onTap={onSelect}
      />

      <ZonePolygonHandles
        zone={zone}
        slideId={props.slideId}
        stageSize={props.stageSize}
        isSelected={isSelected}
        isComplete={isComplete}
        vertexPairs={vertexPairs}
        updateZone={props.updateZone}
      />
    </Group>
  );
});
