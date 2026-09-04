'use client';

import { useCallback, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { DrawingState } from '../canvas-interaction-types';
import { commitShapeToSlide } from '../helpers/drawing-shape-commit';

interface UseCanvasShapeDrawingOptions {
  effectivePitch: { x: number; y: number; width: number; height: number };
  activeSlideId: string;
}

const SHAPE_TOOLS = new Set([
  'line',
  'route_line',
  'arrow_solid',
  'arrow_dash',
  'arrow_wavy',
  'zone_circle',
  'arrow-straight',
  'arrow-curved',
  'zone',
]);

export function useCanvasShapeDrawing({
  effectivePitch,
  activeSlideId,
}: UseCanvasShapeDrawingOptions) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const addZone = useTacticalUnifiedStore((s) => s.addZone);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);

  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);

  const handlePointerDown = useCallback(
    (pitchPos: { x: number; y: number }): boolean => {
      if (SHAPE_TOOLS.has(activeTool)) {
        setDrawingState({
          isDrawing: true,
          tool: activeTool,
          startX: pitchPos.x,
          startY: pitchPos.y,
          currentX: pitchPos.x,
          currentY: pitchPos.y,
        });
        return true;
      }
      return false;
    },
    [activeTool],
  );

  const handlePointerMove = useCallback(
    (pitchPos: { x: number; y: number }): boolean => {
      if (drawingState?.isDrawing) {
        setDrawingState((prev) =>
          prev
            ? {
                ...prev,
                currentX: pitchPos.x,
                currentY: pitchPos.y,
              }
            : null,
        );
        return true;
      }
      return false;
    },
    [drawingState?.isDrawing],
  );

  const handlePointerUp = useCallback((): boolean => {
    if (drawingState?.isDrawing) {
      commitShapeToSlide(
        drawingState,
        effectivePitch.width,
        effectivePitch.height,
        activeSlideId,
        addArrow,
        addZone,
        selectObject,
        setActiveTool,
        continuousDrawing,
      );
      setDrawingState(null);
      return true;
    }
    return false;
  }, [
    drawingState,
    effectivePitch.width,
    effectivePitch.height,
    activeSlideId,
    addArrow,
    addZone,
    selectObject,
    setActiveTool,
    continuousDrawing,
  ]);

  return {
    drawingState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
