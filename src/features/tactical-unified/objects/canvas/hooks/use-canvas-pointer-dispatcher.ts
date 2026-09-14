'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
import type { PitchTransform } from '@/lib/types/tactical-unified';
import {
  DEFAULT_PITCH_PERSPECTIVE,
  getPitchAndNormPos,
  type Point2D,
  pitchToNorm,
  unprojectScreenYToCssRotateX,
} from '../helpers/canvas-coordinates';
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
  normPoint: Point2D | null;
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

  const effPerspective = DEFAULT_PITCH_PERSPECTIVE;
  const panX = pitchTransform.panX ?? 0;
  const panY = pitchTransform.panY ?? 0;
  const zoom = Math.max(0.001, pitchTransform.zoom ?? 1);

  const stageCenterY = stageHeight / 2;

  // CSS 3D rotateX の逆変換でスクリーンY→ピッチローカルY を算出
  // null は地平線より上（不定域）→ y=0（ステージ上端）にクランプして処理継続
  const pitchLocalYRaw = unprojectScreenYToCssRotateX(
    screenPos.y,
    stageCenterY,
    tilt,
    effPerspective,
  );
  const pitchLocalY = pitchLocalYRaw ?? 0;

  // X座標: screenToPitch の perspective branch と同等の計算
  // z3d を求めるには pitchLocalY (= tilt逆変換後のステージ中心相対Y) が必要
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const sinTilt = Math.sin(tiltRad);
  const z3d = zoom * pitchLocalY * sinTilt;
  const invScale = 1 - z3d / effPerspective;

  const stageOffsetX = (stageWidth - effectivePitch.width) / 2;
  const relX = screenPos.x - (stageOffsetX + effectivePitch.width / 2);
  const localX = (relX * invScale - panX) / zoom;
  const localY = (pitchLocalY - panY) / zoom;

  const pitchPos: Point2D = {
    x: localX + effectivePitch.width / 2,
    y: localY + effectivePitch.height / 2,
  };
  const normPos = pitchToNorm(pitchPos, effectivePitch);

  return {
    normPoint: { x: normPos.x / 100, y: normPos.y / 100 },
    normPos,
    pitchPos,
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
