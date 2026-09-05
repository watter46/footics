'use client';

import { useRef } from 'react';
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

interface VisionConeDirHandleProps {
  x: number;
  y: number;
  stageWidth: number;
  onUpdateVisionCone: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
}

function VisionConeDirHandle({
  x,
  y,
  stageWidth,
  onUpdateVisionCone,
}: VisionConeDirHandleProps) {
  const dirDragStateRef = useRef<{ angleRad: number; radius: number } | null>(
    null,
  );

  return (
    <Circle
      x={x}
      y={y}
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
          Math.min(60, (Math.hypot(curX, curY) / stageWidth) * 100),
        );
        dirDragStateRef.current = {
          angleRad,
          radius: Math.round(newRadius),
        };
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        if (dirDragStateRef.current) {
          onUpdateVisionCone(dirDragStateRef.current);
          dirDragStateRef.current = null;
        }
      }}
    />
  );
}

interface VisionConeEdgeHandleProps {
  x: number;
  y: number;
  centerAngleRad: number;
  onUpdateVisionCone: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
}

function VisionConeEdgeHandle({
  x,
  y,
  centerAngleRad,
  onUpdateVisionCone,
}: VisionConeEdgeHandleProps) {
  const spreadDragStateRef = useRef<number | null>(null);

  const handleDragEdge = (curX: number, curY: number) => {
    let dragAngle = Math.atan2(curY, curX);
    if (dragAngle < 0) dragAngle += 2 * Math.PI;
    let diff = Math.abs(dragAngle - centerAngleRad);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const spreadRad = Math.max(0.3, Math.min(Math.PI, diff * 2));
    spreadDragStateRef.current = spreadRad;
  };

  return (
    <Circle
      x={x}
      y={y}
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
      onDragEnd={(e) => {
        e.cancelBubble = true;
        if (spreadDragStateRef.current !== null) {
          onUpdateVisionCone({ spreadRad: spreadDragStateRef.current });
          spreadDragStateRef.current = null;
        }
      }}
    />
  );
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

  return (
    <Group>
      <VisionConeDirHandle
        x={dirHandleX}
        y={dirHandleY}
        stageWidth={stageSize.width}
        onUpdateVisionCone={onUpdateVisionCone}
      />
      <VisionConeEdgeHandle
        x={edge1X}
        y={edge1Y}
        centerAngleRad={cone.angleRad}
        onUpdateVisionCone={onUpdateVisionCone}
      />
      <VisionConeEdgeHandle
        x={edge2X}
        y={edge2Y}
        centerAngleRad={cone.angleRad}
        onUpdateVisionCone={onUpdateVisionCone}
      />
    </Group>
  );
}
