'use client';

import type Konva from 'konva';
import type React from 'react';
import { useState } from 'react';
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Layer,
  Rect,
  Stage,
  Transformer,
} from 'react-konva';
import { useDrawingHistory } from './hooks/use-drawing-history';
import { useDrawingHotkeys } from './hooks/use-drawing-hotkeys';
import { useDrawingInteraction } from './hooks/use-drawing-interaction';
import { KonvaStylePanel, type ShapeProperties } from './konva-style-panel';
import type { TacticalDrawTool } from './types';

export type { TacticalDrawTool };

import { getQuadraticBezierPoints } from './utils';

export interface TacticalDrawingCanvasProps {
  matchId: string;
  activeTool: TacticalDrawTool;
  onClearRef?: (clearFn: () => void) => void;
  onSelectToolRequested?: (tool: TacticalDrawTool) => void;
}

export const TacticalDrawingCanvas: React.FC<TacticalDrawingCanvasProps> = ({
  matchId: _matchId,
  activeTool,
  onClearRef,
  onSelectToolRequested,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    shapes,
    setShapes,
    history,
    historyStep,
    saveHistory,
    undo,
    redo,
    clearHistory,
  } = useDrawingHistory();

  const {
    containerRef,
    transformerRef,
    selectedNodeRef,
    dimensions,
    newShape,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleShapeClick,
    handleTransformEnd,
    handleShapeChange,
  } = useDrawingInteraction({
    activeTool,
    shapes,
    setShapes,
    selectedId,
    setSelectedId,
    saveHistory,
    onSelectToolRequested,
    onClearRef: (clearFn) => {
      if (onClearRef) {
        onClearRef(() => {
          clearHistory();
          setSelectedId(null);
        });
      }
    },
  });

  useDrawingHotkeys({
    shapes,
    setShapes,
    selectedId,
    setSelectedId,
    selectedNodeRef,
    history,
    historyStep,
    undo,
    redo,
    activeTool,
    onSelectToolRequested,
  });

  const selectedShape = shapes.find((s) => s.id === selectedId);
  const selectedProperties: ShapeProperties | null = selectedShape
    ? {
        type: selectedShape.type,
        color: selectedShape.color,
        strokeWidth: selectedShape.strokeWidth,
        dash: selectedShape.dash,
        opacity: selectedShape.opacity,
        isCurved: selectedShape.isCurved,
        zoneShape: selectedShape.zoneShape,
        fillOpacity: selectedShape.fillOpacity,
      }
    : null;

  const allShapesToRender = newShape ? [...shapes, newShape] : shapes;

  return (
    <div
      ref={containerRef}
      className="tdc-canvas absolute inset-0 w-full h-full z-10 overflow-hidden"
      style={{ pointerEvents: 'auto' }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {allShapesToRender.map((shape) => {
              const isSelected = shape.id === selectedId;

              if (shape.type === 'arrow' && shape.points) {
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
                  <Group key={shape.id}>
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
                      onClick={(e) =>
                        handleShapeClick(shape, e.currentTarget, e)
                      }
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
                                      points: [
                                        pos.x,
                                        pos.y,
                                        s.points[2],
                                        s.points[3],
                                      ],
                                    }
                                  : s,
                              ),
                            );
                          }}
                          onDragEnd={(e) => {
                            e.cancelBubble = true;
                            saveHistory(shapes);
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
                                      points: [
                                        s.points[0],
                                        s.points[1],
                                        pos.x,
                                        pos.y,
                                      ],
                                    }
                                  : s,
                              ),
                            );
                          }}
                          onDragEnd={(e) => {
                            e.cancelBubble = true;
                            saveHistory(shapes);
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
                              saveHistory(shapes);
                            }}
                            onMouseEnter={(e) => {
                              const container = e.target
                                .getStage()
                                ?.container();
                              if (container) container.style.cursor = 'pointer';
                            }}
                            onMouseLeave={(e) => {
                              const container = e.target
                                .getStage()
                                ?.container();
                              if (container) container.style.cursor = 'default';
                            }}
                          />
                        )}
                      </Group>
                    )}
                  </Group>
                );
              }

              if (shape.type === 'zone') {
                const w = shape.width || 0;
                const h = shape.height || 0;
                const x = shape.x || 0;
                const y = shape.y || 0;
                const ShapeComponent =
                  shape.zoneShape === 'ellipse' ? Ellipse : Rect;

                const shapeProps: any = {
                  id: shape.id,
                  stroke: shape.color,
                  fill: shape.color,
                  strokeWidth: shape.strokeWidth,
                  dash: shape.dash,
                  opacity: shape.opacity,
                  draggable: activeTool === 'select' && isSelected,
                  rotation: shape.rotation || 0,
                  onClick: (e: any) =>
                    handleShapeClick(shape, e.currentTarget, e),
                  onTap: (e: any) =>
                    handleShapeClick(shape, e.currentTarget, e),
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

                    const nextShapes = shapes.map((s) =>
                      s.id === shape.id ? { ...s, x: newX, y: newY } : s,
                    );
                    saveHistory(nextShapes);
                    setShapes(nextShapes);
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
                  <Group key={shape.id}>
                    <ShapeComponent {...shapeProps} />
                  </Group>
                );
              }

              return null;
            })}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
              enabledAnchors={[
                'top-left',
                'top-center',
                'top-right',
                'middle-right',
                'middle-left',
                'bottom-left',
                'bottom-center',
                'bottom-right',
              ]}
              rotateEnabled={false} // Default rotation handle off, use custom
              onTransformEnd={(e) => {
                const node = selectedNodeRef.current;
                if (!node || !selectedShape) return;
                handleTransformEnd(selectedShape, node);
              }}
              borderStroke="#3b82f6"
              anchorStroke="#3b82f6"
              anchorFill="#ffffff"
              anchorSize={8}
            />
          </Layer>
        </Stage>
      )}

      {/* Floating Style Panel (Zone/Arrow properties) */}
      <div
        className="absolute top-4 left-4 z-20"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <KonvaStylePanel
          properties={selectedProperties}
          onChange={handleShapeChange}
        />
      </div>
    </div>
  );
};
