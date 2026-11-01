'use client';

import type Konva from 'konva';
import type React from 'react';
import { useRef } from 'react';
import { Circle, Group } from 'react-konva';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import type { Player } from '@/lib/types/tactical-unified';
import { computeRingConePoints } from './player-vision-cone';

export interface PlayerVisionConeHandlesProps {
  cone: NonNullable<Player['visionCone']>;
  pxRadius: number;
  stageSize: { width: number; height: number };
  isRing?: boolean;
  radius?: number;
  rx?: number;
  ry?: number;
  coneShapeRef?: React.MutableRefObject<Konva.Line | Konva.Arc | null>;
  onUpdateVisionCone: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
}

export function PlayerVisionConeHandles({
  cone,
  pxRadius,
  stageSize,
  isRing,
  rx = 15,
  ry = 7,
  coneShapeRef,
  onUpdateVisionCone,
}: PlayerVisionConeHandlesProps) {
  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);

  const dirDragStateRef = useRef<{ angleRad: number; radius: number } | null>(
    null,
  );
  const spreadDragStateRef = useRef<number | null>(null);

  const edge1Ref = useRef<Konva.Circle | null>(null);
  const edge2Ref = useRef<Konva.Circle | null>(null);

  const dirHandleX = pxRadius * Math.cos(cone.angleRad);
  const dirHandleY = pxRadius * Math.sin(cone.angleRad);

  const edge1Angle = cone.angleRad - cone.spreadRad / 2;
  const edge1X = pxRadius * 0.85 * Math.cos(edge1Angle);
  const edge1Y = pxRadius * 0.85 * Math.sin(edge1Angle);

  const edge2Angle = cone.angleRad + cone.spreadRad / 2;
  const edge2X = pxRadius * 0.85 * Math.cos(edge2Angle);
  const edge2Y = pxRadius * 0.85 * Math.sin(edge2Angle);

  const updateConeOnDirMove = (
    angleRad: number,
    newPxRadius: number,
    layer?: Konva.Layer | null,
  ) => {
    if (coneShapeRef?.current) {
      if (isRing) {
        const pts = computeRingConePoints(
          angleRad,
          cone.spreadRad,
          newPxRadius,
          rx,
          ry,
        );
        if ('points' in coneShapeRef.current) {
          coneShapeRef.current.points(pts);
        }
      } else {
        const spreadDeg = (cone.spreadRad * 180) / Math.PI;
        const angleDeg = (angleRad * 180) / Math.PI - spreadDeg / 2;
        if ('rotation' in coneShapeRef.current) {
          coneShapeRef.current.rotation(angleDeg);
        }
        if ('outerRadius' in coneShapeRef.current) {
          coneShapeRef.current.outerRadius(newPxRadius);
        }
      }
    }
    if (edge1Ref.current) {
      edge1Ref.current.position({
        x: newPxRadius * 0.85 * Math.cos(angleRad - cone.spreadRad / 2),
        y: newPxRadius * 0.85 * Math.sin(angleRad - cone.spreadRad / 2),
      });
    }
    if (edge2Ref.current) {
      edge2Ref.current.position({
        x: newPxRadius * 0.85 * Math.cos(angleRad + cone.spreadRad / 2),
        y: newPxRadius * 0.85 * Math.sin(angleRad + cone.spreadRad / 2),
      });
    }
    layer?.batchDraw();
  };

  const updateConeOnEdgeMove = (
    spreadRad: number,
    isEdge1: boolean,
    layer?: Konva.Layer | null,
  ) => {
    if (coneShapeRef?.current) {
      if (isRing) {
        const pts = computeRingConePoints(
          cone.angleRad,
          spreadRad,
          pxRadius,
          rx,
          ry,
        );
        if ('points' in coneShapeRef.current) {
          coneShapeRef.current.points(pts);
        }
      } else {
        const spreadDeg = (spreadRad * 180) / Math.PI;
        const angleDeg = (cone.angleRad * 180) / Math.PI - spreadDeg / 2;
        if ('angle' in coneShapeRef.current) {
          coneShapeRef.current.angle(spreadDeg);
        }
        if ('rotation' in coneShapeRef.current) {
          coneShapeRef.current.rotation(angleDeg);
        }
      }
    }
    const targetRef = isEdge1 ? edge2Ref : edge1Ref;
    const sign = isEdge1 ? 1 : -1;
    if (targetRef.current) {
      targetRef.current.position({
        x: pxRadius * 0.85 * Math.cos(cone.angleRad + (sign * spreadRad) / 2),
        y: pxRadius * 0.85 * Math.sin(cone.angleRad + (sign * spreadRad) / 2),
      });
    }
    layer?.batchDraw();
  };

  const computeEdgeSpread = (curX: number, curY: number): number => {
    let dragAngle = Math.atan2(curY, curX);
    if (dragAngle < 0) dragAngle += 2 * Math.PI;
    let diff = Math.abs(dragAngle - cone.angleRad);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    return Math.max(0.3, Math.min(Math.PI, diff * 2));
  };

  return (
    <Group>
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
        onDragStart={(e) => {
          e.cancelBubble = true;
          setIsDragging(true);
          setIsHudOpen(false);
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
          const newPxRadius = (newRadius / 100) * stageSize.width;
          dirDragStateRef.current = {
            angleRad,
            radius: Math.round(newRadius),
          };
          updateConeOnDirMove(angleRad, newPxRadius, e.target.getLayer());
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          setIsDragging(false);
          setIsHudOpen(true);
          if (dirDragStateRef.current) {
            onUpdateVisionCone(dirDragStateRef.current);
            dirDragStateRef.current = null;
          }
        }}
      />
      <Circle
        ref={edge1Ref}
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
        onDragStart={(e) => {
          e.cancelBubble = true;
          setIsDragging(true);
          setIsHudOpen(false);
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const spreadRad = computeEdgeSpread(e.target.x(), e.target.y());
          spreadDragStateRef.current = spreadRad;
          updateConeOnEdgeMove(spreadRad, true, e.target.getLayer());
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          setIsDragging(false);
          setIsHudOpen(true);
          if (spreadDragStateRef.current !== null) {
            onUpdateVisionCone({ spreadRad: spreadDragStateRef.current });
            spreadDragStateRef.current = null;
          }
        }}
      />
      <Circle
        ref={edge2Ref}
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
        onDragStart={(e) => {
          e.cancelBubble = true;
          setIsDragging(true);
          setIsHudOpen(false);
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const spreadRad = computeEdgeSpread(e.target.x(), e.target.y());
          spreadDragStateRef.current = spreadRad;
          updateConeOnEdgeMove(spreadRad, false, e.target.getLayer());
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          setIsDragging(false);
          setIsHudOpen(true);
          if (spreadDragStateRef.current !== null) {
            onUpdateVisionCone({ spreadRad: spreadDragStateRef.current });
            spreadDragStateRef.current = null;
          }
        }}
      />
    </Group>
  );
}
