'use client';

import type React from 'react';
import { Arrow, Circle, Group } from 'react-konva';
import type { ShapeData } from './types';
import { getQuadraticBezierPoints } from './utils';

interface ArrowShapeProps {
  shape: ShapeData;
  isSelected: boolean;
  activeTool: string;
  handleShapeClick: (shape: ShapeData, target: any, e: any) => void;
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  saveHistory: (shapes: ShapeData[]) => void;
}

export const ArrowShape: React.FC<ArrowShapeProps> = ({
  shape,
  isSelected,
  activeTool,
  handleShapeClick,
  setShapes,
  saveHistory,
}) => {
  if (!shape.points) return null;

  const arrowPts = shape.points;
  const isCurved = shape.isCurved;
  let renderPoints = arrowPts;
  let cpX = (arrowPts[0] + arrowPts[2]) / 2;
  let cpY = (arrowPts[1] + arrowPts[3]) / 2;

  if (isCurved) {
    if (shape.controlPoint) {
      cpX = shape.controlPoint.x;
      cpY = shape.controlPoint.y;
    } else {
      cpY -= 40;
    }
    renderPoints = getQuadraticBezierPoints(
      arrowPts[0],
      arrowPts[1],
      cpX,
      cpY,
      arrowPts[2],
      arrowPts[3],
    );
  }

  return (
    <Group>
      <Arrow
        id={shape.id}
        points={renderPoints}
        stroke={shape.color}
        fill={shape.color}
        strokeWidth={shape.strokeWidth}
        dash={shape.dash}
        opacity={shape.opacity}
        pointerLength={15}
        pointerWidth={15}
        tension={0}
        onClick={(e) => handleShapeClick(shape, e.currentTarget, e)}
        onTap={(e) => handleShapeClick(shape, e.currentTarget, e)}
      />
      {isSelected && activeTool === 'select' && (
        <Group>
          <Circle
            name="control-handle"
            x={arrowPts[0]}
            y={arrowPts[1]}
            radius={6}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
            onDragStart={(e) => {
              e.cancelBubble = true;
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const pos = e.target.position();
              setShapes((prev) =>
                prev.map((s) =>
                  s.id === shape.id && s.points
                    ? {
                        ...s,
                        points: [pos.x, pos.y, s.points[2], s.points[3]],
                      }
                    : s,
                ),
              );
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              setShapes((shapes) => {
                saveHistory(shapes);
                return shapes;
              });
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />
          <Circle
            name="control-handle"
            x={arrowPts[2]}
            y={arrowPts[3]}
            radius={6}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
            onDragStart={(e) => {
              e.cancelBubble = true;
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const pos = e.target.position();
              setShapes((prev) =>
                prev.map((s) =>
                  s.id === shape.id && s.points
                    ? {
                        ...s,
                        points: [s.points[0], s.points[1], pos.x, pos.y],
                      }
                    : s,
                ),
              );
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              setShapes((shapes) => {
                saveHistory(shapes);
                return shapes;
              });
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />
          {isCurved && (
            <Circle
              name="control-handle"
              x={cpX}
              y={cpY}
              radius={5}
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth={2}
              draggable
              onDragStart={(e) => {
                e.cancelBubble = true;
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const pos = e.target.position();
                setShapes((prev) =>
                  prev.map((s) =>
                    s.id === shape.id
                      ? {
                          ...s,
                          controlPoint: { x: pos.x, y: pos.y },
                        }
                      : s,
                  ),
                );
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                setShapes((shapes) => {
                  saveHistory(shapes);
                  return shapes;
                });
              }}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            />
          )}
        </Group>
      )}
    </Group>
  );
};
