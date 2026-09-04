'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef } from 'react';
import type { PitchTransform } from '@/lib/types/tactical-unified';

interface UseCanvasWheelZoomOptions {
  stageSize: { width: number; height: number };
  pitchTransformRef: React.MutableRefObject<PitchTransform>;
  activeSlideId: string;
  updatePitchTransform: (
    slideId: string,
    transform: Partial<PitchTransform>,
  ) => void;
  applyPitchTransformToNodes: (
    panX: number,
    panY: number,
    zoom: number,
  ) => void;
}

export function useCanvasWheelZoom({
  stageSize,
  pitchTransformRef,
  activeSlideId,
  updatePitchTransform,
  applyPitchTransformToNodes,
}: UseCanvasWheelZoomOptions) {
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition() ?? {
        x: stageSize.width / 2,
        y: stageSize.height / 2,
      };
      const oldZoom = pitchTransformRef.current.zoom ?? 1;
      const oldPanX = pitchTransformRef.current.panX ?? 0;
      const oldPanY = pitchTransformRef.current.panY ?? 0;
      const zoomFactor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
      const nextZoom = Math.max(0.2, Math.min(5.0, oldZoom * zoomFactor));
      if (Math.abs(nextZoom - oldZoom) < 0.0001) return;

      const scaleRatio = nextZoom / oldZoom;
      const nextPanX = pos.x - (pos.x - oldPanX) * scaleRatio;
      const nextPanY = pos.y - (pos.y - oldPanY) * scaleRatio;
      applyPitchTransformToNodes(nextPanX, nextPanY, nextZoom);

      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        updatePitchTransform(activeSlideId, {
          zoom: pitchTransformRef.current.zoom,
          panX: pitchTransformRef.current.panX,
          panY: pitchTransformRef.current.panY,
        });
      }, 150);
    },
    [
      stageSize,
      activeSlideId,
      updatePitchTransform,
      applyPitchTransformToNodes,
      pitchTransformRef,
    ],
  );

  return { handleWheel };
}
