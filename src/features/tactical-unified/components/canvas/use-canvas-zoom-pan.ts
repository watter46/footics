'use client';

import type Konva from 'konva';
import { useCallback, useEffect, useRef } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { PitchTransform, Slide } from '@/lib/types/tactical-unified';
import { applyPitchTransformToGroups } from './canvas-pitch-transform-helper';
import { useCanvasPitchPan } from './use-canvas-pitch-pan';
import { useCanvasWheelZoom } from './use-canvas-wheel-zoom';

interface UseCanvasZoomPanOptions {
  stageSize: { width: number; height: number };
  effectivePitch: { x: number; y: number; width: number; height: number };
  activeSlide: Slide | null | undefined;
  activeSlideId: string;
  pitchGroupsRef?: React.RefObject<(Konva.Group | null)[]>;
}

export function useCanvasZoomPan({
  stageSize,
  effectivePitch,
  activeSlide,
  activeSlideId,
  pitchGroupsRef,
}: UseCanvasZoomPanOptions) {
  const updatePitchTransform = useTacticalUnifiedStore(
    (s) => s.updatePitchTransform,
  );

  const pitchTransform = activeSlide?.pitchTransform ?? {
    panX: 0,
    panY: 0,
    zoom: 1,
    tilt: 0,
    isLocked: false,
  };
  const isPitchLocked = pitchTransform.isLocked ?? false;
  const pitchTransformRef = useRef<PitchTransform>(pitchTransform);

  const applyPitchTransformToNodes = useCallback(
    (panX: number, panY: number, zoom: number) => {
      pitchTransformRef.current = {
        ...pitchTransformRef.current,
        panX,
        panY,
        zoom,
      };
      if (pitchGroupsRef?.current) {
        applyPitchTransformToGroups(
          pitchGroupsRef.current,
          effectivePitch,
          panX,
          panY,
          zoom,
        );
      }
    },
    [pitchGroupsRef, effectivePitch],
  );

  useEffect(() => {
    pitchTransformRef.current = pitchTransform;
    applyPitchTransformToNodes(
      pitchTransform.panX ?? 0,
      pitchTransform.panY ?? 0,
      pitchTransform.zoom ?? 1,
    );
  }, [pitchTransform, applyPitchTransformToNodes]);

  const { handleWheel } = useCanvasWheelZoom({
    stageSize,
    effectivePitch,
    pitchTransformRef,
    activeSlideId,
    updatePitchTransform,
    applyPitchTransformToNodes,
  });

  const {
    isPanning,
    isSpacePressed,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useCanvasPitchPan({
    activeSlideId,
    isPitchLocked,
    pitchTransformRef,
    applyPitchTransformToNodes,
  });

  return {
    pitchTransformRef,
    isPitchLocked,
    isPanning,
    isSpacePressed,
    applyPitchTransformToNodes,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
