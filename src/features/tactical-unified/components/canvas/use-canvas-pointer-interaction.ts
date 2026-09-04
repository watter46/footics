'use client';

import type Konva from 'konva';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Slide } from '@/lib/types/tactical-unified';
import { normToPx, pxToNorm } from './canvas-coordinates';
import type { CanvasNodesRegistry } from './canvas-registry';
import { useCanvasDrawingInteraction } from './use-canvas-drawing-interaction';
import { useCanvasPointerDispatcher } from './use-canvas-pointer-dispatcher';
import { useCanvasSelectionBox } from './use-canvas-selection-box';
import { useCanvasZoneRotation } from './use-canvas-zone-rotation';
import { useCanvasZoomPan } from './use-canvas-zoom-pan';

export { normToPx, pxToNorm };

interface UseCanvasPointerInteractionOptions {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  activeSlide: Slide | null | undefined;
  activeSlideId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodesRegistryRef: React.RefObject<CanvasNodesRegistry>;
  pitchGroupsRef?: React.RefObject<(Konva.Group | null)[]>;
  editingTextId?: string | null;
  setEditingTextId: (id: string | null) => void;
}

export function useCanvasPointerInteraction({
  stageSize,
  pitchRect,
  activeSlide,
  activeSlideId,
  containerRef,
  nodesRegistryRef,
  pitchGroupsRef,
  setEditingTextId,
}: UseCanvasPointerInteractionOptions) {
  const effectivePitch = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageSize.width,
    height: stageSize.height,
  };

  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const selectedZone =
    selectedObjects.length === 1 && selectedObjects[0].kind === 'zone'
      ? activeSlide?.zones.find((z) => z.id === selectedObjects[0].id)
      : null;

  const zoomPan = useCanvasZoomPan({
    stageSize,
    effectivePitch,
    activeSlide,
    activeSlideId,
    pitchGroupsRef,
  });

  const drawingInteraction = useCanvasDrawingInteraction({
    effectivePitch,
    activeSlide,
    activeSlideId,
    setEditingTextId,
  });

  const zoneRotation = useCanvasZoneRotation({
    selectedZone,
    effectivePitch,
    containerRef,
    nodesRegistryRef,
    activeSlideId,
    isDrawing: Boolean(drawingInteraction.drawingState?.isDrawing),
    isPanning: zoomPan.isPanning,
  });

  const selectionBoxHook = useCanvasSelectionBox({
    effectivePitch,
    activeSlide,
    pitchTransformRef: zoomPan.pitchTransformRef,
  });

  const { handlePointerDown, handlePointerMove, handlePointerUp } =
    useCanvasPointerDispatcher({
      effectivePitch,
      zoomPan,
      zoneRotation,
      selectionBoxHook,
      drawingInteraction,
    });

  return {
    drawingState: drawingInteraction.drawingState,
    selectionBox: selectionBoxHook.selectionBox,
    activePolygonId: drawingInteraction.activePolygonId,
    mousePreviewPos: drawingInteraction.mousePreviewPos,
    isPitchLocked: zoomPan.isPitchLocked,
    isPanning: zoomPan.isPanning,
    isSpacePressed: zoomPan.isSpacePressed,
    handleWheel: zoomPan.handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
