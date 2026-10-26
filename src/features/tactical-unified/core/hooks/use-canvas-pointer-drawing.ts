import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
import {
  commitDrawingShape,
  createRingMarker,
  createTextAnnotation,
} from '../utils/canvas-drawing-factory';
import { useCanvasStore } from './use-canvas-store';

export interface UseCanvasPointerDrawingOptions {
  vRect: { width: number; height: number };
}

export function useCanvasPointerDrawing({
  vRect,
}: UseCanvasPointerDrawingOptions) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const color = useCanvasStore((s) => s.color);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const drawingPreview = useCanvasStore((s) => s.drawingPreview);
  const setDrawingPreview = useCanvasStore((s) => s.setDrawingPreview);
  const addArrow = useCanvasStore((s) => s.addArrow);
  const addZone = useCanvasStore((s) => s.addZone);
  const addText = useCanvasStore((s) => s.addText);
  const addMarker = useCanvasStore((s) => s.addMarker);
  const markers = useCanvasStore((s) => s.annotations.markers);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  const getNormPos = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition() ?? { x: 0, y: 0 };
      const normX = vRect.width > 0 ? (pos.x / vRect.width) * 100 : 0;
      const normY = vRect.height > 0 ? (pos.y / vRect.height) * 100 : 0;
      return {
        normX: Math.max(0, Math.min(100, normX)),
        normY: Math.max(0, Math.min(100, normY)),
      };
    },
    [vRect.width, vRect.height],
  );

  const handlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool === 'select') {
        if (e.target === e.target.getStage()) clearSelection();
        return;
      }
      const { normX, normY } = getNormPos(e);
      if (['pass', 'dribble', 'zone'].includes(activeTool)) {
        setDrawingPreview({
          isDrawing: true,
          tool: activeTool,
          startX: normX,
          startY: normY,
          currentX: normX,
          currentY: normY,
        });
      } else if (activeTool === 'text') {
        addText(createTextAnnotation(normX, normY, '#ffffff'));
        setActiveTool('select');
      } else if (activeTool === 'player-ring') {
        addMarker(
          createRingMarker(normX, normY, '#3b82f6', `${markers.length + 1}`),
        );
        setActiveTool('select');
      }
    },
    [
      activeTool,
      getNormPos,
      clearSelection,
      setDrawingPreview,
      addText,
      addMarker,
      markers.length,
      color,
      setActiveTool,
    ],
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawingPreview?.isDrawing) return;
      const { normX, normY } = getNormPos(e);
      setDrawingPreview({
        ...drawingPreview,
        currentX: normX,
        currentY: normY,
      });
    },
    [drawingPreview, getNormPos, setDrawingPreview],
  );

  const handlePointerUp = useCallback(() => {
    if (!drawingPreview?.isDrawing) return;
    commitDrawingShape(drawingPreview, color, strokeWidth, addArrow, addZone);
    setDrawingPreview(null);
  }, [
    drawingPreview,
    color,
    strokeWidth,
    addArrow,
    addZone,
    setDrawingPreview,
  ]);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
