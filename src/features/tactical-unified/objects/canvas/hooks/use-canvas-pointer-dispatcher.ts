'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
import type { PitchTransform } from '@/lib/types/tactical-unified';
import { getPitchAndNormPos } from '../helpers/canvas-coordinates';
import {
  type CameraParams,
  type NormPoint,
  unprojectScreenToPitch,
} from '../helpers/matrix-coordinates';
import type { useCanvasDrawingInteraction } from './use-canvas-drawing-interaction';
import type { useCanvasSelectionBox } from './use-canvas-selection-box';
import type { useCanvasZoneRotation } from './use-canvas-zone-rotation';
import type { useCanvasZoomPan } from './use-canvas-zoom-pan';

function getScreenPointerPosition(
  e: KonvaEventObject<MouseEvent | TouchEvent>,
  containerEl: HTMLDivElement | null,
): { x: number; y: number } | null {
  const evt = e.evt;
  if (containerEl && evt && typeof evt === 'object') {
    if ('clientX' in evt && typeof (evt as MouseEvent).clientX === 'number') {
      const rect = containerEl.getBoundingClientRect();
      return {
        x: (evt as MouseEvent).clientX - rect.left,
        y: (evt as MouseEvent).clientY - rect.top,
      };
    }
    if ('touches' in evt && (evt as TouchEvent).touches?.length > 0) {
      const touch = (evt as TouchEvent).touches[0];
      const rect = containerEl.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
  }
  const stage = e.target.getStage();
  return (
    stage?.getRelativePointerPosition() ?? stage?.getPointerPosition() ?? null
  );
}

function resolvePointerPositions(
  screenPos: { x: number; y: number },
  pitchTransform: PitchTransform,
  effectivePitch: { x: number; y: number; width: number; height: number },
  stageSize?: { width: number; height: number },
): {
  normPoint: NormPoint | null;
  normPos: { x: number; y: number } | null;
  pitchPos: { x: number; y: number } | null;
} {
  const tilt = pitchTransform.tilt ?? 0;
  if (Math.abs(tilt) < 1e-5) {
    const { pitchPos, normPos } = getPitchAndNormPos(
      screenPos,
      effectivePitch,
      pitchTransform,
    );
    return {
      normPoint: { x: normPos.x / 100, y: normPos.y / 100 },
      normPos,
      pitchPos,
    };
  }

  const stageWidth =
    stageSize?.width ?? effectivePitch.x * 2 + effectivePitch.width;
  const stageHeight =
    stageSize?.height ?? effectivePitch.y * 2 + effectivePitch.height;

  const cameraParams: CameraParams = {
    tilt,
    zoom: pitchTransform.zoom ?? 1,
    panX: pitchTransform.panX ?? 0,
    panY: pitchTransform.panY ?? 0,
    stageWidth,
    stageHeight,
    pitchWidth: effectivePitch.width,
    pitchHeight: effectivePitch.height,
    pitchX: effectivePitch.x,
    pitchY: effectivePitch.y,
    pitchRect: effectivePitch,
  };

  const normPoint = unprojectScreenToPitch(screenPos, cameraParams);
  if (!normPoint) {
    return { normPoint: null, normPos: null, pitchPos: null };
  }

  return {
    normPoint,
    normPos: { x: normPoint.x * 100, y: normPoint.y * 100 },
    pitchPos: {
      x: normPoint.x * effectivePitch.width,
      y: normPoint.y * effectivePitch.height,
    },
  };
}

function resolveStageSize(
  containerEl: HTMLDivElement | null,
  stage: ReturnType<
    KonvaEventObject<MouseEvent | TouchEvent>['target']['getStage']
  >,
): { width: number; height: number } | undefined {
  if (containerEl) {
    return {
      width: containerEl.clientWidth,
      height: containerEl.clientHeight,
    };
  }
  if (stage) {
    return { width: stage.width(), height: stage.height() };
  }
  return undefined;
}

function dispatchPointerDownTarget({
  e,
  pitchPos,
  normPos,
  pos,
  zoneRotation,
  selectionBoxHook,
  drawingInteraction,
}: {
  e: KonvaEventObject<MouseEvent | TouchEvent>;
  pitchPos: { x: number; y: number } | null;
  normPos: { x: number; y: number } | null;
  pos: { x: number; y: number };
  zoneRotation: ReturnType<typeof useCanvasZoneRotation>;
  selectionBoxHook: ReturnType<typeof useCanvasSelectionBox>;
  drawingInteraction: ReturnType<typeof useCanvasDrawingInteraction>;
}) {
  const isAnchor = e.target.getParent()?.getClassName() === 'Transformer';
  if (pitchPos && zoneRotation.handlePointerDown(pitchPos, isAnchor)) return;

  const isShift = (e.evt as MouseEvent).shiftKey ?? false;
  if (selectionBoxHook.handlePointerDown(pos, false, isShift)) return;

  if (pitchPos && normPos) {
    drawingInteraction.handlePointerDown(pitchPos, normPos);
  }
}

function dispatchPointerMoveTarget({
  pitchPos,
  normPos,
  pos,
  isAnchor,
  zoneRotation,
  selectionBoxHook,
  drawingInteraction,
}: {
  pitchPos: { x: number; y: number } | null;
  normPos: { x: number; y: number } | null;
  pos: { x: number; y: number };
  isAnchor: boolean;
  zoneRotation: ReturnType<typeof useCanvasZoneRotation>;
  selectionBoxHook: ReturnType<typeof useCanvasSelectionBox>;
  drawingInteraction: ReturnType<typeof useCanvasDrawingInteraction>;
}) {
  if (pitchPos && zoneRotation.handlePointerMove(pitchPos, isAnchor)) return;
  if (selectionBoxHook.handlePointerMove(pos)) return;
  if (pitchPos && normPos) {
    drawingInteraction.handlePointerMove(pitchPos, normPos);
  }
}

interface UseCanvasPointerDispatcherOptions {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  effectivePitch: { x: number; y: number; width: number; height: number };
  zoomPan: ReturnType<typeof useCanvasZoomPan>;
  zoneRotation: ReturnType<typeof useCanvasZoneRotation>;
  selectionBoxHook: ReturnType<typeof useCanvasSelectionBox>;
  drawingInteraction: ReturnType<typeof useCanvasDrawingInteraction>;
}

export function useCanvasPointerDispatcher({
  containerRef,
  effectivePitch,
  zoomPan,
  zoneRotation,
  selectionBoxHook,
  drawingInteraction,
}: UseCanvasPointerDispatcherOptions) {
  const handlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = getScreenPointerPosition(e, containerRef?.current ?? null);
      if (!pos) return;

      const stageSize = resolveStageSize(containerRef?.current ?? null, stage);
      const { normPos, pitchPos } = resolvePointerPositions(
        pos,
        zoomPan.pitchTransformRef.current,
        effectivePitch,
        stageSize,
      );
      const isInsidePitch =
        pitchPos !== null &&
        pitchPos.x >= 0 &&
        pitchPos.x <= effectivePitch.width &&
        pitchPos.y >= 0 &&
        pitchPos.y <= effectivePitch.height;
      const isBg = e.target === stage;

      if (zoomPan.handlePointerDown(pos, isBg, isInsidePitch)) return;

      dispatchPointerDownTarget({
        e,
        pitchPos,
        normPos,
        pos,
        zoneRotation,
        selectionBoxHook,
        drawingInteraction,
      });
    },
    [
      containerRef,
      zoomPan,
      effectivePitch,
      zoneRotation,
      selectionBoxHook,
      drawingInteraction,
    ],
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const pos = getScreenPointerPosition(e, containerRef?.current ?? null);
      if (!pos) return;

      if (zoomPan.handlePointerMove(pos)) return;

      const stage = e.target.getStage();
      const stageSize = resolveStageSize(containerRef?.current ?? null, stage);
      const { normPos, pitchPos } = resolvePointerPositions(
        pos,
        zoomPan.pitchTransformRef.current,
        effectivePitch,
        stageSize,
      );

      const isAnchor = e.target.getParent()?.getClassName() === 'Transformer';
      dispatchPointerMoveTarget({
        pitchPos,
        normPos,
        pos,
        isAnchor,
        zoneRotation,
        selectionBoxHook,
        drawingInteraction,
      });
    },
    [
      containerRef,
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
