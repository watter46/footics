'use client';

import { useCallback, useRef } from 'react';
import {
  checkAndStartRotation,
  checkCornerRotateZone,
  updateRotateCursor,
} from '../utils/canvas-zone-rotation-helpers';
import { useCanvasStore } from './use-canvas-store';

export interface UseCanvasZoneRotationOptions {
  vRect: { width: number; height: number };
  containerRef?: React.RefObject<HTMLDivElement | null>;
  isDrawing: boolean;
  isPanning: boolean;
}

export function useCanvasZoneRotation({
  vRect,
  containerRef,
  isDrawing,
  isPanning,
}: UseCanvasZoneRotationOptions) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const updateZone = useCanvasStore((s) => s.updateZone);
  const selectedObjects = useCanvasStore((s) => s.selectedObjects);
  const zones = useCanvasStore((s) => s.annotations.zones);

  const selectedZone =
    selectedObjects.length === 1 && selectedObjects[0]?.kind === 'zone'
      ? zones.find((z) => z.id === selectedObjects[0].id)
      : null;

  const isRotatingRef = useRef(false);
  const rotateCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startMouseAngleRef = useRef(0);
  const startShapeRotationRef = useRef(0);
  const currentRotationRef = useRef<number | null>(null);
  const isOverRotateZoneRef = useRef(false);

  const handlePointerDown = useCallback(
    (pixelPos: { x: number; y: number }, isAnchor = false) => {
      const res = checkAndStartRotation(
        activeTool,
        selectedZone,
        isOverRotateZoneRef.current,
        isAnchor,
        pixelPos,
        vRect.width,
        vRect.height,
        containerRef?.current ?? null,
      );
      if (res.started) {
        isRotatingRef.current = true;
        currentRotationRef.current = null;
        rotateCenterRef.current = res.rotateCenter;
        startMouseAngleRef.current = res.startMouseAngle;
        startShapeRotationRef.current = res.startShapeRotation;
        return true;
      }
      return false;
    },
    [activeTool, selectedZone, vRect.width, vRect.height, containerRef],
  );

  const handlePointerMove = useCallback(
    (pixelPos: { x: number; y: number }, isAnchor = false) => {
      if (isRotatingRef.current && selectedZone) {
        const currentAngle = Math.atan2(
          pixelPos.y - rotateCenterRef.current.y,
          pixelPos.x - rotateCenterRef.current.x,
        );
        const diffDeg =
          ((currentAngle - startMouseAngleRef.current) * 180) / Math.PI;
        const newRot = (startShapeRotationRef.current + diffDeg + 360) % 360;
        currentRotationRef.current = newRot;
        updateZone(selectedZone.id, { rotation: newRot });
        return true;
      }

      if (
        activeTool === 'select' &&
        selectedZone &&
        selectedZone.shapeType !== 'polygon' &&
        !isDrawing &&
        !isPanning
      ) {
        const isOver =
          !isAnchor &&
          checkCornerRotateZone(
            pixelPos,
            selectedZone,
            vRect.width,
            vRect.height,
          );
        isOverRotateZoneRef.current = isOver;
        updateRotateCursor(containerRef?.current ?? null, isOver);
      }
      return false;
    },
    [
      selectedZone,
      activeTool,
      isDrawing,
      isPanning,
      vRect.width,
      vRect.height,
      containerRef,
      updateZone,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      if (currentRotationRef.current !== null && selectedZone) {
        updateZone(selectedZone.id, {
          rotation: currentRotationRef.current,
        });
      }
      updateRotateCursor(containerRef?.current ?? null, false);
      return true;
    }
    return false;
  }, [containerRef, selectedZone, updateZone]);

  return {
    isRotatingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
