'use client';

import { useCallback } from 'react';
import type { Slide } from '@/lib/types/tactical-unified';
import { useCanvasPolygonZone } from './use-canvas-polygon-zone';
import { useCanvasQuickTools } from './use-canvas-quick-tools';
import { useCanvasShapeDrawing } from './use-canvas-shape-drawing';

interface UseCanvasDrawingInteractionOptions {
  effectivePitch: { x: number; y: number; width: number; height: number };
  activeSlide: Slide | null | undefined;
  activeSlideId: string;
  setEditingTextId: (id: string | null) => void;
}

export function useCanvasDrawingInteraction({
  effectivePitch,
  activeSlide,
  activeSlideId,
  setEditingTextId,
}: UseCanvasDrawingInteractionOptions) {
  const quickTools = useCanvasQuickTools({
    activeSlideId,
    setEditingTextId,
  });

  const polygonZone = useCanvasPolygonZone({
    activeSlide,
    activeSlideId,
  });

  const shapeDrawing = useCanvasShapeDrawing({
    effectivePitch,
    activeSlideId,
  });

  const handlePointerDown = useCallback(
    (
      pitchPos: { x: number; y: number },
      normPos: { x: number; y: number },
    ): boolean => {
      if (quickTools.handlePointerDown(normPos)) return true;
      if (polygonZone.handlePointerDown(normPos)) return true;
      if (shapeDrawing.handlePointerDown(pitchPos)) return true;
      return false;
    },
    [quickTools, polygonZone, shapeDrawing],
  );

  const handlePointerMove = useCallback(
    (
      pitchPos: { x: number; y: number },
      normPos: { x: number; y: number },
    ): boolean => {
      const handledQuick = quickTools.handlePointerMove(normPos);
      polygonZone.handlePointerMove(pitchPos);
      const handledShape = shapeDrawing.handlePointerMove(pitchPos);
      return handledQuick || handledShape;
    },
    [quickTools, polygonZone, shapeDrawing],
  );

  const handlePointerUp = useCallback((): boolean => {
    const handledQuick = quickTools.handlePointerUp();
    const handledShape = shapeDrawing.handlePointerUp();
    return handledQuick || handledShape;
  }, [quickTools, shapeDrawing]);

  return {
    drawingState: shapeDrawing.drawingState,
    activePolygonId: polygonZone.activePolygonId,
    mousePreviewPos: polygonZone.mousePreviewPos,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
