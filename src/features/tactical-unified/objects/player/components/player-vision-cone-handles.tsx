'use client';

import { Circle, Group } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerVisionConeHandlesProps {
  cone: NonNullable<Player['visionCone']>;
  pxRadius: number;
  stageSize: { width: number; height: number };
  onUpdateVisionCone: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
}

export function PlayerVisionConeHandles({
  cone,
  pxRadius,
  stageSize,
  onUpdateVisionCone,
}: PlayerVisionConeHandlesProps) {
  const dirHandleX = pxRadius * Math.cos(cone.angleRad);
  const dirHandleY = pxRadius * Math.sin(cone.angleRad);

  const edge1Angle = cone.angleRad - cone.spreadRad / 2;
  const edge1X = pxRadius * 0.85 * Math.cos(edge1Angle);
  const edge1Y = pxRadius * 0.85 * Math.sin(edge1Angle);

  const edge2Angle = cone.angleRad + cone.spreadRad / 2;
  const edge2X = pxRadius * 0.85 * Math.cos(edge2Angle);
  const edge2Y = pxRadius * 0.85 * Math.sin(edge2Angle);

  const handleDragEdge = (curX: number, curY: number) => {
    let dragAngle = Math.atan2(curY, curX);
    if (dragAngle < 0) dragAngle += 2 * Math.PI;
    let diff = Math.abs(dragAngle - cone.angleRad);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const spreadRad = Math.max(0.3, Math.min(Math.PI, diff * 2));
    onUpdateVisionCone({ spreadRad });
  };

  return (
    <Group>
      {/* 方向 & 視野長ドラッグハンドル */}
      <Circle
        x={dirHandleX}
        y={dirHandleY}
        radius={7}
        fill="#ffffff"
        stroke="#0284c7"
        strokeWidth={2}
        draggable
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={3}
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const curX = e.target.x();
          const curY = e.target.y();
          let angleRad = Math.atan2(curY, curX);
          if (angleRad < 0) angleRad += 2 * Math.PI;
          const newRadius = Math.max(
            8,
            Math.min(60, (Math.hypot(curX, curY) / stageSize.width) * 100),
          );
          onUpdateVisionCone({ angleRad, radius: Math.round(newRadius) });
        }}
      />

      {/* 広がり角ドラッグハンドル 1 */}
      <Circle
        x={edge1X}
        y={edge1Y}
        radius={5.5}
        fill="#38bdf8"
        stroke="#ffffff"
        strokeWidth={1.5}
        draggable
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'ew-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          handleDragEdge(e.target.x(), e.target.y());
        }}
      />

      {/* 広がり角ドラッグハンドル 2 */}
      <Circle
        x={edge2X}
        y={edge2Y}
        radius={5.5}
        fill="#38bdf8"
        stroke="#ffffff"
        strokeWidth={1.5}
        draggable
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'ew-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          handleDragEdge(e.target.x(), e.target.y());
        }}
      />
    </Group>
  );
}
