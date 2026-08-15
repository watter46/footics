import type Konva from 'konva';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShapeProperties } from '../konva-style-panel';
import type { ShapeData, TacticalDrawTool } from '../types';
import { checkCornerRotateZone, ROTATE_CURSOR } from '../utils';

interface UseDrawingInteractionProps {
  activeTool: TacticalDrawTool;
  shapes: ShapeData[];
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  saveHistory: (newShapes: ShapeData[]) => void;
  onSelectToolRequested?: (tool: TacticalDrawTool) => void;
  onClearRef?: (clearFn: () => void) => void;
}

export function useDrawingInteraction({
  activeTool,
  shapes,
  setShapes,
  selectedId,
  setSelectedId,
  saveHistory,
  onSelectToolRequested,
  onClearRef,
}: UseDrawingInteractionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [newShape, setNewShape] = useState<ShapeData | null>(null);

  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);

  // Custom Rotate interaction refs
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

  // Set up clear function callback
  useEffect(() => {
    if (onClearRef) {
      onClearRef(() => {
        setShapes([]);
        setSelectedId(null);
      });
    }
  }, [onClearRef, setShapes, setSelectedId]);

  // Update Transformer node for Zone only
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
    if (e.target.name() === 'control-handle') return;

    const selectedShape = shapes.find((s) => s.id === selectedId);

    // 四隅回転エリアでのクリックの場合、カスタム回転モードを開始
    if (
      activeTool === 'select' &&
      selectedShape &&
      isOverRotateZoneRef.current
    ) {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (
        pos &&
        selectedShape.x !== undefined &&
        selectedShape.y !== undefined
      ) {
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
        color: '#ffffff',
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
        zoneShape: 'rect',
        color: '#22c55e',
        strokeWidth: 2,
        dash: [],
        opacity: 1.0,
        fillOpacity: 0.35,
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

        const newRotation =
          (startShapeRotationRef.current + angleDiffDeg) % 360;

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
    [selectedId, setShapes],
  );

  return {
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
  };
}
