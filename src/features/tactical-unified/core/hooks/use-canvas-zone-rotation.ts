'use client';

import { useCallback, useRef } from 'react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import {
  checkAndStartRotation,
  checkCornerRotateZone,
  updateRotateCursor,
} from '../utils/canvas-zone-rotation-helpers';
import { pointerToNormalizedCoord } from '../utils/geometry';

export interface UseCanvasZoneRotationOptions {
  vRect: { x?: number; y?: number; width: number; height: number };
  containerRef?: React.RefObject<HTMLDivElement | null>;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  isDrawing: boolean;
  isPanning: boolean;
}

export function useCanvasZoneRotation({
  vRect,
  containerRef,
  nodesRegistryRef,
  isDrawing,
  isPanning,
}: UseCanvasZoneRotationOptions) {
  const activeTool = useSessionStore((s) => s.activeTool);
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setIsDragging = useSessionStore((s) => s.setIsDragging);
  const setIsHudOpen = useSessionStore((s) => s.setIsHudOpen);

  const project = useDocumentStore((s) => s.project);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const zones = activeSlide?.zones ?? [];

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
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  const toPitchLocalPos = useCallback(
    (pixelPos: { x: number; y: number }) => {
      const norm = pointerToNormalizedCoord(
        pixelPos,
        {
          x: vRect.x ?? 0,
          y: vRect.y ?? 0,
          width: vRect.width,
          height: vRect.height,
        },
        { allowOverflow: true, transform: activeSlide?.pitchTransform },
      );
      return {
        x: (norm.x / 100) * vRect.width,
        y: (norm.y / 100) * vRect.height,
      };
    },
    [vRect.x, vRect.y, vRect.width, vRect.height, activeSlide?.pitchTransform],
  );

  const handlePointerDown = useCallback(
    (
      pixelPos: { x: number; y: number },
      isAnchor = false,
      stageContainer?: HTMLDivElement | null,
    ) => {
      if (stageContainer !== undefined) {
        stageContainerRef.current = stageContainer;
      }
      const pitchPos = toPitchLocalPos(pixelPos);
      const res = checkAndStartRotation(
        activeTool,
        selectedZone,
        isOverRotateZoneRef.current,
        isAnchor,
        pitchPos,
        vRect.width,
        vRect.height,
        containerRef?.current ?? null,
        stageContainer ?? stageContainerRef.current,
      );
      if (res.started) {
        isRotatingRef.current = true;
        currentRotationRef.current = null;
        rotateCenterRef.current = res.rotateCenter;
        startMouseAngleRef.current = res.startMouseAngle;
        startShapeRotationRef.current = res.startShapeRotation;
        setIsDragging(true);
        setIsHudOpen(false);
        return true;
      }
      return false;
    },
    [
      toPitchLocalPos,
      activeTool,
      selectedZone,
      vRect.width,
      vRect.height,
      containerRef,
      setIsDragging,
      setIsHudOpen,
    ],
  );

  const handlePointerMove = useCallback(
    (
      pixelPos: { x: number; y: number },
      isAnchor = false,
      stageContainer?: HTMLDivElement | null,
    ) => {
      if (stageContainer !== undefined) {
        stageContainerRef.current = stageContainer;
      }
      const pitchPos = toPitchLocalPos(pixelPos);
      if (isRotatingRef.current && selectedZone) {
        const currentAngle = Math.atan2(
          pitchPos.y - rotateCenterRef.current.y,
          pitchPos.x - rotateCenterRef.current.x,
        );
        const diffDeg =
          ((currentAngle - startMouseAngleRef.current) * 180) / Math.PI;
        const newRot = (startShapeRotationRef.current + diffDeg + 360) % 360;
        currentRotationRef.current = newRot;
        const node = nodesRegistryRef?.current?.zoneNodes.get(selectedZone.id);
        if (node) {
          node.rotation(newRot);
          nodesRegistryRef?.current?.zoneTransformers
            ?.get(selectedZone.id)
            ?.forceUpdate();
          node.getLayer()?.batchDraw();
        }
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
            pitchPos,
            selectedZone,
            vRect.width,
            vRect.height,
          );
        isOverRotateZoneRef.current = isOver;
        updateRotateCursor(
          containerRef?.current ?? null,
          isOver,
          stageContainer ?? stageContainerRef.current,
        );
      }
      return false;
    },
    [
      toPitchLocalPos,
      selectedZone,
      activeTool,
      isDrawing,
      isPanning,
      vRect.width,
      vRect.height,
      containerRef,
      nodesRegistryRef,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      const finalRot = currentRotationRef.current;
      currentRotationRef.current = null;
      if (finalRot !== null && selectedZone) {
        dispatchSlide(activePhaseId, activeSlideId, {
          type: 'UPDATE_ZONE',
          id: selectedZone.id,
          patch: { rotation: finalRot },
        });
      }
      setIsDragging(false);
      setIsHudOpen(true);
      updateRotateCursor(
        containerRef?.current ?? null,
        false,
        stageContainerRef.current,
      );
      return true;
    }
    return false;
  }, [
    containerRef,
    selectedZone,
    activePhaseId,
    activeSlideId,
    dispatchSlide,
    setIsDragging,
    setIsHudOpen,
  ]);

  return {
    isRotatingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
