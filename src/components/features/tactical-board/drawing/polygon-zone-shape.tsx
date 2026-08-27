'use client';

import type Konva from 'konva';
import type React from 'react';
import { Circle, Group, Line } from 'react-konva';
import type { ShapeData } from './types';

interface PolygonZoneShapeProps {
  shape: ShapeData;
  isSelected: boolean;
  activeTool: string;
  activePolygonId: string | null;
  mousePreviewPos: { x: number; y: number } | null;
  handleShapeClick: (shape: ShapeData, target: any, e: any) => void;
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  saveHistory: (shapes: ShapeData[]) => void;
}

export const PolygonZoneShape: React.FC<PolygonZoneShapeProps> = ({
  shape,
  isSelected,
  activeTool,
  activePolygonId,
  mousePreviewPos,
  handleShapeClick,
  setShapes,
  saveHistory,
}) => {
  if (!shape.points || shape.points.length < 2) return null;

  const pts = shape.points;
  const isComplete = Boolean(shape.isComplete);
  const isCreatingThis = shape.id === activePolygonId;

  const hexColor = (shape.color || '#22c55e').replace('#', '');
  const r = parseInt(hexColor.substring(0, 2), 16) || 34;
  const g = parseInt(hexColor.substring(2, 4), 16) || 197;
  const b = parseInt(hexColor.substring(4, 6), 16) || 94;
  const alpha = isComplete ? (shape.fillOpacity ?? 0.35) : 0;
  const fillRGBA = `rgba(${r}, ${g}, ${b}, ${alpha})`;

  let renderPts = pts;
  if (isCreatingThis && mousePreviewPos) {
    renderPts = [...pts, mousePreviewPos.x, mousePreviewPos.y];
  }

  const vertexPairs: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    vertexPairs.push({ x: pts[i], y: pts[i + 1] });
  }

  return (
    <Group
      key={shape.id}
      id={shape.id}
      draggable={activeTool === 'select' && isSelected}
      onDragStart={(e) => {
        if (e.target.name() === 'control-handle') {
          e.cancelBubble = true;
        }
      }}
      onDragEnd={(e) => {
        if (e.target.name() === 'control-handle') return;
        const dx = e.target.x();
        const dy = e.target.y();
        e.target.position({ x: 0, y: 0 });
        const newPts = pts.map((val, idx) =>
          idx % 2 === 0 ? val + dx : val + dy,
        );
        setShapes((prev) => {
          const next = prev.map((s) =>
            s.id === shape.id ? { ...s, points: newPts } : s,
          );
          saveHistory(next);
          return next;
        });
      }}
    >
      <Line
        points={renderPts}
        closed={isComplete}
        fill={fillRGBA}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth || 2}
        dash={shape.dash}
        opacity={shape.opacity ?? 1.0}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={20}
        onClick={(e) => handleShapeClick(shape, e.currentTarget, e)}
        onTap={(e) => handleShapeClick(shape, e.currentTarget, e)}
      />

      {/* Vertices dot indicators while drawing */}
      {!isComplete &&
        vertexPairs.map((v, i) => (
          <Circle
            key={`v-draw-${shape.id}-${i}-${v.x.toFixed(1)}-${v.y.toFixed(1)}`}
            x={v.x}
            y={v.y}
            radius={i === 0 ? 7 : 4}
            fill={i === 0 ? '#38bdf8' : '#ffffff'}
            stroke={shape.color}
            strokeWidth={2}
            listening={false}
          />
        ))}

      {/* Interactive Vertex Drag Handles when selected */}
      {isComplete &&
        isSelected &&
        activeTool === 'select' &&
        vertexPairs.map((v, idx) => (
          <Circle
            key={`v-handle-${shape.id}-${idx}`}
            name="control-handle"
            x={v.x}
            y={v.y}
            radius={7}
            hitStrokeWidth={20}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
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
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'grabbing';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const newX = e.target.x();
              const newY = e.target.y();
              const lineNode = e.target
                .getParent()
                ?.findOne('Line') as Konva.Line | undefined;
              if (lineNode) {
                const updatedPoints = [...pts];
                updatedPoints[idx * 2] = newX;
                updatedPoints[idx * 2 + 1] = newY;
                lineNode.points(updatedPoints);
                lineNode.getLayer()?.batchDraw();
              }
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              const newX = e.target.x();
              const newY = e.target.y();
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'grab';

              const updatedPoints = [...pts];
              updatedPoints[idx * 2] = newX;
              updatedPoints[idx * 2 + 1] = newY;

              setShapes((prev) => {
                const next = prev.map((s) =>
                  s.id === shape.id ? { ...s, points: updatedPoints } : s,
                );
                saveHistory(next);
                return next;
              });
            }}
          />
        ))}
    </Group>
  );
};
