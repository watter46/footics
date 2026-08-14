'use client';

import type Konva from 'konva';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/><path d='M21 3v5h-5'/></svg>") 12 12, auto`;

function checkCornerRotateZone(
  pos: { x: number; y: number },
  shape: ShapeData,
): boolean {
  if (shape.type !== 'zone' || shape.x === undefined || shape.y === undefined)
    return false;
  const w = Math.abs(shape.width || 0);
  const h = Math.abs(shape.height || 0);
  if (w === 0 || h === 0) return false;

  const cx = shape.x + w / 2;
  const cy = shape.y + h / 2;
  const rad = ((shape.rotation || 0) * Math.PI) / 180;

  const hw = w / 2;
  const hh = h / 2;

  const cornersLocal = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: -hw, y: hh },
    { x: hw, y: hh },
  ];

  const corners = cornersLocal.map((pt) => ({
    x: cx + pt.x * Math.cos(rad) - pt.y * Math.sin(rad),
    y: cy + pt.x * Math.sin(rad) + pt.y * Math.cos(rad),
  }));

  for (const corner of corners) {
    const dist = Math.hypot(pos.x - corner.x, pos.y - corner.y);
    if (dist >= 6 && dist <= 28) {
      return true;
    }
  }
  return false;
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

  // Custom Rotate interaction refs (tldraw-style corner rotation)
  const isRotatingRef = useRef(false);
  const rotateCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startMouseAngleRef = useRef(0);
  const startShapeRotationRef = useRef(0);
  const isOverRotateZoneRef = useRef(false);

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

    const selectedShape = shapes.find((s) => s.id === selectedId);

    // 四隅回転エリアでのクリックの場合、カスタム回転モードを開始
    if (activeTool === 'select' && selectedShape && isOverRotateZoneRef.current) {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos && selectedShape.x !== undefined && selectedShape.y !== undefined) {
        const w = Math.abs(selectedShape.width || 0);
        const h = Math.abs(selectedShape.height || 0);
        const cx = selectedShape.x + w / 2;
        const cy = selectedShape.y + h / 2;

        isRotatingRef.current = true;
        rotateCenterRef.current = { x: cx, y: cy };
        startMouseAngleRef.current = Math.atan2(pos.y - cy, pos.x - cx);
        startShapeRotationRef.current = selectedShape.rotation || 0;
        return;
      }
    }

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
    // カスタム回転ドラッグ中の処理
    if (isRotatingRef.current && selectedId && selectedNodeRef.current) {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        const cx = rotateCenterRef.current.x;
        const cy = rotateCenterRef.current.y;
        const currentAngle = Math.atan2(pos.y - cy, pos.x - cx);
        const angleDiffRad = currentAngle - startMouseAngleRef.current;
        const angleDiffDeg = (angleDiffRad * 180) / Math.PI;

        const newRotation = (startShapeRotationRef.current + angleDiffDeg) % 360;

        selectedNodeRef.current.rotation(newRotation);
        selectedNodeRef.current.getLayer()?.batchDraw();

        setShapes((prev) =>
          prev.map((s) =>
            s.id === selectedId ? { ...s, rotation: newRotation } : s,
          ),
        );
        return;
      }
    }

    // ホバー時：四隅の回転外側ゾーン判定とカーソル切替
    const selectedShape = shapes.find((s) => s.id === selectedId);
    if (activeTool === 'select' && selectedShape?.type === 'zone') {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      const container = containerRef.current;
      if (pos && container) {
        const isOver = checkCornerRotateZone(pos, selectedShape);
        isOverRotateZoneRef.current = isOver;
        if (isOver) {
          container.style.cursor = ROTATE_CURSOR;
        } else if (container.style.cursor.includes('data:image/svg+xml')) {
          container.style.cursor = 'default';
        }
      }
    }

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
    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      saveHistory(shapes);
      return;
    }

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

    // node.x(), node.y() は中心座標
    const newX = node.x() - Math.abs(newW) / 2;
    const newY = node.y() - Math.abs(newH) / 2;

    const nextShapes = shapes.map((s) =>
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
    );

    saveHistory(nextShapes);
    setShapes(nextShapes);
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
                  <Group
                    key={shape.id}
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

                      const nextShapes = shapes.map((s) =>
                        s.id === shape.id
                          ? { ...s, points: newPoints, controlPoint: newCp }
                          : s,
                      );
                      saveHistory(nextShapes);
                      setShapes(nextShapes);
                    }}
                  >
                    <Arrow
                      ref={(node) => {
                        if (node) {
                          if (isSelected) selectedNodeRef.current = node;
                        }
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
                          radius={7}
                          hitStrokeWidth={20}
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          draggable
                          onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grab';
                          }}
                          onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'default';
                          }}
                          onDragStart={(e) => {
                            e.cancelBubble = true;
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grabbing';
                          }}
                          onDragMove={(e) => {
                            const newX = e.target.x();
                            const newY = e.target.y();
                            const arrowNode = selectedNodeRef.current as Konva.Arrow | null;
                            if (arrowNode) {
                              if (isCurved) {
                                const pts = getQuadraticBezierPoints(
                                  newX,
                                  newY,
                                  cpX,
                                  cpY,
                                  shape.points![2],
                                  shape.points![3],
                                );
                                arrowNode.points(pts);
                              } else {
                                arrowNode.points([
                                  newX,
                                  newY,
                                  shape.points![2],
                                  shape.points![3],
                                ]);
                              }
                              arrowNode.getLayer()?.batchDraw();
                            }
                          }}
                          onDragEnd={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grab';
                            const newX = e.target.x();
                            const newY = e.target.y();
                            const nextShapes = shapes.map((s) =>
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
                            );
                            saveHistory(nextShapes);
                            setShapes(nextShapes);
                          }}
                        />
                        {/* 終点ハンドル */}
                        <Circle
                          name="control-handle"
                          x={shape.points[2]}
                          y={shape.points[3]}
                          radius={7}
                          hitStrokeWidth={20}
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          draggable
                          onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grab';
                          }}
                          onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'default';
                          }}
                          onDragStart={(e) => {
                            e.cancelBubble = true;
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grabbing';
                          }}
                          onDragMove={(e) => {
                            const newX = e.target.x();
                            const newY = e.target.y();
                            const arrowNode = selectedNodeRef.current as Konva.Arrow | null;
                            if (arrowNode) {
                              if (isCurved) {
                                const pts = getQuadraticBezierPoints(
                                  shape.points![0],
                                  shape.points![1],
                                  cpX,
                                  cpY,
                                  newX,
                                  newY,
                                );
                                arrowNode.points(pts);
                              } else {
                                arrowNode.points([
                                  shape.points![0],
                                  shape.points![1],
                                  newX,
                                  newY,
                                ]);
                              }
                              arrowNode.getLayer()?.batchDraw();
                            }
                          }}
                          onDragEnd={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grab';
                            const newX = e.target.x();
                            const newY = e.target.y();
                            const nextShapes = shapes.map((s) =>
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
                            );
                            saveHistory(nextShapes);
                            setShapes(nextShapes);
                          }}
                        />
                        {/* 曲線コントロールハンドル */}
                        {isCurved && (
                          <Circle
                            name="control-handle"
                            x={cpX}
                            y={cpY}
                            radius={8}
                            hitStrokeWidth={20}
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth={2}
                            draggable
                            onMouseEnter={(e) => {
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = 'grab';
                            }}
                            onMouseLeave={(e) => {
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = 'default';
                            }}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = 'grabbing';
                            }}
                            onDragMove={(e) => {
                              const newCpX = e.target.x();
                              const newCpY = e.target.y();
                              const arrowNode = selectedNodeRef.current as Konva.Arrow | null;
                              if (arrowNode) {
                                const pts = getQuadraticBezierPoints(
                                  shape.points![0],
                                  shape.points![1],
                                  newCpX,
                                  newCpY,
                                  shape.points![2],
                                  shape.points![3],
                                );
                                arrowNode.points(pts);
                                arrowNode.getLayer()?.batchDraw();
                              }
                            }}
                            onDragEnd={(e) => {
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = 'grab';
                              const newCp = {
                                x: e.target.x(),
                                y: e.target.y(),
                              };
                              const nextShapes = shapes.map((s) =>
                                s.id === shape.id
                                  ? { ...s, controlPoint: newCp }
                                  : s,
                              );
                              saveHistory(nextShapes);
                              setShapes(nextShapes);
                            }}
                          />
                        )}
                      </>
                    )}
                  </Group>
                );
              }

              if (
                shape.type === 'zone' &&
                shape.x !== undefined &&
                shape.y !== undefined
              ) {
                const w = shape.width || 0;
                const h = shape.height || 0;
                const absW = Math.abs(w);
                const absH = Math.abs(h);

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
                      x={shape.x + absW / 2}
                      y={shape.y + absH / 2}
                      radiusX={absW / 2}
                      radiusY={absH / 2}
                      rotation={shape.rotation || 0}
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
                        const newX = e.target.x() - absW / 2;
                        const newY = e.target.y() - absH / 2;
                        const nextShapes = shapes.map((s) =>
                          s.id === shape.id ? { ...s, x: newX, y: newY } : s,
                        );
                        saveHistory(nextShapes);
                        setShapes(nextShapes);
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
                    x={shape.x + absW / 2}
                    y={shape.y + absH / 2}
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
                    onClick={(e) => handleShapeClick(shape, e.target, e)}
                    onTap={(e) => handleShapeClick(shape, e.target, e)}
                    onTransformEnd={(e) => handleTransformEnd(shape, e.target)}
                    onDragEnd={(e) => {
                      if (e.target.name() === 'control-handle') return;
                      const newX = e.target.x() - absW / 2;
                      const newY = e.target.y() - absH / 2;
                      const nextShapes = shapes.map((s) =>
                        s.id === shape.id ? { ...s, x: newX, y: newY } : s,
                      );
                      saveHistory(nextShapes);
                      setShapes(nextShapes);
                    }}
                  />
                );
              }

              return null;
            })}

            {/* Transformer (Zoneのみ適用 - tldraw風の四隅回転対応) */}
            {activeTool === 'select' && selectedShape?.type === 'zone' && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                rotateAnchorOffset={0}
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
                anchorSize={9}
                anchorCornerRadius={2}
                anchorStyleFunc={(anchor) => {
                  // 上部の独立した回転用丸ハンドルを非表示にし、四隅に回転領域を統合
                  if (anchor.hasName('rotater')) {
                    anchor.visible(false);
                  }
                }}
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
