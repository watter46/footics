import type Konva from 'konva';
import {
  ArrowRight,
  Eraser,
  Hexagon,
  MousePointer2,
  MoveRight,
  Square,
  UserCheck,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Rect,
  Stage,
  Transformer,
} from 'react-konva';
import { useBackground } from '@/hooks/useBackground';
import { useExport } from '@/hooks/useExport';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/useEditorStore';
import { FloatingMarkerToolbar } from './konva/FloatingMarkerToolbar';
import { KonvaStylePanel, type ShapeProperties } from './konva/KonvaStylePanel';
import {
  getArrowLayout,
  getFovLayoutPoints,
  getMarkerDimensions,
  MARKER_ARROW_DEFAULT_LENGTH,
  MARKER_DEFAULT_SIZE,
  MARKER_FOV_DEFAULT_ANGLE,
  MARKER_FOV_DEFAULT_LENGTH,
  MARKER_PATHS,
  MARKER_RING_RX,
  MARKER_RING_RY,
  MARKER_SVG_SIZE,
  SPOTLIGHT_BEAM_PATH,
} from './konva/marker-assets';

// ---------------------------------------------------------------------------
// Utility: Quadratic Bezier point generation
// ---------------------------------------------------------------------------
function getQuadraticBezierPoints(
  startX: number,
  startY: number,
  cpX: number,
  cpY: number,
  endX: number,
  endY: number,
  steps = 30,
) {
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;
    points.push(x, y);
  }
  return points;
}

// ---------------------------------------------------------------------------
// Utility: Calculate Connector line points connecting perimeter of 2 markers
// Ensures the line lies exactly on the line segment connecting Center A and Center B
// ---------------------------------------------------------------------------
function getConnectorPoints(startMarker: ShapeData, endMarker: ShapeData) {
  const sSize = startMarker.markerSize || MARKER_DEFAULT_SIZE;
  const eSize = endMarker.markerSize || MARKER_DEFAULT_SIZE;
  const { rrx: rx1, rry: ry1 } = getMarkerDimensions(sSize, sSize);
  const { rrx: rx2, rry: ry2 } = getMarkerDimensions(eSize, eSize);

  const cx1 = (startMarker.x ?? 0) + sSize / 2;
  const cy1 = (startMarker.y ?? 0) + sSize / 2;
  const cx2 = (endMarker.x ?? 0) + eSize / 2;
  const cy2 = (endMarker.y ?? 0) + eSize / 2;

  const dx = cx2 - cx1;
  const dy = cy2 - cy1;
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-3) {
    return [cx1, cy1, cx2, cy2];
  }

  // Unit direction vector from Center 1 to Center 2
  const ux = dx / dist;
  const uy = dy / dist;

  // Exact Ray-Ellipse intersection distance from Center 1 along (ux, uy)
  // Equation: (t*ux)^2 / rx^2 + (t*uy)^2 / ry^2 = 1 => t = (rx*ry) / sqrt((ry*ux)^2 + (rx*uy)^2)
  const t1 = (rx1 * ry1) / Math.hypot(ry1 * ux, rx1 * uy);
  const startX = cx1 + t1 * ux;
  const startY = cy1 + t1 * uy;

  // Exact Ray-Ellipse intersection distance from Center 2 along (-ux, -uy)
  const t2 = (rx2 * ry2) / Math.hypot(ry2 * ux, rx2 * uy);
  const endX = cx2 - t2 * ux;
  const endY = cy2 - t2 * uy;

  return [startX, startY, endX, endY];
}

// ---------------------------------------------------------------------------
// Rotate cursor SVG
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type DrawTool =
  | 'select'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'zone_circle'
  | 'polygon_zone'
  | 'marker'
  | 'eraser';

export interface ShapeData {
  id: string;
  type:
    | 'arrow'
    | 'zone'
    | 'polygon_zone'
    | 'marker'
    | 'marker_arrow_solid'
    | 'marker_arrow_dash'
    | 'marker_man_mark'
    | 'marker_fov'
    | 'marker_connector';
  color: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
  rotation?: number;

  // Parent-Child link
  targetMarkerId?: string;
  startMarkerId?: string;
  endMarkerId?: string;

  // Arrow & Line properties
  points?: number[]; // [x1, y1, x2, y2, ...]
  isCurved?: boolean;
  controlPoint?: { x: number; y: number };

  // Marker-attached arrow/line angle & length
  arrowAngle?: number;
  arrowLength?: number;
  arrowBend?: number;

  // Zone / Rect properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zoneShape?: 'rect' | 'ellipse';
  fillOpacity?: number;

  // Polygon Zone properties
  isComplete?: boolean;

  // Marker properties
  markerSize?: number; // 1:1 aspect ratio size
  isSpotlight?: boolean;

  // FOV properties
  fovDirection?: number; // radians
  fovAngle?: number; // radians
  fovLength?: number; // px length
}

