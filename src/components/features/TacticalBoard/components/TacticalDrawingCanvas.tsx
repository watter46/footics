'use client';

import type Konva from 'konva';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Arrow,
  Circle,
  Ellipse,
  Layer,
  Rect,
  Stage,
  Transformer,
} from 'react-konva';
import { KonvaStylePanel, type ShapeProperties } from './KonvaStylePanel';

function getQuadraticBezierPoints(
  startX: number,
  startY: number,
  cpX: number,
  cpY: number,
  endX: number,
  endY: number,
  steps = 30,
) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;
    points.push(x, y);
  }
  return points;
}

export type TacticalDrawTool =
  | 'select'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'zone_circle'
  | 'eraser';

export interface TacticalDrawingCanvasProps {
  matchId: string;
  activeTool: TacticalDrawTool;
  onClearRef?: (clearFn: () => void) => void;
  onSelectToolRequested?: (tool: TacticalDrawTool) => void;
}

interface ShapeData {
  id: string;
  type: 'arrow' | 'zone';
  // Arrow properties
  points?: number[]; // [x1, y1, x2, y2]
  isCurved?: boolean;
  controlPoint?: { x: number; y: number };
  // Zone properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zoneShape?: 'rect' | 'ellipse';
  fillOpacity?: number;
  // Common properties
  color: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
  rotation?: number;
}

