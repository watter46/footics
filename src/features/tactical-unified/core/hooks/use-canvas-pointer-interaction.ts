'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useRef } from 'react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  type CanvasPointerInteractionResult,
  dispatchPointerMove,
  dispatchPointerUp,
  isAnchorTarget,
  type UseCanvasPointerInteractionOptions,
} from '../utils/canvas-pointer-dispatcher';
import { useCanvasPointerStore } from '../utils/canvas-pointer-state';
import { handleToolPointerDown } from '../utils/canvas-pointer-tools';
import { getPointerCoordinates } from '../utils/geometry';
import { useCanvasPolygonZone } from './use-canvas-polygon-zone';
import { useCanvasSelectionBox } from './use-canvas-selection-box';
import { useCanvasZoneRotation } from './use-canvas-zone-rotation';
import { useCanvasZoomPan } from './use-canvas-zoom-pan';

export type {
  CanvasPointerInteractionResult,
  UseCanvasPointerInteractionOptions,
};

export function useCanvasPointerInteraction({
  vRect,
  containerRef,
  onStartEditText,
}: UseCanvasPointerInteractionOptions): CanvasPointerInteractionResult {
  const s = useCanvasPointerStore();
  const activePhaseId = useSessionStore((st) => st.activePhaseId);
  const activeSlideId = useSessionStore((st) => st.activeSlideId);
  const pitchTransform = useDocumentStore(
    (st) =>
      selectDomainActiveSlide(st.project, activePhaseId, activeSlideId)
        ?.pitchTransform,
  );
  const isPointerDownRef = useRef(false);

  const zoomPan = useCanvasZoomPan({ vRect, disabled: true });
  const polygonZone = useCanvasPolygonZone();
  const zoneRotation = useCanvasZoneRotation({
    vRect,
    containerRef,
    isDrawing: Boolean(s.drawingPreview?.isDrawing),
    isPanning: zoomPan.isPanning,
  });
  const selectionBoxHook = useCanvasSelectionBox({ vRect });

  const handlePointerDown = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      isPointerDownRef.current = true;
      if (zoomPan.handlePanPointerDown(e)) return;
      const isDrawingTool =
        s.activeTool !== 'select' && s.activeTool !== 'eraser';
      const effectiveVRect = { ...vRect, allowOverflow: isDrawingTool };
      const { pixelPos, normPos } = getPointerCoordinates(
        e,
        effectiveVRect,
        pitchTransform,
      );
      const isAnchor = isAnchorTarget(e.target);
      const stageContainer = e.target?.getStage?.()?.container?.() ?? null;
      if (zoneRotation.handlePointerDown(pixelPos, isAnchor, stageContainer)) {
        return;
      }
      if (polygonZone.handlePointerDown(normPos)) return;

      const isStage = e.target === e.target.getStage();
      const isShift = Boolean(e.evt?.shiftKey);
      if (s.connectingPlayerId && isStage) {
        s.setConnectingPlayerId(null);
      }
      if (s.activeTool === 'select') {
        selectionBoxHook.handleSelectionDown(pixelPos, isStage, isShift);
        return;
      }
      handleToolPointerDown(normPos, { ...s, onStartEditText });
    },
    [
      zoomPan,
      vRect,
      pitchTransform,
      zoneRotation,
      polygonZone,
      s,
      selectionBoxHook,
      onStartEditText,
    ],
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      const isDrawingTool =
        s.activeTool !== 'select' && s.activeTool !== 'eraser';
      const effectiveVRect = { ...vRect, allowOverflow: isDrawingTool };
      dispatchPointerMove(e, {
        vRect: effectiveVRect,
        pitchTransform,
        isPointerDown: isPointerDownRef.current,
        activeTool: s.activeTool,
        drawingPreview: s.drawingPreview,
        onPanMove: zoomPan.handlePanPointerMove,
        onRotateMove: zoneRotation.handlePointerMove,
        onPolygonMove: polygonZone.handlePointerMove,
        onSelectionMove: selectionBoxHook.handleSelectionMove,
        eraseAtPoint: s.eraseAtPoint,
        setDrawingPreview: s.setDrawingPreview,
      });
    },
    [
      vRect,
      pitchTransform,
      s.activeTool,
      s.drawingPreview,
      s.eraseAtPoint,
      s.setDrawingPreview,
      zoomPan.handlePanPointerMove,
      zoneRotation.handlePointerMove,
      polygonZone.handlePointerMove,
      selectionBoxHook.handleSelectionMove,
    ],
  );

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;
    dispatchPointerUp({
      drawingPreview: s.drawingPreview,
      color: s.color,
      strokeWidth: s.strokeWidth,
      continuousDrawing: s.continuousDrawing,
      onPanUp: zoomPan.handlePanPointerUp,
      onRotateUp: zoneRotation.handlePointerUp,
      onSelectionUp: selectionBoxHook.handleSelectionUp,
      addArrow: s.addArrow,
      addZone: s.addZone,
      setDrawingPreview: s.setDrawingPreview,
      setActiveTool: s.setActiveTool,
    });
  }, [
    s,
    zoomPan.handlePanPointerUp,
    zoneRotation.handlePointerUp,
    selectionBoxHook.handleSelectionUp,
  ]);

  return {
    drawingState: s.drawingPreview,
    selectionBox: selectionBoxHook.selectionBox,
    activePolygonId: polygonZone.activePolygonId,
    mousePreviewPos: polygonZone.mousePreviewPos,
    isPitchLocked: zoomPan.isPitchLocked,
    isPanning: zoomPan.isPanning,
    isSpacePressed: zoomPan.isSpacePressed,
    handleWheel: zoomPan.handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