interface CaptureFrameData {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// CanvasContainer Component (Main)
// ---------------------------------------------------------------------------
export const CanvasContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newShape, setNewShape] = useState<ShapeData | null>(null);
  const [activeTool, setActiveTool] = useState<DrawTool>('select');

  // Polygon Zone creation state
  const [activePolygonId, setActivePolygonId] = useState<string | null>(null);
  const [mousePreviewPos, setMousePreviewPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Marker Connector Creation State (Start Marker selected -> waiting for second marker)
  const [connectingMarkerId, setConnectingMarkerId] = useState<string | null>(
    null,
  );
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  // Capture Frame (Trimming Bounds)
  const [captureFrame, setCaptureFrame] = useState<CaptureFrameData | null>(
    null,
  );

  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);

  // Map of shape Konva nodes for zero-lag drag synchronization
  const shapeNodesRef = useRef<Map<string, Konva.Node>>(new Map());
  const dragMarkerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom rotate refs (tldraw-style corner rotation)
  const isRotatingRef = useRef(false);
  const rotateCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startMouseAngleRef = useRef(0);
  const startShapeRotationRef = useRef(0);
  const isOverRotateZoneRef = useRef(false);

  // Background image
  const { backgroundImage, imageSize } = useBackground();

  // Export
  const { performExport } = useExport();
  const triggerCopy = useEditorStore((state) => state.triggerCopy);
  const triggerSave = useEditorStore((state) => state.triggerSave);

  // ResizeObserver for container dimensions
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

  // Initialize Capture Frame when image is loaded (Default: Full Screen Image Size)
  useEffect(() => {
    if (imageSize.w > 0 && imageSize.h > 0 && !captureFrame) {
      setCaptureFrame({
        x: 0,
        y: 0,
        w: imageSize.w,
        h: imageSize.h,
      });
    }
  }, [imageSize, captureFrame]);

  // ---------------------------------------------------------------------------
  // Viewport Fit Scale & Offset Calculations (Screen Aspect Fit Centering)
  // ---------------------------------------------------------------------------
  const hasImage =
    Boolean(backgroundImage) && imageSize.w > 0 && imageSize.h > 0;
  const stageW = dimensions.width || 800;
  const stageH = dimensions.height || 600;

  // Safe Area margins to prevent overlap with header and bottom toolbar
  const PADDING_TOP = 68; // Header safe padding
  const PADDING_BOTTOM = 76; // Bottom toolbar safe padding
  const PADDING_HORIZONTAL = 32; // Left & right margin

  const availableW = Math.max(100, stageW - PADDING_HORIZONTAL * 2);
  const availableH = Math.max(100, stageH - PADDING_TOP - PADDING_BOTTOM);

  const fitScale = hasImage
    ? Math.min(availableW / imageSize.w, availableH / imageSize.h, 1)
    : 1;

  const contentW = hasImage ? imageSize.w * fitScale : availableW;
  const contentH = hasImage ? imageSize.h * fitScale : availableH;

  const originX = PADDING_HORIZONTAL + Math.max(0, (availableW - contentW) / 2);
  const originY = PADDING_TOP + Math.max(0, (availableH - contentH) / 2);

  const getCanvasPointerPos = (stage: Konva.Stage) => {
    const rawPos = stage.getPointerPosition();
    if (!rawPos) return null;
    return {
      x: (rawPos.x - originX) / fitScale,
      y: (rawPos.y - originY) / fitScale,
    };
  };

  // Export triggers
  const triggerCopyRef = useRef(triggerCopy);
  const triggerSaveRef = useRef(triggerSave);

  useEffect(() => {
    if (triggerCopy > triggerCopyRef.current) {
      const bounds = captureFrame
        ? {
            x: originX + captureFrame.x * fitScale,
            y: originY + captureFrame.y * fitScale,
            width: captureFrame.w * fitScale,
            height: captureFrame.h * fitScale,
          }
        : hasImage
          ? { x: originX, y: originY, width: contentW, height: contentH }
          : undefined;
      performExport(stageRef.current, 'copy', bounds);
    }
    triggerCopyRef.current = triggerCopy;
  }, [
    triggerCopy,
    performExport,
    hasImage,
    captureFrame,
    originX,
    originY,
    contentW,
    contentH,
    fitScale,
  ]);

  useEffect(() => {
    if (triggerSave > triggerSaveRef.current) {
      const bounds = captureFrame
        ? {
            x: originX + captureFrame.x * fitScale,
            y: originY + captureFrame.y * fitScale,
            width: captureFrame.w * fitScale,
            height: captureFrame.h * fitScale,
          }
        : hasImage
          ? { x: originX, y: originY, width: contentW, height: contentH }
          : undefined;
      performExport(stageRef.current, 'save', bounds);
    }
    triggerSaveRef.current = triggerSave;
  }, [
    triggerSave,
    performExport,
    hasImage,
    captureFrame,
    originX,
    originY,
    contentW,
    contentH,
    fitScale,
  ]);

  // History state
  const [history, setHistory] = useState<ShapeData[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [copiedShape, setCopiedShape] = useState<ShapeData | null>(null);

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

  // Transformer node sync (Zone & Marker)
  useEffect(() => {
    if (!transformerRef.current) return;
    const selectedShape = shapes.find((s) => s.id === selectedId);

    if (
      selectedId &&
      selectedNodeRef.current &&
      (selectedShape?.type === 'zone' || selectedShape?.type === 'marker')
    ) {
      transformerRef.current.nodes([selectedNodeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, shapes]);

  // Helper: Delete a shape and all its attached children
  const deleteShapeWithChildren = useCallback(
    (shapeId: string) => {
      const nextShapes = shapes.filter(
        (s) =>
          s.id !== shapeId &&
          s.targetMarkerId !== shapeId &&
          s.startMarkerId !== shapeId &&
          s.endMarkerId !== shapeId,
      );
      setShapes(nextShapes);
      saveHistory(nextShapes);
      if (selectedId === shapeId) {
        setSelectedId(null);
        selectedNodeRef.current = null;
      }
    },
    [shapes, selectedId, saveHistory],
  );

  // Duplicate a shape immediately (Cmd+D / Ctrl+D)
  const duplicateSelectedShape = useCallback(() => {
    if (!selectedId) return;
    const shapeToDuplicate = shapes.find((s) => s.id === selectedId);
    if (!shapeToDuplicate) return;

    const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const offset = 24;
    const duplicated: ShapeData = { ...shapeToDuplicate, id: newId };
    if (duplicated.points) {
      duplicated.points = duplicated.points.map((pt) => pt + offset);
      if (duplicated.controlPoint) {
        duplicated.controlPoint = {
          x: duplicated.controlPoint.x + offset,
          y: duplicated.controlPoint.y + offset,
        };
      }
    } else if (duplicated.x !== undefined && duplicated.y !== undefined) {
      duplicated.x += offset;
      duplicated.y += offset;
    }
    const nextShapes = [...shapes, duplicated];
    setShapes(nextShapes);
    saveHistory(nextShapes);
    setSelectedId(newId);
  }, [selectedId, shapes, saveHistory]);

  // Keyboard shortcuts
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

      if (e.key === 'Enter' && activePolygonId) {
        e.preventDefault();
        setShapes((prev) =>
          prev.map((s) =>
            s.id === activePolygonId ? { ...s, isComplete: true } : s,
          ),
        );
        setSelectedId(activePolygonId);
        setActivePolygonId(null);
        setActiveTool('select');
        return;
      }

      // Undo: Cmd+Z / Ctrl+Z
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

      // Redo: Cmd+Shift+Z / Cmd+Y / Ctrl+Y
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

      // Copy: Cmd+C / Ctrl+C
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (selectedId) {
          const shapeToCopy = shapes.find((s) => s.id === selectedId);
          if (shapeToCopy) {
            setCopiedShape(shapeToCopy);
          }
        }
        return;
      }

      // Paste: Cmd+V / Ctrl+V
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (copiedShape) {
          e.preventDefault();
          const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const offset = 20;
          const pasted: ShapeData = { ...copiedShape, id: newId };
          if (pasted.points) {
            pasted.points = pasted.points.map((pt) => pt + offset);
            if (pasted.controlPoint) {
              pasted.controlPoint = {
                x: pasted.controlPoint.x + offset,
                y: pasted.controlPoint.y + offset,
              };
            }
          } else if (pasted.x !== undefined && pasted.y !== undefined) {
            pasted.x += offset;
            pasted.y += offset;
          }
          const nextShapes = [...shapes, pasted];
          setShapes(nextShapes);
          saveHistory(nextShapes);
          setSelectedId(newId);
        }
        return;
      }

      // Duplicate: Cmd+D / Ctrl+D (Immediate Copy & Paste)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedShape();
        return;
      }

      // Clear All: Cmd+Shift+K
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShapes([]);
        saveHistory([]);
        setSelectedId(null);
        return;
      }

      if (!isCmdOrCtrl) {
        if (e.key === 'v' || e.key === 'V' || e.key === '1') {
          setActiveTool('select');
        } else if (e.key === 'a' || e.key === 'A' || e.key === '2') {
          setActiveTool('arrow_solid');
        } else if (e.key === 'd' || e.key === 'D' || e.key === '3') {
          setActiveTool('arrow_dash');
        } else if (e.key === 'z' || e.key === 'Z' || e.key === '4') {
          setActiveTool('zone_circle');
        } else if (e.key === 'p' || e.key === 'P' || e.key === '5') {
          setActiveTool('polygon_zone');
        } else if (e.key === 'm' || e.key === 'M' || e.key === '6') {
          setActiveTool('marker');
        } else if (e.key === 'e' || e.key === 'E' || e.key === '7') {
          setActiveTool('eraser');
        }
      }

      if (!isCmdOrCtrl && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedId) {
          e.preventDefault();
          deleteShapeWithChildren(selectedId);
        }
      }

      if (!isCmdOrCtrl && e.key === 'Escape') {
        e.preventDefault();
        if (connectingMarkerId) {
          setConnectingMarkerId(null);
          setHoveredMarkerId(null);
        }
        if (activePolygonId) {
          setShapes((prev) => prev.filter((s) => s.id !== activePolygonId));
          setActivePolygonId(null);
        }
        if (selectedId) {
          setSelectedId(null);
          selectedNodeRef.current = null;
        } else if (activeTool !== 'select') {
          setActiveTool('select');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    activeTool,
    history,
    historyStep,
    shapes,
    copiedShape,
    activePolygonId,
    connectingMarkerId,
    saveHistory,
    deleteShapeWithChildren,
    duplicateSelectedShape,
  ]);

  // ---------------------------------------------------------------------------
  // Mouse event handlers
  // ---------------------------------------------------------------------------
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target.name() === 'control-handle') return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getCanvasPointerPos(stage);
    if (!pos) return;

    if (connectingMarkerId) {
      if (hoveredMarkerId && hoveredMarkerId !== connectingMarkerId) {
        const startMarker = shapes.find((s) => s.id === connectingMarkerId);
        const endMarker = shapes.find((s) => s.id === hoveredMarkerId);
        if (
          startMarker &&
          endMarker &&
          startMarker.x !== undefined &&
          startMarker.y !== undefined &&
          endMarker.x !== undefined &&
          endMarker.y !== undefined
        ) {
          const connPoints = getConnectorPoints(startMarker, endMarker);
          const connId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const connShape: ShapeData = {
            id: connId,
            type: 'marker_connector',
            points: connPoints,
            color: startMarker.color,
            strokeWidth: 5,
            dash: [],
            opacity: 1.0,
            startMarkerId: startMarker.id,
            endMarkerId: endMarker.id,
          };
          const nextShapes = [...shapes, connShape];
          setShapes(nextShapes);
          saveHistory(nextShapes);
          setSelectedId(connId);
        }
      }
      setConnectingMarkerId(null);
      setHoveredMarkerId(null);
      return;
    }

    const selectedShape = shapes.find((s) => s.id === selectedId);

    // Corner rotate zone detection for Zone
    if (
      activeTool === 'select' &&
      selectedShape &&
      isOverRotateZoneRef.current
    ) {
      if (selectedShape.x !== undefined && selectedShape.y !== undefined) {
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
      const clickedOnEmpty =
        e.target === stage || e.target.name() === 'bg-image';
      if (clickedOnEmpty) {
        setSelectedId(null);
        selectedNodeRef.current = null;
      }
      return;
    }

    // Player Marker Creation (1.5x initial size)
    if (activeTool === 'marker') {
      const size = MARKER_DEFAULT_SIZE;
      const markerShape: ShapeData = {
        id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'marker',
        x: pos.x - size / 2,
        y: pos.y - size / 2,
        markerSize: size,
        color: '#034694',
        strokeWidth: 2,
        dash: [],
        opacity: 1.0,
        isSpotlight: false,
      };
      const nextShapes = [...shapes, markerShape];
      setShapes(nextShapes);
      saveHistory(nextShapes);
      setSelectedId(markerShape.id);
      setActiveTool('select');
      return;
    }

    // Polygon Zone
    if (activeTool === 'polygon_zone') {
      if (!activePolygonId) {
        const id = `poly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const polyShape: ShapeData = {
          id,
          type: 'polygon_zone',
          points: [pos.x, pos.y],
          color: '#22c55e',
          strokeWidth: 4,
          dash: [],
          opacity: 1.0,
          fillOpacity: 0.3,
          isComplete: false,
        };
        setActivePolygonId(id);
        setShapes((prev) => [...prev, polyShape]);
      } else {
        const poly = shapes.find((s) => s.id === activePolygonId);
        if (!poly?.points) return;

        const pts = poly.points;
        const startX = pts[0];
        const startY = pts[1];
        const numPoints = pts.length / 2;

        if (numPoints >= 3 && Math.hypot(pos.x - startX, pos.y - startY) < 18) {
          const nextShapes = shapes.map((s) =>
            s.id === activePolygonId ? { ...s, isComplete: true } : s,
          );
          setShapes(nextShapes);
          saveHistory(nextShapes);
          setSelectedId(activePolygonId);
          setActivePolygonId(null);
          setActiveTool('select');
          return;
        }

        const nextPts = [...pts, pos.x, pos.y];
        setShapes((prev) =>
          prev.map((s) =>
            s.id === activePolygonId ? { ...s, points: nextPts } : s,
          ),
        );
      }
      return;
    }

    const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Arrow (Solid / Dashed)
    if (activeTool === 'arrow_solid' || activeTool === 'arrow_dash') {
      const isDash = activeTool === 'arrow_dash';
      const shape: ShapeData = {
        id,
        type: 'arrow',
        points: [pos.x, pos.y, pos.x, pos.y],
        color: '#ffffff',
        strokeWidth: 4,
        dash: isDash ? [16, 14] : [],
        opacity: 1.0,
        isCurved: false,
      };
      setIsDrawing(true);
      setNewShape(shape);
    }
    // Zone (Rect / Ellipse)
    else if (activeTool === 'zone_circle') {
      const shape: ShapeData = {
        id,
        type: 'zone',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        zoneShape: 'rect',
        color: '#22c55e',
        strokeWidth: 4,
        dash: [],
        opacity: 1.0,
        fillOpacity: 0.3,
      };
      setIsDrawing(true);
      setNewShape(shape);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getCanvasPointerPos(stage);
    if (!pos) return;

    if (activePolygonId) {
      setMousePreviewPos(pos);
    }

    if (connectingMarkerId) {
      let nearest: string | null = null;
      let minDist = 40;
      for (const s of shapes) {
        if (
          s.type === 'marker' &&
          s.id !== connectingMarkerId &&
          s.x !== undefined &&
          s.y !== undefined
        ) {
          const sz = s.markerSize || MARKER_DEFAULT_SIZE;
          const mcx = s.x + sz / 2;
          const mcy = s.y + sz / 2;
          const d = Math.hypot(pos.x - mcx, pos.y - mcy);
          if (d < sz / 2 + 30 && d < minDist) {
            minDist = d;
            nearest = s.id;
          }
        }
      }
      setHoveredMarkerId(nearest);
    }

    // Custom rotation dragging
    if (isRotatingRef.current && selectedId && selectedNodeRef.current) {
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

    // Hover: corner rotate zone detection
    const selectedShape = shapes.find((s) => s.id === selectedId);
    if (activeTool === 'select' && selectedShape?.type === 'zone') {
      const container = containerRef.current;
      if (container) {
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
      const nextShapes = [...shapes, createdShape];
      setShapes(nextShapes);
      saveHistory(nextShapes);
      setSelectedId(createdShape.id);
      setActiveTool('select');
    }
    setNewShape(null);
  };

  const handleShapeClick = (
    shape: ShapeData,
    node: any,
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (e.target.name() === 'control-handle') return;
    e.cancelBubble = true;

    if (activeTool === 'eraser') {
      deleteShapeWithChildren(shape.id);
      return;
    }

    if (activeTool === 'select') {
      setSelectedId(shape.id);
      selectedNodeRef.current = node;
    }
  };

  // Zero-lag real-time marker dragging and sync
  const handleMarkerDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    dragMarkerStartPos.current = { x: e.target.x(), y: e.target.y() };
  };

  const handleMarkerDragMove = (
    markerId: string,
    e: Konva.KonvaEventObject<DragEvent>,
  ) => {
    const curX = e.target.x();
    const curY = e.target.y();
    const dx = curX - dragMarkerStartPos.current.x;
    const dy = curY - dragMarkerStartPos.current.y;

    const marker = shapes.find((s) => s.id === markerId);
    if (!marker) return;
    const tempMarker = { ...marker, x: curX, y: curY };

    // Update child nodes in real-time
    for (const s of shapes) {
      if (s.targetMarkerId === markerId) {
        const node = shapeNodesRef.current.get(s.id);
        if (node) {
          node.position({ x: dx, y: dy });
        }
      }
      if (s.type === 'marker_connector') {
        if (s.startMarkerId === markerId || s.endMarkerId === markerId) {
          const startM =
            s.startMarkerId === markerId
              ? tempMarker
              : shapes.find((m) => m.id === s.startMarkerId);
          const endM =
            s.endMarkerId === markerId
              ? tempMarker
              : shapes.find((m) => m.id === s.endMarkerId);
          if (startM && endM) {
            const pts = getConnectorPoints(startM, endM);
            const lineNode = shapeNodesRef.current.get(s.id) as
              | Konva.Group
              | undefined;
            if (lineNode) {
              const lines = lineNode.find('Line');
              for (const l of lines) {
                (l as Konva.Line).points(pts);
              }
            }
          }
        }
      }
    }

    e.target.getLayer()?.batchDraw();
  };

  const handleMarkerDragEnd = (
    markerId: string,
    newX: number,
    newY: number,
  ) => {
    const oldMarker = shapes.find((s) => s.id === markerId);
    if (!oldMarker || oldMarker.x === undefined || oldMarker.y === undefined)
      return;

    const dx = newX - oldMarker.x;
    const dy = newY - oldMarker.y;

    // Reset temporary positions on Konva nodes
    for (const s of shapes) {
      if (s.targetMarkerId === markerId) {
        const node = shapeNodesRef.current.get(s.id);
        if (node) {
          node.position({ x: 0, y: 0 });
        }
      }
    }

    const updatedMarker = { ...oldMarker, x: newX, y: newY };

    const nextShapes = shapes.map((s) => {
      if (s.id === markerId) {
        return updatedMarker;
      }
      if (s.targetMarkerId === markerId) {
        if (s.points) {
          return {
            ...s,
            points: s.points.map((val, idx) =>
              idx % 2 === 0 ? val + dx : val + dy,
            ),
            controlPoint: s.controlPoint
              ? { x: s.controlPoint.x + dx, y: s.controlPoint.y + dy }
              : undefined,
          };
        }
        if (s.x !== undefined && s.y !== undefined) {
          return { ...s, x: s.x + dx, y: s.y + dy };
        }
      }
      if (s.type === 'marker_connector') {
        const startM =
          s.startMarkerId === markerId
            ? updatedMarker
            : shapes.find((m) => m.id === s.startMarkerId);
        const endM =
          s.endMarkerId === markerId
            ? updatedMarker
            : shapes.find((m) => m.id === s.endMarkerId);
        if (startM && endM) {
          return {
            ...s,
            points: getConnectorPoints(startM, endM),
          };
        }
      }
      return s;
    });

    setShapes(nextShapes);
    saveHistory(nextShapes);
  };

  const handleShapeChange = useCallback(
    (newProps: Partial<ShapeProperties>) => {
      if (!selectedId) return;
      const { type: _ignoredType, ...restProps } = newProps;
      const nextShapes = shapes.map((s) =>
        s.id === selectedId ? { ...s, ...restProps } : s,
      );
      setShapes(nextShapes);
      saveHistory(nextShapes);
    },
    [selectedId, shapes, saveHistory],
  );

  // ---------------------------------------------------------------------------
  // Floating Marker Actions
  // ---------------------------------------------------------------------------
  const selectedShape = shapes.find((s) => s.id === selectedId);

  // 1. Add Solid Arrow from Marker (Default: White)
  const handleAddMarkerArrowSolid = () => {
    if (!selectedShape || selectedShape.type !== 'marker') return;
    const id = `m-arrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const arrowShape: ShapeData = {
      id,
      type: 'marker_arrow_solid',
      color: '#ffffff',
      strokeWidth: 6,
      dash: [],
      opacity: 1.0,
      targetMarkerId: selectedShape.id,
      arrowAngle: -Math.PI / 2,
      arrowLength: MARKER_ARROW_DEFAULT_LENGTH,
      arrowBend: 0,
    };
    const nextShapes = [...shapes, arrowShape];
    setShapes(nextShapes);
    saveHistory(nextShapes);
    setSelectedId(id);
  };

  // 2. Add Dashed Arrow from Marker (Default: White)
  const handleAddMarkerArrowDash = () => {
    if (!selectedShape || selectedShape.type !== 'marker') return;
    const id = `m-dash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const arrowShape: ShapeData = {
      id,
      type: 'marker_arrow_dash',
      color: '#ffffff',
      strokeWidth: 6,
      dash: [16, 14],
      opacity: 1.0,
      targetMarkerId: selectedShape.id,
      arrowAngle: -Math.PI / 2,
      arrowLength: MARKER_ARROW_DEFAULT_LENGTH,
      arrowBend: 0,
    };
    const nextShapes = [...shapes, arrowShape];
    setShapes(nextShapes);
    saveHistory(nextShapes);
    setSelectedId(id);
  };

  // 3. Add Man Mark from Marker (●─●)
  const handleAddMarkerManMark = () => {
    if (!selectedShape || selectedShape.type !== 'marker') return;
    const id = `m-mark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const manMark: ShapeData = {
      id,
      type: 'marker_man_mark',
      color: selectedShape.color,
      strokeWidth: 3,
      dash: [],
      opacity: 1.0,
      targetMarkerId: selectedShape.id,
      arrowAngle: 0,
      arrowLength: 135,
      arrowBend: 0,
    };
    const nextShapes = [...shapes, manMark];
    setShapes(nextShapes);
    saveHistory(nextShapes);
    setSelectedId(id);
  };

  // 4. Add FOV from Marker
  const handleAddMarkerFov = () => {
    if (
      !selectedShape ||
      selectedShape.type !== 'marker' ||
      selectedShape.x === undefined ||
      selectedShape.y === undefined
    )
      return;
    const size = selectedShape.markerSize || MARKER_DEFAULT_SIZE;
    const cx = selectedShape.x + size / 2;
    const cy = selectedShape.y + size / 2;

    const id = `m-fov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fov: ShapeData = {
      id,
      type: 'marker_fov',
      x: cx,
      y: cy,
      fovDirection: -Math.PI / 2,
      fovAngle: MARKER_FOV_DEFAULT_ANGLE,
      fovLength: MARKER_FOV_DEFAULT_LENGTH,
      color: selectedShape.color,
      strokeWidth: 2,
      dash: [],
      opacity: 0.85,
      fillOpacity: 0.2,
      targetMarkerId: selectedShape.id,
    };
    const nextShapes = [...shapes, fov];
    setShapes(nextShapes);
    saveHistory(nextShapes);
    setSelectedId(id);
  };

  // 5. Start Connector Mode
  const handleStartConnector = () => {
    if (!selectedShape || selectedShape.type !== 'marker') return;
    setConnectingMarkerId(selectedShape.id);
  };

  // 6. Toggle Spotlight
  const handleToggleSpotlight = () => {
    if (!selectedShape || selectedShape.type !== 'marker') return;
    handleShapeChange({ isSpotlight: !selectedShape.isSpotlight });
  };

  // Screen Position for FloatingMarkerToolbar
  const markerScreenPos =
    selectedShape?.type === 'marker' &&
    selectedShape.x !== undefined &&
    selectedShape.y !== undefined
      ? {
          x:
            originX +
            (selectedShape.x +
              (selectedShape.markerSize || MARKER_DEFAULT_SIZE)) *
              fitScale +
            18,
          y:
            originY +
            (selectedShape.y +
              (selectedShape.markerSize || MARKER_DEFAULT_SIZE) / 2) *
              fitScale,
        }
      : null;

  // Selected shape properties for style panel
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-950 flex items-center justify-center select-none"
      style={{ pointerEvents: 'auto' }}
    >
      {stageW > 0 && stageH > 0 && (
        <Stage
          ref={(node) => {
            stageRef.current = node;
          }}
          width={stageW}
          height={stageH}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDblClick={() => {
            if (activePolygonId) {
              const poly = shapes.find((s) => s.id === activePolygonId);
              if (poly?.points && poly.points.length >= 6) {
                const nextShapes = shapes.map((s) =>
                  s.id === activePolygonId ? { ...s, isComplete: true } : s,
                );
                setShapes(nextShapes);
                saveHistory(nextShapes);
                setSelectedId(activePolygonId);
              } else {
                setShapes((prev) =>
                  prev.filter((s) => s.id !== activePolygonId),
                );
              }
              setActivePolygonId(null);
              setActiveTool('select');
            }
          }}
        >
          {/* Main Drawing Layer centered on screen */}
          <Layer x={originX} y={originY} scaleX={fitScale} scaleY={fitScale}>
            {/* Background Screenshot Image */}
            {backgroundImage && imageSize.w > 0 && (
              <KonvaImage
                name="bg-image"
                image={backgroundImage}
                x={0}
                y={0}
                width={imageSize.w}
                height={imageSize.h}
                listening={activeTool === 'select'}
              />
            )}

            {/* Canvas Mask & Interactive Cropping Trimming Frame */}
            {captureFrame && (
              <Group>
                {/* 4 Outer Dimming Masks */}
                <Rect
                  x={-10000}
                  y={-10000}
                  width={20000}
                  height={10000 + captureFrame.y}
                  fill="rgba(0, 0, 0, 0.45)"
                  listening={false}
                />
                <Rect
                  x={-10000}
                  y={captureFrame.y + captureFrame.h}
                  width={20000}
                  height={10000}
                  fill="rgba(0, 0, 0, 0.45)"
                  listening={false}
                />
                <Rect
                  x={-10000}
                  y={captureFrame.y}
                  width={10000 + captureFrame.x}
                  height={captureFrame.h}
                  fill="rgba(0, 0, 0, 0.45)"
                  listening={false}
                />
                <Rect
                  x={captureFrame.x + captureFrame.w}
                  y={captureFrame.y}
                  width={10000}
                  height={captureFrame.h}
                  fill="rgba(0, 0, 0, 0.45)"
                  listening={false}
                />

                {/* Trimming Border */}
                <Rect
                  x={captureFrame.x}
                  y={captureFrame.y}
                  width={captureFrame.w}
                  height={captureFrame.h}
                  stroke="#ffffff"
                  strokeWidth={2}
                  dash={[8, 4]}
                  listening={false}
                />

                {/* Trimming Corner Handles */}
                {/* Top-Left */}
                <Rect
                  x={captureFrame.x - 7}
                  y={captureFrame.y - 7}
                  width={14}
                  height={14}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  cornerRadius={2}
                  draggable
                  onMouseEnter={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'nwse-resize';
                  }}
                  onMouseLeave={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'default';
                  }}
                  onDragMove={(e) => {
                    const maxRight = captureFrame.x + captureFrame.w - 50;
                    const maxBottom = captureFrame.y + captureFrame.h - 50;
                    const nx = Math.max(
                      0,
                      Math.min(e.target.x() + 7, maxRight),
                    );
                    const ny = Math.max(
                      0,
                      Math.min(e.target.y() + 7, maxBottom),
                    );
                    const nw = captureFrame.x + captureFrame.w - nx;
                    const nh = captureFrame.y + captureFrame.h - ny;
                    setCaptureFrame({ x: nx, y: ny, w: nw, h: nh });
                  }}
                  onDragEnd={(e) => {
                    e.target.position({
                      x: captureFrame.x - 7,
                      y: captureFrame.y - 7,
                    });
                  }}
                />

                {/* Top-Right */}
                <Rect
                  x={captureFrame.x + captureFrame.w - 7}
                  y={captureFrame.y - 7}
                  width={14}
                  height={14}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  cornerRadius={2}
                  draggable
                  onMouseEnter={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'nesw-resize';
                  }}
                  onMouseLeave={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'default';
                  }}
                  onDragMove={(e) => {
                    const maxW = imageSize.w || 2000;
                    const maxBottom = captureFrame.y + captureFrame.h - 50;
                    const rX = Math.min(
                      maxW,
                      Math.max(e.target.x() + 7, captureFrame.x + 50),
                    );
                    const ny = Math.max(
                      0,
                      Math.min(e.target.y() + 7, maxBottom),
                    );
                    const nw = rX - captureFrame.x;
                    const nh = captureFrame.y + captureFrame.h - ny;
                    setCaptureFrame({ x: captureFrame.x, y: ny, w: nw, h: nh });
                  }}
                  onDragEnd={(e) => {
                    e.target.position({
                      x: captureFrame.x + captureFrame.w - 7,
                      y: captureFrame.y - 7,
                    });
                  }}
                />

                {/* Bottom-Left */}
                <Rect
                  x={captureFrame.x - 7}
                  y={captureFrame.y + captureFrame.h - 7}
                  width={14}
                  height={14}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  cornerRadius={2}
                  draggable
                  onMouseEnter={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'nesw-resize';
                  }}
                  onMouseLeave={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'default';
                  }}
                  onDragMove={(e) => {
                    const maxRight = captureFrame.x + captureFrame.w - 50;
                    const maxH = imageSize.h || 2000;
                    const nx = Math.max(
                      0,
                      Math.min(e.target.x() + 7, maxRight),
                    );
                    const bY = Math.min(
                      maxH,
                      Math.max(e.target.y() + 7, captureFrame.y + 50),
                    );
                    const nw = captureFrame.x + captureFrame.w - nx;
                    const nh = bY - captureFrame.y;
                    setCaptureFrame({ x: nx, y: captureFrame.y, w: nw, h: nh });
                  }}
                  onDragEnd={(e) => {
                    e.target.position({
                      x: captureFrame.x - 7,
                      y: captureFrame.y + captureFrame.h - 7,
                    });
                  }}
                />

                {/* Bottom-Right */}
                <Rect
                  x={captureFrame.x + captureFrame.w - 7}
                  y={captureFrame.y + captureFrame.h - 7}
                  width={14}
                  height={14}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  cornerRadius={2}
                  draggable
                  onMouseEnter={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'nwse-resize';
                  }}
                  onMouseLeave={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'default';
                  }}
                  onDragMove={(e) => {
                    const maxW = imageSize.w || 2000;
                    const maxH = imageSize.h || 2000;
                    const rX = Math.min(
                      maxW,
                      Math.max(e.target.x() + 7, captureFrame.x + 50),
                    );
                    const bY = Math.min(
                      maxH,
                      Math.max(e.target.y() + 7, captureFrame.y + 50),
                    );
                    const nw = rX - captureFrame.x;
                    const nh = bY - captureFrame.y;
                    setCaptureFrame({
                      x: captureFrame.x,
                      y: captureFrame.y,
                      w: nw,
                      h: nh,
                    });
                  }}
                  onDragEnd={(e) => {
                    e.target.position({
                      x: captureFrame.x + captureFrame.w - 7,
                      y: captureFrame.y + captureFrame.h - 7,
                    });
                  }}
                />
              </Group>
            )}

            {/* Render All Shapes */}
            {allShapesToRender.map((shape) => {
              const isSelected = shape.id === selectedId;

              // ---------------------------------------------------------------
              // 1. Football 3D Perspective Player Marker
              // ---------------------------------------------------------------
              if (
                shape.type === 'marker' &&
                shape.x !== undefined &&
                shape.y !== undefined
              ) {
                const size = shape.markerSize || MARKER_DEFAULT_SIZE;
                const scale = size / MARKER_SVG_SIZE;
                const color = shape.color;
                const isHoveredInConnector = shape.id === hoveredMarkerId;

                return (
                  <Group
                    key={shape.id}
                    ref={(node) => {
                      if (isSelected && node) selectedNodeRef.current = node;
                    }}
                    x={shape.x}
                    y={shape.y}
                    width={size}
                    height={size}
                    draggable={activeTool === 'select'}
                    onClick={(e) => handleShapeClick(shape, e.currentTarget, e)}
                    onTap={(e) => handleShapeClick(shape, e.currentTarget, e)}
                    onDragStart={handleMarkerDragStart}
                    onDragMove={(e) => handleMarkerDragMove(shape.id, e)}
                    onDragEnd={(e) => {
                      handleMarkerDragEnd(shape.id, e.target.x(), e.target.y());
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);
                      const uniformScale = Math.max(scaleX, scaleY);
                      const newSize = Math.max(
                        30,
                        Math.round(size * uniformScale),
                      );
                      const newX = node.x();
                      const newY = node.y();

                      const nextShapes = shapes.map((s) =>
                        s.id === shape.id
                          ? { ...s, x: newX, y: newY, markerSize: newSize }
                          : s,
                      );
                      setShapes(nextShapes);
                      saveHistory(nextShapes);
                    }}
                  >
                    {/* Transparent Full-Hit Box for Reliable Clicks */}
                    <Rect
                      width={size}
                      height={size}
                      fill="rgba(0, 0, 0, 0.001)"
                      hitStrokeWidth={10}
                    />

                    {/* Spotlight Pillar (Width x1.3, Height x1.5, slightly raised opacity) */}
                    {shape.isSpotlight && (
                      <Group
                        x={size / 2 - 31.35 * scale * 1.3}
                        y={size / 2 - 96 * scale * 1.5}
                        scaleX={scale * 1.3}
                        scaleY={scale * 1.5}
                        listening={false}
                      >
                        <Path
                          data={SPOTLIGHT_BEAM_PATH}
                          fill="#ffffff"
                          opacity={0.11}
                          shadowColor="#ffffff"
                          shadowBlur={10}
                          shadowOpacity={0.22}
                        />
                      </Group>
                    )}

                    {/* Connector Hinting Highlight */}
                    {isHoveredInConnector && (
                      <Ellipse
                        x={size / 2}
                        y={size / 2 + 2 * scale}
                        radiusX={MARKER_RING_RX * scale + 8}
                        radiusY={MARKER_RING_RY * scale + 6}
                        stroke="#10b981"
                        strokeWidth={3}
                        dash={[6, 4]}
                        listening={false}
                      />
                    )}

                    {/* Perspective Marker Ring (5 SVG Path Arcs) */}
                    <Group scaleX={scale} scaleY={scale} listening={false}>
                      {MARKER_PATHS.map((d) => (
                        <Path
                          key={`marker-arc-${d.slice(0, 12)}`}
                          data={d}
                          fill={color}
                          shadowColor={color}
                          shadowBlur={10}
                          shadowOpacity={0.7}
                        />
                      ))}
                      {/* Center Ellipse Core */}
                      <Ellipse
                        x={31.5}
                        y={31.5}
                        radiusX={21.5}
                        radiusY={4.5}
                        fill={color}
                        opacity={0.4}
                      />
                    </Group>
                  </Group>
                );
              }

              // ---------------------------------------------------------------
              // 2. FOV (Vision Cone / Fan attached to Marker)
              // ---------------------------------------------------------------
              if (shape.type === 'marker_fov') {
                const target = shapes.find(
                  (s) => s.id === shape.targetMarkerId,
                );
                const size = target?.markerSize || MARKER_DEFAULT_SIZE;
                const cx =
                  target && target.x !== undefined
                    ? target.x + size / 2
                    : (shape.x ?? 0);
                const cy =
                  target && target.y !== undefined
                    ? target.y + size / 2
                    : (shape.y ?? 0);
                const { rrx, rry } = getMarkerDimensions(size, size);

                const fovAngle = shape.fovAngle || MARKER_FOV_DEFAULT_ANGLE;
                const fovDir = shape.fovDirection || -Math.PI / 2;
                const fovLen = shape.fovLength || MARKER_FOV_DEFAULT_LENGTH;

                const { innerPoints, outerPoints, handle } = getFovLayoutPoints(
                  cx,
                  cy,
                  rrx,
                  rry,
                  { angle: fovAngle, direction: fovDir, length: fovLen },
                );

                const polyPoints: number[] = [];
                for (const p of innerPoints) {
                  polyPoints.push(p.x, p.y);
                }
                const reversedOuter = [...outerPoints].reverse();
                for (const p of reversedOuter) {
                  polyPoints.push(p.x, p.y);
                }

                const hexColor = shape.color.replace('#', '');
                const r = parseInt(hexColor.substring(0, 2), 16) || 3;
                const g = parseInt(hexColor.substring(2, 4), 16) || 70;
                const b = parseInt(hexColor.substring(4, 6), 16) || 148;
                const fillRGBA = `rgba(${r}, ${g}, ${b}, ${shape.fillOpacity ?? 0.2})`;

                return (
                  <Group
                    key={shape.id}
                    ref={(node) => {
                      if (node) shapeNodesRef.current.set(shape.id, node);
                      else shapeNodesRef.current.delete(shape.id);
                    }}
                  >
                    <Line
                      points={polyPoints}
                      closed
                      fill={fillRGBA}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth || 2}
                      opacity={shape.opacity || 0.85}
                      onClick={(e) => handleShapeClick(shape, e.target, e)}
                      onTap={(e) => handleShapeClick(shape, e.target, e)}
                    />

                    {/* FOV Drag Handle */}
                    {isSelected && activeTool === 'select' && (
                      <Circle
                        name="control-handle"
                        x={handle.x}
                        y={handle.y}
                        radius={7}
                        hitStrokeWidth={20}
                        fill="#ffffff"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        draggable
                        onDragStart={(e) => {
                          e.cancelBubble = true;
                        }}
                        onDragMove={(e) => {
                          e.cancelBubble = true;
                          const hx = e.target.x();
                          const hy = e.target.y();
                          const dx = hx - cx;
                          const dy = hy - cy;
                          const newLen = Math.max(30, Math.hypot(dx, dy) - rrx);
                          const newDir = Math.atan2(dy, dx);
                          const nextShapes = shapes.map((s) =>
                            s.id === shape.id
                              ? {
                                  ...s,
                                  fovDirection: newDir,
                                  fovLength: newLen,
                                }
                              : s,
                          );
                          setShapes(nextShapes);
                        }}
                        onDragEnd={(e) => {
                          e.cancelBubble = true;
                          saveHistory(shapes);
                        }}
                      />
                    )}
                  </Group>
                );
              }

              // ---------------------------------------------------------------
              // 3. Marker Attached Arrows & Man Mark (Revolving smoothly around marker ring)
              // ---------------------------------------------------------------
              if (
                shape.type === 'marker_arrow_solid' ||
                shape.type === 'marker_arrow_dash' ||
                shape.type === 'marker_man_mark'
              ) {
                const target = shapes.find(
                  (s) => s.id === shape.targetMarkerId,
                );
                const size = target?.markerSize || MARKER_DEFAULT_SIZE;
                const cx =
                  target && target.x !== undefined
                    ? target.x + size / 2
                    : (shape.x ?? 0);
                const cy =
                  target && target.y !== undefined
                    ? target.y + size / 2
                    : (shape.y ?? 0);
                const { rrx, rry } = getMarkerDimensions(size, size);

                const { start, end, cp, bendPoint } = getArrowLayout(
                  cx,
                  cy,
                  rrx,
                  rry,
                  {
                    angle: shape.arrowAngle,
                    length: shape.arrowLength,
                    bend: shape.arrowBend,
                  },
                );

                const isDashed = shape.type === 'marker_arrow_dash';
                const isManMark = shape.type === 'marker_man_mark';
                const isCurved = Math.abs(shape.arrowBend || 0) > 2;

                let renderPoints: number[];
                if (isCurved) {
                  renderPoints = getQuadraticBezierPoints(
                    start.x,
                    start.y,
                    cp.x,
                    cp.y,
                    end.x,
                    end.y,
                  );
                } else {
                  renderPoints = [start.x, start.y, end.x, end.y];
                }

                return (
                  <Group
                    key={shape.id}
                    ref={(node) => {
                      if (node) shapeNodesRef.current.set(shape.id, node);
                      else shapeNodesRef.current.delete(shape.id);
                    }}
                  >
                    {isManMark ? (
                      <>
                        <Line
                          points={renderPoints}
                          stroke={shape.color}
                          strokeWidth={shape.strokeWidth || 3}
                          lineCap="round"
                          hitStrokeWidth={25}
                          onClick={(e) => handleShapeClick(shape, e.target, e)}
                          onTap={(e) => handleShapeClick(shape, e.target, e)}
                        />
                        <Circle
                          x={start.x}
                          y={start.y}
                          radius={4.5}
                          fill={shape.color}
                          listening={false}
                        />
                        <Circle
                          x={end.x}
                          y={end.y}
                          radius={4.5}
                          fill={shape.color}
                          listening={false}
                        />
                      </>
                    ) : (
                      <Arrow
                        points={renderPoints}
                        stroke={shape.color}
                        fill={shape.color}
                        strokeWidth={shape.strokeWidth || 6}
                        dash={isDashed ? [16, 14] : []}
                        opacity={shape.opacity || 1.0}
                        pointerLength={28}
                        pointerWidth={24}
                        lineCap="round"
                        lineJoin="round"
                        hitStrokeWidth={30}
                        onClick={(e) => handleShapeClick(shape, e.target, e)}
                        onTap={(e) => handleShapeClick(shape, e.target, e)}
                      />
                    )}

                    {/* Interactive End & Bend Handles revolving around Marker */}
                    {isSelected && activeTool === 'select' && (
                      <>
                        {/* Endpoint Handle */}
                        <Circle
                          name="control-handle"
                          x={end.x}
                          y={end.y}
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
                            const hx = e.target.x();
                            const hy = e.target.y();
                            const newAngle = Math.atan2(hy - cy, hx - cx);
                            const startX = cx + rrx * Math.cos(newAngle);
                            const startY = cy + rry * Math.sin(newAngle);
                            const newLen = Math.max(
                              20,
                              Math.hypot(hx - startX, hy - startY),
                            );

                            const nextShapes = shapes.map((s) =>
                              s.id === shape.id
                                ? {
                                    ...s,
                                    arrowAngle: newAngle,
                                    arrowLength: newLen,
                                  }
                                : s,
                            );
                            setShapes(nextShapes);
                          }}
                          onDragEnd={(e) => {
                            e.cancelBubble = true;
                            const c = e.target.getStage()?.container();
                            if (c) c.style.cursor = 'grab';
                            saveHistory(shapes);
                          }}
                        />

                        {/* Bezier Bend Handle */}
                        <Circle
                          name="control-handle"
                          x={bendPoint.x}
                          y={bendPoint.y}
                          radius={6}
                          hitStrokeWidth={20}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth={2}
                          draggable
                          onDragStart={(e) => {
                            e.cancelBubble = true;
                          }}
                          onDragMove={(e) => {
                            e.cancelBubble = true;
                            const hx = e.target.x();
                            const hy = e.target.y();
                            const mx = (start.x + end.x) / 2;
                            const my = (start.y + end.y) / 2;
                            const nx =
                              -(end.y - start.y) / (shape.arrowLength || 80);
                            const ny =
                              (end.x - start.x) / (shape.arrowLength || 80);
                            const bend = (hx - mx) * nx + (hy - my) * ny;

                            const nextShapes = shapes.map((s) =>
                              s.id === shape.id ? { ...s, arrowBend: bend } : s,
                            );
                            setShapes(nextShapes);
                          }}
                          onDragEnd={(e) => {
                            e.cancelBubble = true;
                            saveHistory(shapes);
                          }}
                        />
                      </>
                    )}
                  </Group>
                );
              }

              // ---------------------------------------------------------------
              // 4. Marker Connector (Glow link line connecting Marker perimeters)
              // ---------------------------------------------------------------
              if (shape.type === 'marker_connector') {
                const startM = shapes.find((m) => m.id === shape.startMarkerId);
                const endM = shapes.find((m) => m.id === shape.endMarkerId);
                const connPoints =
                  startM && endM
                    ? getConnectorPoints(startM, endM)
                    : shape.points || [0, 0, 0, 0];

                return (
                  <Group
                    key={shape.id}
                    ref={(node) => {
                      if (node) shapeNodesRef.current.set(shape.id, node);
                      else shapeNodesRef.current.delete(shape.id);
                    }}
                  >
                    <Line
                      points={connPoints}
                      stroke="#ffffff"
                      strokeWidth={(shape.strokeWidth || 5) + 4}
                      opacity={0.35}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={connPoints}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth || 5}
                      lineCap="round"
                      hitStrokeWidth={25}
                      onClick={(e) => handleShapeClick(shape, e.target, e)}
                      onTap={(e) => handleShapeClick(shape, e.target, e)}
                    />
                  </Group>
                );
              }

              // ---------------------------------------------------------------
              // 5. Normal Arrow (Solid / Dashed on Canvas)
              // ---------------------------------------------------------------
              if (shape.type === 'arrow' && shape.points) {
                const arrowPts = shape.points;
                const isCurved = shape.isCurved;
                const isDashed = shape.dash && shape.dash.length > 0;

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
                  <Group
                    key={shape.id}
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

                      const newPoints = [
                        arrowPts[0] + dx,
                        arrowPts[1] + dy,
                        arrowPts[2] + dx,
                        arrowPts[3] + dy,
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
                        if (node && isSelected) selectedNodeRef.current = node;
                      }}
                      points={renderPoints}
                      stroke={shape.color}
                      fill={shape.color}
                      strokeWidth={shape.strokeWidth || 4}
                      dash={isDashed ? [16, 14] : []}
                      opacity={shape.opacity || 1.0}
                      pointerLength={28}
                      pointerWidth={24}
                      tension={0}
                      lineCap="round"
                      lineJoin="round"
                      hitStrokeWidth={30}
                      onClick={(e) => handleShapeClick(shape, e.target, e)}
                      onTap={(e) => handleShapeClick(shape, e.target, e)}
                    />

                    {/* Custom Arrow Control Handles */}
                    {isSelected && activeTool === 'select' && (
                      <>
                        <Circle
                          name="control-handle"
                          x={arrowPts[0]}
                          y={arrowPts[1]}
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
                            const arrowNode =
                              selectedNodeRef.current as Konva.Arrow | null;
                            if (arrowNode) {
                              if (isCurved) {
                                const pts = getQuadraticBezierPoints(
                                  newX,
                                  newY,
                                  cpX,
                                  cpY,
                                  arrowPts[2],
                                  arrowPts[3],
                                );
                                arrowNode.points(pts);
                              } else {
                                arrowNode.points([
                                  newX,
                                  newY,
                                  arrowPts[2],
                                  arrowPts[3],
                                ]);
                              }
                              arrowNode.getLayer()?.batchDraw();
                            }
                          }}
                          onDragEnd={(e) => {
                            e.cancelBubble = true;
                            const c = e.target.getStage()?.container();
                            if (c) c.style.cursor = 'grab';
                            const newX = e.target.x();
                            const newY = e.target.y();
                            const nextShapes = shapes.map((s) =>
                              s.id === shape.id
                                ? {
                                    ...s,
                                    points: [
                                      newX,
                                      newY,
                                      arrowPts[2],
                                      arrowPts[3],
                                    ],
                                  }
                                : s,
                            );
                            saveHistory(nextShapes);
                            setShapes(nextShapes);
                          }}
                        />

                        <Circle
                          name="control-handle"
                          x={arrowPts[2]}
                          y={arrowPts[3]}
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
                            const arrowNode =
                              selectedNodeRef.current as Konva.Arrow | null;
                            if (arrowNode) {
                              if (isCurved) {
                                const pts = getQuadraticBezierPoints(
                                  arrowPts[0],
                                  arrowPts[1],
                                  cpX,
                                  cpY,
                                  newX,
                                  newY,
                                );
                                arrowNode.points(pts);
                              } else {
                                arrowNode.points([
                                  arrowPts[0],
                                  arrowPts[1],
                                  newX,
                                  newY,
                                ]);
                              }
                              arrowNode.getLayer()?.batchDraw();
                            }
                          }}
                          onDragEnd={(e) => {
                            e.cancelBubble = true;
                            const c = e.target.getStage()?.container();
                            if (c) c.style.cursor = 'grab';
                            const newX = e.target.x();
                            const newY = e.target.y();
                            const nextShapes = shapes.map((s) =>
                              s.id === shape.id
                                ? {
                                    ...s,
                                    points: [
                                      arrowPts[0],
                                      arrowPts[1],
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
                              const newCpX = e.target.x();
                              const newCpY = e.target.y();
                              const arrowNode =
                                selectedNodeRef.current as Konva.Arrow | null;
                              if (arrowNode) {
                                const pts = getQuadraticBezierPoints(
                                  arrowPts[0],
                                  arrowPts[1],
                                  newCpX,
                                  newCpY,
                                  arrowPts[2],
                                  arrowPts[3],
                                );
                                arrowNode.points(pts);
                                arrowNode.getLayer()?.batchDraw();
                              }
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'grab';
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

              // ---------------------------------------------------------------
              // 6. Zone (Rect / Ellipse)
              // ---------------------------------------------------------------
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
                const r = parseInt(hexColor.substring(0, 2), 16) || 34;
                const g = parseInt(hexColor.substring(2, 4), 16) || 197;
                const b = parseInt(hexColor.substring(4, 6), 16) || 94;
                const fillRGBA = `rgba(${r}, ${g}, ${b}, ${shape.fillOpacity ?? 0.35})`;

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

              // ---------------------------------------------------------------
              // 7. Polygon Zone
              // ---------------------------------------------------------------
              if (shape.type === 'polygon_zone' && shape.points) {
                const pts = shape.points;
                const isComplete = shape.isComplete;
                const isCreatingThis = shape.id === activePolygonId;

                const hexColor = shape.color.replace('#', '');
                const r = parseInt(hexColor.substring(0, 2), 16) || 34;
                const g = parseInt(hexColor.substring(2, 4), 16) || 197;
                const b = parseInt(hexColor.substring(4, 6), 16) || 94;
                const fillRGBA = `rgba(${r}, ${g}, ${b}, ${isComplete ? (shape.fillOpacity ?? 0.35) : 0})`;

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
                      const nextShapes = shapes.map((s) =>
                        s.id === shape.id ? { ...s, points: newPts } : s,
                      );
                      saveHistory(nextShapes);
                      setShapes(nextShapes);
                    }}
                  >
                    <Line
                      points={renderPts}
                      closed={isComplete}
                      fill={fillRGBA}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth || 2}
                      dash={shape.dash}
                      opacity={shape.opacity || 1.0}
                      lineCap="round"
                      lineJoin="round"
                      hitStrokeWidth={20}
                      onClick={(e) => handleShapeClick(shape, e.target, e)}
                      onTap={(e) => handleShapeClick(shape, e.target, e)}
                    />

                    {/* Vertices dot indicators while drawing */}
                    {!isComplete &&
                      vertexPairs.map((v) => (
                        <Circle
                          key={`v-draw-${shape.id}-${v.x.toFixed(1)}-${v.y.toFixed(1)}`}
                          x={v.x}
                          y={v.y}
                          radius={v === vertexPairs[0] ? 7 : 4}
                          fill={v === vertexPairs[0] ? '#38bdf8' : '#ffffff'}
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
                          key={`v-handle-${shape.id}-${v.x.toFixed(1)}-${v.y.toFixed(1)}`}
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
                            const c = e.target.getStage()?.container();
                            if (c) c.style.cursor = 'grab';
                            const newX = e.target.x();
                            const newY = e.target.y();
                            const nextPts = [...pts];
                            nextPts[idx * 2] = newX;
                            nextPts[idx * 2 + 1] = newY;
                            const nextShapes = shapes.map((s) =>
                              s.id === shape.id ? { ...s, points: nextPts } : s,
                            );
                            saveHistory(nextShapes);
                            setShapes(nextShapes);
                          }}
                        />
                      ))}
                  </Group>
                );
              }

              return null;
            })}

            {/* Transformer (Zone & Marker resize) */}
            {activeTool === 'select' &&
              selectedShape &&
              (selectedShape.type === 'zone' ||
                selectedShape.type === 'marker') && (
                <Transformer
                  ref={(node) => {
                    transformerRef.current = node;
                  }}
                  rotateEnabled={false}
                  keepRatio={selectedShape.type === 'marker'}
                  padding={selectedShape.type === 'marker' ? 10 : 0}
                  borderStroke="#38bdf8"
                  borderDash={[4, 4]}
                  anchorFill="#ffffff"
                  anchorStroke="#38bdf8"
                  anchorSize={10}
                  anchorCornerRadius={2}
                  enabledAnchors={
                    selectedShape.type === 'marker'
                      ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                      : [
                          'top-left',
                          'top-center',
                          'top-right',
                          'middle-left',
                          'middle-right',
                          'bottom-left',
                          'bottom-center',
                          'bottom-right',
                        ]
                  }
                  anchorStyleFunc={(anchor) => {
                    if (anchor.hasName('rotater')) {
                      anchor.visible(false);
                    }
                  }}
                />
              )}
          </Layer>
        </Stage>
      )}

      {/* Floating Marker Toolbar (Attached to the right of selected marker) */}
      {markerScreenPos && (
        <FloatingMarkerToolbar
          position={markerScreenPos}
          color={selectedShape?.color || '#034694'}
          isSpotlight={Boolean(selectedShape?.isSpotlight)}
          onAddArrowSolid={handleAddMarkerArrowSolid}
          onAddArrowDash={handleAddMarkerArrowDash}
          onAddManMark={handleAddMarkerManMark}
          onAddFov={handleAddMarkerFov}
          onAddConnector={handleStartConnector}
          onToggleSpotlight={handleToggleSpotlight}
          onColorChange={(c) => handleShapeChange({ color: c })}
          onDelete={() => {
            if (selectedShape) deleteShapeWithChildren(selectedShape.id);
          }}
        />
      )}

      {/* Main Toolbar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-1 p-1 bg-neutral-900/90 backdrop-blur-2xl rounded-xl border border-white/10 shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-white/10',
          )}
          title="選択 (V)"
        >
          <MousePointer2 className="w-4 h-4" />
          <span className="hidden sm:inline">Select</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('arrow_solid')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTool === 'arrow_solid'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-white/10',
          )}
          title="実線矢印 (A)"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="hidden sm:inline">Arrow</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('arrow_dash')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTool === 'arrow_dash'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-white/10',
          )}
          title="点線矢印 (D)"
        >
          <MoveRight className="w-4 h-4" />
          <span className="hidden sm:inline">Dashed</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('zone_circle')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTool === 'zone_circle'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-white/10',
          )}
          title="ゾーン (Z)"
        >
          <Square className="w-4 h-4" />
          <span className="hidden sm:inline">Zone</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('polygon_zone')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTool === 'polygon_zone'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-white/10',
          )}
          title="多角形ゾーン (P: クリックで点を繋ぎ始点クリックまたはEnterで閉じる)"
        >
          <Hexagon className="w-4 h-4" />
          <span className="hidden sm:inline">Polygon</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('marker')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTool === 'marker'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-amber-400 hover:text-amber-300 hover:bg-white/10',
          )}
          title="選手マーカー (M)"
        >
          <UserCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Marker</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTool === 'eraser'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
              : 'text-neutral-400 hover:text-white hover:bg-white/10',
          )}
          title="消しゴム (E)"
        >
          <Eraser className="w-4 h-4" />
          <span className="hidden sm:inline">Eraser</span>
        </button>
      </div>

      {/* Style Panel */}
      <KonvaStylePanel
        properties={selectedProperties}
        onChange={handleShapeChange}
      />
    </div>
  );
};
