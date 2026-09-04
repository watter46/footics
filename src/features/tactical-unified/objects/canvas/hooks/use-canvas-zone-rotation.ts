'use client';

import { useCallback, useRef } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../helpers/canvas-registry';
import {
  applyZoneNodeRotation,
  checkAndStartRotation,
  checkCornerRotateZone,
  updateRotateCursor,
} from '../helpers/canvas-zone-rotation-helpers';

interface UseCanvasZoneRotationOptions {
  selectedZone: ZoneAnnotation | null | undefined;
  effectivePitch: { x: number; y: number; width: number; height: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodesRegistryRef: React.RefObject<CanvasNodesRegistry>;
  activeSlideId: string;
  isDrawing: boolean;
  isPanning: boolean;
}

export function useCanvasZoneRotation({
  selectedZone,
  effectivePitch,
  containerRef,
  nodesRegistryRef,
  activeSlideId,
  isDrawing,
  isPanning,
}: UseCanvasZoneRotationOptions) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);

  const isRotatingRef = useRef(false);
  const rotateCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startMouseAngleRef = useRef(0);
  const startShapeRotationRef = useRef(0);
  const currentRotationRef = useRef<number | null>(null);
  const isOverRotateZoneRef = useRef(false);

  const handlePointerDown = useCallback(
    (pitchPos: { x: number; y: number }, isAnchor: boolean) => {
      const res = checkAndStartRotation(
        activeTool,
        selectedZone,
        isOverRotateZoneRef.current,
        isAnchor,
        pitchPos,
        effectivePitch.width,
        effectivePitch.height,
        containerRef.current,
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
    [
      activeTool,
      selectedZone,
      effectivePitch.width,
      effectivePitch.height,
      containerRef,
    ],
  );

  const handlePointerMove = useCallback(
    (pitchPos: { x: number; y: number }, isAnchor: boolean) => {
      if (isRotatingRef.current && selectedZone) {
        const node = nodesRegistryRef.current?.zoneNodes.get(selectedZone.id);
        if (node) {
          currentRotationRef.current = applyZoneNodeRotation(
            node,
            pitchPos,
            rotateCenterRef.current,
            startMouseAngleRef.current,
            startShapeRotationRef.current,
          );
          return true;
        }
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
            pitchPos,
            selectedZone,
            effectivePitch.width,
            effectivePitch.height,
          );
        isOverRotateZoneRef.current = isOver;
        updateRotateCursor(containerRef.current, isOver);
      }
      return false;
    },
    [
      selectedZone,
      nodesRegistryRef,
      activeTool,
      isDrawing,
      isPanning,
      containerRef,
      effectivePitch.width,
      effectivePitch.height,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      if (currentRotationRef.current !== null && selectedZone) {
        updateZone(activeSlideId, selectedZone.id, {
          rotation: currentRotationRef.current,
        });
      }
      updateRotateCursor(containerRef.current, false);
      return true;
    }
    return false;
  }, [activeSlideId, containerRef, selectedZone, updateZone]);

  return {
    isRotatingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
