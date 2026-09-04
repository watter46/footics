'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
import { getPitchAndNormPos } from '../helpers/canvas-coordinates';
import type { useCanvasDrawingInteraction } from './use-canvas-drawing-interaction';
import type { useCanvasSelectionBox } from './use-canvas-selection-box';
import type { useCanvasZoneRotation } from './use-canvas-zone-rotation';
import type { useCanvasZoomPan } from './use-canvas-zoom-pan';

interface UseCanvasPointerDispatcherOptions {
  effectivePitch: { x: number; y: number; width: number; height: number };
  zoomPan: ReturnType<typeof useCanvasZoomPan>;
  zoneRotation: ReturnType<typeof useCanvasZoneRotation>;
  selectionBoxHook: ReturnType<typeof useCanvasSelectionBox>;
  drawingInteraction: ReturnType<typeof useCanvasDrawingInteraction>;
}

export function useCanvasPointerDispatcher({
  effectivePitch,
  zoomPan,
  zoneRotation,
  selectionBoxHook,
  drawingInteraction,
}: UseCanvasPointerDispatcherOptions) {
  const handlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      const isBg = e.target === e.target.getStage();
      if (zoomPan.handlePointerDown(pos, isBg)) return;

      const { pitchPos, normPos } = getPitchAndNormPos(
        pos,
        effectivePitch,
        zoomPan.pitchTransformRef.current,
      );
      const isAnchor = e.target.getParent()?.getClassName() === 'Transformer';
      if (zoneRotation.handlePointerDown(pitchPos, isAnchor)) return;

      const isShift = (e.evt as MouseEvent).shiftKey ?? false;
      if (selectionBoxHook.handlePointerDown(pos, isBg, isShift)) return;

      drawingInteraction.handlePointerDown(pitchPos, normPos);
    },
    [
      zoomPan,
      effectivePitch,
      zoneRotation,
      selectionBoxHook,
      drawingInteraction,
    ],
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      if (zoomPan.handlePointerMove(pos)) return;

      const { pitchPos, normPos } = getPitchAndNormPos(
        pos,
        effectivePitch,
        zoomPan.pitchTransformRef.current,
      );
      const isAnchor = e.target.getParent()?.getClassName() === 'Transformer';
      if (zoneRotation.handlePointerMove(pitchPos, isAnchor)) return;

      if (selectionBoxHook.handlePointerMove(pos)) return;

      drawingInteraction.handlePointerMove(pitchPos, normPos);
    },
    [
      zoomPan,
      effectivePitch,
      zoneRotation,
      selectionBoxHook,
      drawingInteraction,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (zoomPan.handlePointerUp()) return;
    if (zoneRotation.handlePointerUp()) return;
    if (selectionBoxHook.handlePointerUp()) return;
    drawingInteraction.handlePointerUp();
  }, [zoomPan, zoneRotation, selectionBoxHook, drawingInteraction]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