export const TacticalDrawingCanvas: React.FC<TacticalDrawingCanvasProps> = ({
  matchId: _matchId,
  activeTool,
  onClearRef,
  onSelectToolRequested,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newShape, setNewShape] = useState<ShapeData | null>(null);

  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);

  // ResizeObserver for matching canvas size with container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateDimensions = () => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // History State for Undo / Redo
  const [history, setHistory] = useState<ShapeData[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [copiedShape, setCopiedShape] = useState<ShapeData | null>(null);

  // Record history when drawing ends or on explicit changes
  const isUndoRedoRef = useRef(false);
  const saveHistory = useCallback(
    (newShapes: ShapeData[]) => {
      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return;
      }
      setHistory((prev) => {
        const nextHistory = prev.slice(0, historyStep + 1);
        return [...nextHistory, newShapes];
      });
      setHistoryStep((prev) => prev + 1);
    },
    [historyStep],
  );

  // Keyboard Shortcuts (Tool switching, Delete, Escape, Undo, Redo, Copy, Paste, Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Undo: Cmd+Z (without Shift)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyStep > 0) {
          isUndoRedoRef.current = true;
          const prevStep = historyStep - 1;
          setShapes(history[prevStep] || []);
          setHistoryStep(prevStep);
          setSelectedId(null);
        }
        return;
      }

      // Redo: Cmd+Shift+Z or Cmd+Y
      if (
        (isCmdOrCtrl && e.key.toLowerCase() === 'z' && e.shiftKey) ||
        (isCmdOrCtrl && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        if (historyStep < history.length - 1) {
          isUndoRedoRef.current = true;
          const nextStep = historyStep + 1;
          setShapes(history[nextStep] || []);
          setHistoryStep(nextStep);
          setSelectedId(null);
        }
        return;
      }

      // Copy: Cmd+C
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (selectedId) {
          const shapeToCopy = shapes.find((s) => s.id === selectedId);
          if (shapeToCopy) {
            setCopiedShape(shapeToCopy);
          }
        }
        return;
      }

      // Paste: Cmd+V
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (copiedShape) {
          e.preventDefault();
          const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const offset = 20;

          const pasted: ShapeData = {
            ...copiedShape,
            id: newId,
          };

          if (pasted.type === 'arrow' && pasted.points) {
            pasted.points = [
              pasted.points[0] + offset,
              pasted.points[1] + offset,
              pasted.points[2] + offset,
              pasted.points[3] + offset,
            ];
            if (pasted.controlPoint) {
              pasted.controlPoint = {
                x: pasted.controlPoint.x + offset,
                y: pasted.controlPoint.y + offset,
              };
            }
          } else if (
            pasted.type === 'zone' &&
            pasted.x !== undefined &&
            pasted.y !== undefined
          ) {
            pasted.x += offset;
            pasted.y += offset;
          }

          setShapes((prev) => [...prev, pasted]);
          setSelectedId(newId);
        }
        return;
      }

      // Clear All: Cmd+Shift+K
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShapes([]);
        setSelectedId(null);
        return;
      }

      // Tool Switching (Single Key without Cmd/Ctrl)
      if (!isCmdOrCtrl && onSelectToolRequested) {
        if (e.key === 'v' || e.key === 'V' || e.key === '1') {
          onSelectToolRequested('select');
        } else if (e.key === 'a' || e.key === 'A' || e.key === '2') {
          onSelectToolRequested('arrow_solid');
        } else if (e.key === 'd' || e.key === 'D' || e.key === '3') {
          onSelectToolRequested('arrow_dash');
        } else if (e.key === 'z' || e.key === 'Z' || e.key === '4') {
          onSelectToolRequested('zone_circle');
        } else if (e.key === 'e' || e.key === 'E' || e.key === '5') {
          onSelectToolRequested('eraser');
        }
      }

      // Delete Selected Shape
      if (!isCmdOrCtrl && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedId) {
          e.preventDefault();
          setShapes((prev) => prev.filter((s) => s.id !== selectedId));
          setSelectedId(null);
          selectedNodeRef.current = null;
        }
      }

      // Escape key: deselect or switch to select tool
      if (!isCmdOrCtrl && e.key === 'Escape') {
        e.preventDefault();
        if (selectedId) {
          setSelectedId(null);
          selectedNodeRef.current = null;
        } else if (activeTool !== 'select' && onSelectToolRequested) {
          onSelectToolRequested('select');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    activeTool,
    onSelectToolRequested,
    history,
    historyStep,
    shapes,
    copiedShape,
  ]);

  // Set up clear function callback
  useEffect(() => {
    if (onClearRef) {
      onClearRef(() => {
        setShapes([]);
        setSelectedId(null);
      });
    }
  }, [onClearRef]);

  // Update Transformer node for Zone only (Arrow doesn't use Transformer anymore)
  useEffect(() => {
    if (!transformerRef.current) return;
    const selectedShape = shapes.find((s) => s.id === selectedId);

    // 矢印にはTransformerを適用しない（カスタムハンドルで操作するため）
    if (
      selectedId &&
      selectedNodeRef.current &&
      selectedShape?.type !== 'arrow'
    ) {
      transformerRef.current.nodes([selectedNodeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, shapes]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicking on custom handles, do nothing here (handled by draggable)
    if (e.target.name() === 'control-handle') return;

    if (activeTool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
        selectedNodeRef.current = null;
      }
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (activeTool === 'arrow_solid' || activeTool === 'arrow_dash') {
      const isDash = activeTool === 'arrow_dash';
      const shape: ShapeData = {
        id,
        type: 'arrow',
        points: [pos.x, pos.y, pos.x, pos.y],
        color: '#ffffff', // ユーザー要望：白矢印
        strokeWidth: 4,
        dash: isDash ? [10, 10] : [],
        opacity: 1.0,
        isCurved: false,
      };
      setIsDrawing(true);
      setNewShape(shape);
    } else if (activeTool === 'zone_circle') {
      const shape: ShapeData = {
        id,
        type: 'zone',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        zoneShape: 'rect', // デフォルト: square
        color: '#22c55e', // デフォルト: green
        strokeWidth: 2, // デフォルト: 2px
        dash: [], // デフォルト: solid
        opacity: 1.0,
        fillOpacity: 0.35, // デフォルト: 35%
      };
      setIsDrawing(true);
      setNewShape(shape);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !newShape) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (newShape.type === 'arrow' && newShape.points) {
      setNewShape({
        ...newShape,
        points: [newShape.points[0], newShape.points[1], pos.x, pos.y],
      });
    } else if (
      newShape.type === 'zone' &&
      newShape.x !== undefined &&
      newShape.y !== undefined
    ) {
      setNewShape({
        ...newShape,
        width: pos.x - newShape.x,
        height: pos.y - newShape.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !newShape) return;
    setIsDrawing(false);

    let createdShape: ShapeData | null = null;
    if (newShape.type === 'arrow' && newShape.points) {
      const [x1, y1, x2, y2] = newShape.points;
      if (Math.hypot(x2 - x1, y2 - y1) > 8) {
        createdShape = newShape;
      }
    } else if (newShape.type === 'zone') {
      if (
        Math.abs(newShape.width || 0) > 8 ||
        Math.abs(newShape.height || 0) > 8
      ) {
        createdShape = newShape;
      }
    }

    if (createdShape) {
      setShapes((prev) => [...prev, createdShape]);
      setSelectedId(createdShape.id);
      if (onSelectToolRequested) {
        onSelectToolRequested('select');
      }
    }
    setNewShape(null);
  };

  const handleShapeClick = (
    shape: ShapeData,
    node: Konva.Node,
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (e.target.name() === 'control-handle') return; // ハンドルクリックは無視
    e.cancelBubble = true;

    if (activeTool === 'eraser') {
      setShapes((prev) => prev.filter((s) => s.id !== shape.id));
      if (selectedId === shape.id) {
        setSelectedId(null);
        selectedNodeRef.current = null;
      }
      return;
    }

    if (activeTool === 'select') {
      setSelectedId(shape.id);
      selectedNodeRef.current = node;
    }
  };

  const handleTransformEnd = (shape: ShapeData, node: Konva.Node) => {
    if (shape.type !== 'zone') return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    node.scaleX(1);
    node.scaleY(1);

    const newW = (shape.width || 0) * scaleX;
    const newH = (shape.height || 0) * scaleY;

    // Ellipseの場合、node.x()は中心座標なので左上座標に補正
    const isEllipse = shape.zoneShape === 'ellipse';
    const newX = isEllipse ? node.x() - newW / 2 : node.x();
    const newY = isEllipse ? node.y() - newH / 2 : node.y();

    setShapes((prev) =>
      prev.map((s) =>
        s.id === shape.id
          ? {
              ...s,
              x: newX,
              y: newY,
              width: newW,
              height: newH,
              rotation,
            }
          : s,
      ),
    );
  };

  const handleShapeChange = useCallback(
    (newProps: Partial<ShapeProperties>) => {
      if (!selectedId) return;
      setShapes((prev) =>
        prev.map((s) => (s.id === selectedId ? { ...s, ...newProps } : s)),
      );
    },
    [selectedId],
  );

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
                const isCurved = shape.isCurved;
                let renderPoints = shape.points;
                let cpX = (shape.points[0] + shape.points[2]) / 2;
                let cpY = (shape.points[1] + shape.points[3]) / 2;

                if (isCurved) {
                  if (shape.controlPoint) {
                    cpX = shape.controlPoint.x;
                    cpY = shape.controlPoint.y;
                  } else {
                    cpY -= 40;
                  }
                  renderPoints = getQuadraticBezierPoints(
                    shape.points[0],
                    shape.points[1],
                    cpX,
                    cpY,
                    shape.points[2],
                    shape.points[3],
                  );
                }

                return (
                  <React.Fragment key={shape.id}>
                    <Arrow
                      ref={(node) => {
                        if (isSelected && node) selectedNodeRef.current = node;
                      }}
                      points={renderPoints}
                      stroke={shape.color}
                      fill={shape.color}
                      strokeWidth={shape.strokeWidth}
                      dash={shape.dash}
                      opacity={shape.opacity}
                      pointerLength={14}
                      pointerWidth={14}
                      tension={0}
                      lineCap="round"
                      lineJoin="round"
                      hitStrokeWidth={30}
                      draggable={activeTool === 'select' && isSelected}
                      onDragEnd={(e) => {
                        if (e.target.name() === 'control-handle') return;
                        const node = e.target;
                        const dx = node.x();
                        const dy = node.y();
                        node.position({ x: 0, y: 0 });

                        const newPoints = [
                          shape.points![0] + dx,
                          shape.points![1] + dy,
                          shape.points![2] + dx,
                          shape.points![3] + dy,
                        ];
                        const newCp = shape.controlPoint
                          ? {
                              x: shape.controlPoint.x + dx,
                              y: shape.controlPoint.y + dy,
                            }
                          : undefined;

                        saveHistory(
                          shapes.map((s) =>
                            s.id === shape.id
                              ? { ...s, points: newPoints, controlPoint: newCp }
                              : s,
                          ),
                        );
                        setShapes((prev) =>
                          prev.map((s) =>
                            s.id === shape.id
                              ? { ...s, points: newPoints, controlPoint: newCp }
                              : s,
                          ),
                        );
                      }}
                      onClick={(e) => handleShapeClick(shape, e.target, e)}
                      onTap={(e) => handleShapeClick(shape, e.target, e)}
                    />

                    {/* カスタム操作ハンドル */}
                    {isSelected && activeTool === 'select' && (
                      <>
                        {/* 始点ハンドル */}
                        <Circle
                          name="control-handle"
                          x={shape.points[0]}
                          y={shape.points[1]}
                          radius={6}
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          draggable
                          onDragMove={(e) => {
                            const newX = e.target.x();
                            const newY = e.target.y();
                            setShapes((prev) =>
                              prev.map((s) =>
                                s.id === shape.id
                                  ? {
                                      ...s,
                                      points: [
                                        newX,
                                        newY,
                                        s.points![2],
                                        s.points![3],
                                      ],
                                    }
                                  : s,
                              ),
                            );
                          }}
                          onDragEnd={() => saveHistory(shapes)}
                        />
                        {/* 終点ハンドル */}
                        <Circle
                          name="control-handle"
                          x={shape.points[2]}
                          y={shape.points[3]}
                          radius={6}
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          draggable
                          onDragMove={(e) => {
                            const newX = e.target.x();
                            const newY = e.target.y();
                            setShapes((prev) =>
                              prev.map((s) =>
                                s.id === shape.id
                                  ? {
                                      ...s,
                                      points: [
                                        s.points![0],
                                        s.points![1],
                                        newX,
                                        newY,
                                      ],
                                    }
                                  : s,
                              ),
                            );
                          }}
                          onDragEnd={() => saveHistory(shapes)}
                        />
                        {/* 曲線コントロールハンドル */}
                        {isCurved && (
                          <Circle
                            name="control-handle"
                            x={cpX}
                            y={cpY}
                            radius={7}
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth={2}
                            draggable
                            onDragMove={(e) => {
                              const newCp = {
                                x: e.target.x(),
                                y: e.target.y(),
                              };
                              setShapes((prev) =>
                                prev.map((s) =>
                                  s.id === shape.id
                                    ? { ...s, controlPoint: newCp }
                                    : s,
                                ),
                              );
                            }}
                            onDragEnd={() => saveHistory(shapes)}
                          />
                        )}
                      </>
                    )}
                  </React.Fragment>
                );
              }

              if (
                shape.type === 'zone' &&
                shape.x !== undefined &&
                shape.y !== undefined
              ) {                const w = shape.width || 0;
                const h = shape.height || 0;

                const hexColor = shape.color.replace('#', '');
                const r = parseInt(hexColor.substring(0, 2), 16) || 239;
                const g = parseInt(hexColor.substring(2, 4), 16) || 68;
                const b = parseInt(hexColor.substring(4, 6), 16) || 68;
                const fillRGBA = `rgba(${r}, ${g}, ${b}, ${shape.fillOpacity ?? 0})`;

                if (shape.zoneShape === 'ellipse') {
                  return (
                    <Ellipse
                      key={shape.id}
                      ref={(node) => {
                        if (isSelected && node) selectedNodeRef.current = node;
                      }}
                      x={shape.x + w / 2}
                      y={shape.y + h / 2}
                      radiusX={Math.abs(w / 2)}
                      radiusY={Math.abs(h / 2)}
                      fill={fillRGBA}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      dash={shape.dash}
                      opacity={shape.opacity}
                      draggable={activeTool === 'select' && isSelected}
                      onClick={(e) => handleShapeClick(shape, e.target, e)}
                      onTap={(e) => handleShapeClick(shape, e.target, e)}
                      onTransformEnd={(e) =>
                        handleTransformEnd(shape, e.target)
                      }
                      onDragEnd={(e) => {
                        if (e.target.name() === 'control-handle') return;
                        const newX = e.target.x() - Math.abs(w / 2);
                        const newY = e.target.y() - Math.abs(h / 2);
                        saveHistory(
                          shapes.map((s) =>
                            s.id === shape.id
                              ? { ...s, x: newX, y: newY }
                              : s,
                          ),
                        );
                        setShapes((prev) =>
                          prev.map((s) =>
                            s.id === shape.id ? { ...s, x: newX, y: newY } : s,
                          ),
                        );
                      }}
                    />
                  );
                }

                return (
                  <Rect
                    key={shape.id}
                    ref={(node) => {
                      if (isSelected && node) selectedNodeRef.current = node;
                    }}
                    x={w < 0 ? shape.x + w : shape.x}
                    y={h < 0 ? shape.y + h : shape.y}
                    width={Math.abs(w)}
                    height={Math.abs(h)}
                    fill={fillRGBA}
                    stroke={shape.color}
                    strokeWidth={shape.strokeWidth}
                    dash={shape.dash}
                    opacity={shape.opacity}
                    draggable={activeTool === 'select' && isSelected}
                    onClick={(e) => handleShapeClick(shape, e.target, e)}
                    onTap={(e) => handleShapeClick(shape, e.target, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape, e.target)}
                    onDragEnd={(e) => {
                      if (e.target.name() === 'control-handle') return;
                      saveHistory(
                        shapes.map((s) =>
                          s.id === shape.id
                            ? { ...s, x: e.target.x(), y: e.target.y() }
                            : s,
                        ),
                      );
                      setShapes((prev) =>
                        prev.map((s) =>
                          s.id === shape.id
                            ? { ...s, x: e.target.x(), y: e.target.y() }
                            : s,
                        ),
                      );
                    }}
                  />
                );
              }

              return null;
            })}

            {/* Transformer (Zoneのみ適用) */}
            {activeTool === 'select' && selectedShape?.type === 'zone' && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                keepRatio={false}
                enabledAnchors={[
                  'top-left',
                  'top-center',
                  'top-right',
                  'middle-left',
                  'middle-right',
                  'bottom-left',
                  'bottom-center',
                  'bottom-right',
                ]}
                borderStroke="#3b82f6"
                anchorFill="#ffffff"
                anchorStroke="#3b82f6"
                anchorSize={8}
              />
            )}
          </Layer>
        </Stage>
      )}

      {/* Floating Style Palette (ピッチの右側に表示) */}
      <KonvaStylePanel
        properties={selectedProperties}
        onChange={handleShapeChange}
      />
    </div>
  );
};
