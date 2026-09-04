'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useCallback } from 'react';
import { Circle } from 'react-konva';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import { pxToNormX, pxToNormY } from '../hooks/zone-shape-geometry';

export interface VertexPair {
  normX: number;
  normY: number;
  pxX: number;
  pxY: number;
}

export interface ZonePolygonHandlesProps {
  zone: ZoneAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isComplete: boolean;
  vertexPairs: VertexPair[];
  updateZone: (
    slideId: string,
    zoneId: string,
    patch: Partial<ZoneAnnotation>,
  ) => void;
}

export const ZonePolygonHandles = React.memo(function ZonePolygonHandles({
  zone,
  slideId,
  stageSize,
  isSelected,
  isComplete,
  vertexPairs,
  updateZone,
}: ZonePolygonHandlesProps) {
  const { width, height } = stageSize;
  const pts = zone.points;

  const handleVertexMouseEnter = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const c = e.target.getStage()?.container();
      if (c) c.style.cursor = 'grab';
    },
    [],
  );

  const handleVertexMouseLeave = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const c = e.target.getStage()?.container();
      if (c) c.style.cursor = 'default';
    },
    [],
  );

  const handleVertexDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const c = e.target.getStage()?.container();
      if (c) c.style.cursor = 'grabbing';
    },
    [],
  );

  const handleVertexDragMove = useCallback(
    (idx: number, e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const newPxX = e.target.x();
      const newPxY = e.target.y();
      const lineNode = e.target.getParent()?.findOne('Line') as
        | Konva.Line
        | undefined;
      if (lineNode) {
        const currentLinePts = [...lineNode.points()];
        currentLinePts[idx * 2] = newPxX;
        currentLinePts[idx * 2 + 1] = newPxY;
        lineNode.points(currentLinePts);
        lineNode.getLayer()?.batchDraw();
      }
    },
    [],
  );

  const handleVertexDragEnd = useCallback(
    (idx: number, e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const newPxX = e.target.x();
      const newPxY = e.target.y();
      const c = e.target.getStage()?.container();
      if (c) c.style.cursor = 'grab';

      const newNormX = pxToNormX(newPxX, width);
      const newNormY = pxToNormY(newPxY, height);

      const updatedPoints = [...pts];
      updatedPoints[idx] = { x: newNormX, y: newNormY };

      updateZone(slideId, zone.id, { points: updatedPoints });
    },
    [pts, width, height, slideId, zone.id, updateZone],
  );

  return (
    <>
      {/* 描画中の頂点ドット */}
      {!isComplete &&
        vertexPairs.map((v, idx) => (
          <Circle
            // biome-ignore lint/suspicious/noArrayIndexKey: vertex index represents polygon node order
            key={`v-draw-${zone.id}-${idx}`}
            x={v.pxX}
            y={v.pxY}
            radius={idx === 0 ? 7 : 4}
            fill={idx === 0 ? '#38bdf8' : '#ffffff'}
            stroke={zone.color}
            strokeWidth={2}
            listening={false}
          />
        ))}

      {/* 選択中の頂点ドラッグ変形ハンドル */}
      {isComplete &&
        isSelected &&
        vertexPairs.map((v, idx) => (
          <Circle
            // biome-ignore lint/suspicious/noArrayIndexKey: vertex index represents polygon node order
            key={`v-handle-${zone.id}-${idx}`}
            name="control-handle"
            x={v.pxX}
            y={v.pxY}
            radius={7}
            hitStrokeWidth={20}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={2.5}
            draggable={!zone.locked}
            onMouseEnter={handleVertexMouseEnter}
            onMouseLeave={handleVertexMouseLeave}
            onDragStart={handleVertexDragStart}
            onDragMove={(e) => handleVertexDragMove(idx, e)}
            onDragEnd={(e) => handleVertexDragEnd(idx, e)}
          />
        ))}
    </>
  );
});
