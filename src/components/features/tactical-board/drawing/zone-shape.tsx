'use client';

import type React from 'react';
import { Ellipse, Group, Rect } from 'react-konva';
import type { ShapeData } from './types';

interface ZoneShapeProps {
  shape: ShapeData;
  isSelected: boolean;
  activeTool: string;
  handleShapeClick: (shape: ShapeData, target: any, e: any) => void;
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  saveHistory: (shapes: ShapeData[]) => void;
}

export const ZoneShape: React.FC<ZoneShapeProps> = ({
  shape,
  isSelected,
  activeTool,
  handleShapeClick,
  setShapes,
  saveHistory,
}) => {
  const w = shape.width || 0;
  const h = shape.height || 0;
  const x = shape.x || 0;
  const y = shape.y || 0;
  const ShapeComponent = shape.zoneShape === 'ellipse' ? Ellipse : Rect;

  const shapeProps: any = {
    id: shape.id,
    stroke: shape.color,
    fill: shape.color,
    strokeWidth: shape.strokeWidth,
    dash: shape.dash,
    opacity: shape.opacity,
    draggable: activeTool === 'select' && isSelected,
    rotation: shape.rotation || 0,
    onClick: (e: any) => handleShapeClick(shape, e.currentTarget, e),
    onTap: (e: any) => handleShapeClick(shape, e.currentTarget, e),
    onDragStart: (e: any) => {
      e.cancelBubble = true;
    },
    onDragMove: (e: any) => {
      e.cancelBubble = true;
    },
    onDragEnd: (e: any) => {
      e.cancelBubble = true;
      const node = e.currentTarget;
      let newX = node.x();
      let newY = node.y();

      if (shape.zoneShape === 'ellipse') {
        newX = newX - Math.abs(w) / 2;
        newY = newY - Math.abs(h) / 2;
      }

      setShapes((shapes) => {
        const nextShapes = shapes.map((s) =>
          s.id === shape.id ? { ...s, x: newX, y: newY } : s,
        );
        saveHistory(nextShapes);
        return nextShapes;
      });

      node.x(shape.zoneShape === 'ellipse' ? Math.abs(w) / 2 : 0);
      node.y(shape.zoneShape === 'ellipse' ? Math.abs(h) / 2 : 0);
    },
  };

  if (shape.zoneShape === 'ellipse') {
    shapeProps.x = x + Math.abs(w) / 2;
    shapeProps.y = y + Math.abs(h) / 2;
    shapeProps.radiusX = Math.abs(w) / 2;
    shapeProps.radiusY = Math.abs(h) / 2;
    shapeProps.offsetX = Math.abs(w) / 2;
    shapeProps.offsetY = Math.abs(h) / 2;
  } else {
    shapeProps.x = x;
    shapeProps.y = y;
    shapeProps.width = w;
    shapeProps.height = h;
  }

  // 塗りつぶし opacity の適用
  if (shapeProps.fill) {
    const r = parseInt(shapeProps.fill.slice(1, 3), 16);
    const g = parseInt(shapeProps.fill.slice(3, 5), 16);
    const b = parseInt(shapeProps.fill.slice(5, 7), 16);
    const alpha = shape.fillOpacity ?? 0;
    shapeProps.fill = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <Group>
      <ShapeComponent {...shapeProps} />
    </Group>
  );
};
