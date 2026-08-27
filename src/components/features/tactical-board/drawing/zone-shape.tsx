'use client';

import type Konva from 'konva';
import type React from 'react';
import { Ellipse, Rect } from 'react-konva';
import type { ShapeData } from './types';

interface ZoneShapeProps {
  shape: ShapeData;
  isSelected: boolean;
  activeTool: string;
  selectedNodeRef?: React.MutableRefObject<Konva.Node | null>;
  handleShapeClick: (shape: ShapeData, target: any, e: any) => void;
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  saveHistory: (shapes: ShapeData[]) => void;
}

export const ZoneShape: React.FC<ZoneShapeProps> = ({
  shape,
  isSelected,
  activeTool,
  selectedNodeRef,
  handleShapeClick,
  setShapes,
  saveHistory,
}) => {
  const absW = Math.abs(shape.width || 0);
  const absH = Math.abs(shape.height || 0);
  const x = shape.x || 0;
  const y = shape.y || 0;

  // 塗りつぶし opacity の適用
  const hexColor = (shape.color || '#22c55e').replace('#', '');
  const r = parseInt(hexColor.substring(0, 2), 16) || 34;
  const g = parseInt(hexColor.substring(2, 4), 16) || 197;
  const b = parseInt(hexColor.substring(4, 6), 16) || 94;
  const alpha = shape.fillOpacity ?? 0.35;
  const fillRGBA = `rgba(${r}, ${g}, ${b}, ${alpha})`;

  if (shape.zoneShape === 'ellipse') {
    return (
      <Ellipse
        key={shape.id}
        id={shape.id}
        ref={(node) => {
          if (isSelected && node && selectedNodeRef) {
            selectedNodeRef.current = node;
          }
        }}
        x={x + absW / 2}
        y={y + absH / 2}
        radiusX={absW / 2}
        radiusY={absH / 2}
        offsetX={0}
        offsetY={0}
        rotation={shape.rotation || 0}
        fill={fillRGBA}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        dash={shape.dash}
        opacity={shape.opacity}
        draggable={activeTool === 'select' && isSelected}
        onClick={(e) => handleShapeClick(shape, e.currentTarget, e)}
        onTap={(e) => handleShapeClick(shape, e.currentTarget, e)}
        onDragStart={(e) => {
          e.cancelBubble = true;
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          const node = e.currentTarget;
          const newX = node.x() - absW / 2;
          const newY = node.y() - absH / 2;

          setShapes((shapes) => {
            const nextShapes = shapes.map((s) =>
              s.id === shape.id ? { ...s, x: newX, y: newY } : s,
            );
            saveHistory(nextShapes);
            return nextShapes;
          });
        }}
      />
    );
  }

  return (
    <Rect
      key={shape.id}
      id={shape.id}
      ref={(node) => {
        if (isSelected && node && selectedNodeRef) {
          selectedNodeRef.current = node;
        }
      }}
      x={x + absW / 2}
      y={y + absH / 2}
      width={absW}
      height={absH}
      offsetX={absW / 2}
      offsetY={absH / 2}
      rotation={shape.rotation || 0}
      fill={fillRGBA}
      stroke={shape.color}
      strokeWidth={shape.strokeWidth}
      dash={shape.dash}
      opacity={shape.opacity}
      draggable={activeTool === 'select' && isSelected}
      onClick={(e) => handleShapeClick(shape, e.currentTarget, e)}
      onTap={(e) => handleShapeClick(shape, e.currentTarget, e)}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.currentTarget;
        const newX = node.x() - absW / 2;
        const newY = node.y() - absH / 2;

        setShapes((shapes) => {
          const nextShapes = shapes.map((s) =>
            s.id === shape.id ? { ...s, x: newX, y: newY } : s,
          );
          saveHistory(nextShapes);
          return nextShapes;
        });
      }}
    />
  );
};
