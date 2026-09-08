'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { normToPx } from '@/features/tactical-unified/objects/canvas';
import {
  type CameraParams,
  type NormPoint,
  unprojectScreenToPitch,
} from '@/features/tactical-unified/objects/canvas/helpers/matrix-coordinates';
import {
  selectActiveSlide,
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { PitchTransform } from '@/lib/types/tactical-unified';
import { hideGhostGroup, setupGhostGroup } from './ball-drag-helper';

function getDragPointerClientPos(
  e: KonvaEventObject<DragEvent>,
): { x: number; y: number } | null {
  const evt = e.evt;
  if (!evt || typeof evt !== 'object') return null;

  if ('clientX' in evt && typeof (evt as MouseEvent).clientX === 'number') {
    return {
      x: (evt as MouseEvent).clientX,
      y: (evt as MouseEvent).clientY,
    };
  }
  if (
    'touches' in evt &&
    (evt as unknown as TouchEvent).touches &&
    (evt as unknown as TouchEvent).touches.length > 0
  ) {
    const touch = (evt as unknown as TouchEvent).touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  return null;
}

function resolveBallUnprojectPos(
  e: KonvaEventObject<DragEvent>,
  pitchTransform: PitchTransform | undefined,
  stageSize: { width: number; height: number },
): NormPoint | null {
  const node = e.currentTarget as Konva.Group;
  const stage = node.getStage();
  const containerEl = stage?.container();
  if (!containerEl) return null;

  const clientPos = getDragPointerClientPos(e);
  if (!clientPos) return null;

  const rect = containerEl.getBoundingClientRect();
  const screenX = clientPos.x - rect.left;
  const screenY = clientPos.y - rect.top;

  const cameraParams: CameraParams = {
    tilt: pitchTransform?.tilt ?? 0,
    zoom: pitchTransform?.zoom ?? 1,
    panX: pitchTransform?.panX ?? 0,
    panY: pitchTransform?.panY ?? 0,
    stageWidth: stageSize.width,
    stageHeight: stageSize.height,
    pitchWidth: stageSize.width,
    pitchHeight: stageSize.height,
    pitchRect: { x: 0, y: 0, width: stageSize.width, height: stageSize.height },
  };

  return unprojectScreenToPitch({ x: screenX, y: screenY }, cameraParams);
}

function computeFallbackNormPos(
  node: Konva.Group,
  stageSize: { width: number; height: number },
): { x: number; y: number } {
  const clampedPxX = Math.max(
    -stageSize.width,
    Math.min(stageSize.width * 2, node.x()),
  );
  const clampedPxY = Math.max(
    -stageSize.height,
    Math.min(stageSize.height * 2, node.y()),
  );
  return {
    x: (clampedPxX / stageSize.width) * 100,
    y: (clampedPxY / stageSize.height) * 100,
  };
}

function setupBallGhostOnDragStart(
  prevSlideBall: { x: number; y: number; visible?: boolean } | undefined,
  stageSize: { width: number; height: number },
  node: Konva.Group,
  ghostGroup: Konva.Group | null,
  ghostLine: Konva.Line | null,
): { x: number; y: number } | null {
  if (prevSlideBall?.visible) {
    const pPxX = normToPx(prevSlideBall.x, stageSize.width);
    const pPxY = normToPx(prevSlideBall.y, stageSize.height);
    setupGhostGroup(ghostGroup, ghostLine, pPxX, pPxY, node.x(), node.y());
    return { x: pPxX, y: pPxY };
  }
  hideGhostGroup(ghostGroup);
  return null;
}

function updateBallDragMovePosition(
  node: Konva.Group,
  e: KonvaEventObject<DragEvent>,
  pitchTransform: PitchTransform | undefined,
  stageSize: { width: number; height: number },
) {
  const tilt = pitchTransform?.tilt ?? 0;
  const is3D = Math.abs(tilt) >= 1e-5;

  if (is3D) {
    const normPoint = resolveBallUnprojectPos(e, pitchTransform, stageSize);
    if (normPoint) {
      node.position({
        x: normPoint.x * stageSize.width,
        y: normPoint.y * stageSize.height,
      });
    }
  }
}

function updateBallGhostLine(
  ghostLine: Konva.Line | null,
  prevBallPx: { x: number; y: number } | null,
  node: Konva.Group,
) {
  if (prevBallPx && ghostLine) {
    ghostLine.points([prevBallPx.x, prevBallPx.y, node.x(), node.y()]);
    node.getLayer()?.batchDraw();
  }
}

function resolveBallFinalNormPos(
  node: Konva.Group,
  e: KonvaEventObject<DragEvent>,
  pitchTransform: PitchTransform | undefined,
  stageSize: { width: number; height: number },
): { x: number; y: number } {
  const tilt = pitchTransform?.tilt ?? 0;
  const is3D = Math.abs(tilt) >= 1e-5;

  if (is3D) {
    const normPoint = resolveBallUnprojectPos(e, pitchTransform, stageSize);
    return normPoint
      ? { x: normPoint.x * 100, y: normPoint.y * 100 }
      : computeFallbackNormPos(node, stageSize);
  }
  return computeFallbackNormPos(node, stageSize);
}

interface UseBallDragProps {
  stageSize: { width: number; height: number };
  ghostGroupRef: React.RefObject<Konva.Group | null>;
  ghostLineRef: React.RefObject<Konva.Line | null>;
}

export function useBallDrag({
  stageSize,
  ghostGroupRef,
  ghostLineRef,
}: UseBallDragProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const prevSlide = useTacticalUnifiedStore(selectPreviousSlide);
  const setBallPosition = useTacticalUnifiedStore((s) => s.setBallPosition);

  const [isDragging, setIsDragging] = useState(false);
  const prevBallPxRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setIsDragging(true);
      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1.25, y: 1.25 });
      node.moveToTop();
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'grabbing';

      prevBallPxRef.current = setupBallGhostOnDragStart(
        prevSlide?.ball,
        stageSize,
        node,
        ghostGroupRef.current,
        ghostLineRef.current,
      );
    },
    [prevSlide?.ball, stageSize, ghostGroupRef, ghostLineRef],
  );

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.currentTarget as Konva.Group;
      updateBallDragMovePosition(
        node,
        e,
        activeSlide?.pitchTransform,
        stageSize,
      );
      updateBallGhostLine(ghostLineRef.current, prevBallPxRef.current, node);
    },
    [ghostLineRef, activeSlide?.pitchTransform, stageSize],
  );

  const dragBoundFunc = useCallback(
    (pos: { x: number; y: number }) => ({
      x: Math.max(-stageSize.width, Math.min(stageSize.width * 2, pos.x)),
      y: Math.max(-stageSize.height, Math.min(stageSize.height * 2, pos.y)),
    }),
    [stageSize.width, stageSize.height],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setIsDragging(false);
      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1, y: 1 });
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'default';

      hideGhostGroup(ghostGroupRef.current);
      prevBallPxRef.current = null;

      const finalPos = resolveBallFinalNormPos(
        node,
        e,
        activeSlide?.pitchTransform,
        stageSize,
      );

      setBallPosition(activeSlideId, finalPos.x, finalPos.y);
    },
    [
      activeSlideId,
      setBallPosition,
      stageSize,
      ghostGroupRef,
      activeSlide?.pitchTransform,
    ],
  );

  return {
    isDragging,
    dragBoundFunc,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
