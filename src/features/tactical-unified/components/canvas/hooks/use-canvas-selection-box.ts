'use client';

import { useCallback, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { PitchTransform, Slide } from '@/lib/types/tactical-unified';
import type { SelectionBox } from '../canvas-interaction-types';
import { pxToNorm } from '../helpers/canvas-coordinates';
import { getEnclosedObjects } from '../helpers/canvas-selection-helpers';

interface UseCanvasSelectionBoxOptions {
  effectivePitch: { x: number; y: number; width: number; height: number };
  activeSlide: Slide | null | undefined;
  pitchTransformRef: React.MutableRefObject<PitchTransform>;
}

export function useCanvasSelectionBox({
  effectivePitch,
  activeSlide,
  pitchTransformRef,
}: UseCanvasSelectionBoxOptions) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const selectObjects = useTacticalUnifiedStore((s) => s.selectObjects);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const handlePointerDown = useCallback(
    (pos: { x: number; y: number }, isBg: boolean, isShift: boolean) => {
      if (activeTool === 'select' && isBg) {
        setSelectionBox({
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          isShift,
        });
        return true;
      }
      return false;
    },
    [activeTool],
  );

  const handlePointerMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (selectionBox) {
        setSelectionBox((prev) =>
          prev
            ? {
                ...prev,
                currentX: pos.x,
                currentY: pos.y,
              }
            : null,
        );
        return true;
      }
      return false;
    },
    [selectionBox],
  );

  const handlePointerUp = useCallback(() => {
    if (selectionBox) {
      const { startX, startY, currentX, currentY, isShift } = selectionBox;
      const dist = Math.hypot(currentX - startX, currentY - startY);

      if (dist >= 5 && activeSlide) {
        const minPxX = Math.min(startX, currentX);
        const maxPxX = Math.max(startX, currentX);
        const minPxY = Math.min(startY, currentY);
        const maxPxY = Math.max(startY, currentY);

        const panX = pitchTransformRef.current.panX ?? 0;
        const panY = pitchTransformRef.current.panY ?? 0;
        const zoom = pitchTransformRef.current.zoom ?? 1;
        const tilt = pitchTransformRef.current.tilt ?? 0;
        const safeTilt = Math.max(0, Math.min(85, tilt));
        const tiltRad = (safeTilt * Math.PI) / 180;
        const cosTilt = Math.max(0.05, Math.cos(tiltRad));
        const scaleY = zoom * cosTilt;
        const deltaY = (effectivePitch.height * zoom * (1 - cosTilt)) / 2;

        const minPitchX = (minPxX - effectivePitch.x - panX) / zoom;
        const maxPitchX = (maxPxX - effectivePitch.x - panX) / zoom;
        const minPitchY =
          (minPxY - (effectivePitch.y + panY + deltaY)) / scaleY;
        const maxPitchY =
          (maxPxY - (effectivePitch.y + panY + deltaY)) / scaleY;

        const minNormX = pxToNorm(minPitchX, effectivePitch.width);
        const maxNormX = pxToNorm(maxPitchX, effectivePitch.width);
        const minNormY = pxToNorm(minPitchY, effectivePitch.height);
        const maxNormY = pxToNorm(maxPitchY, effectivePitch.height);

        const enclosed = getEnclosedObjects(activeSlide, {
          minNormX,
          maxNormX,
          minNormY,
          maxNormY,
        });
        selectObjects(enclosed, isShift);
      } else if (!isShift) {
        clearSelection();
      }

      setSelectionBox(null);
      return true;
    }
    return false;
  }, [
    selectionBox,
    activeSlide,
    pitchTransformRef,
    effectivePitch,
    selectObjects,
    clearSelection,
  ]);

  return {
    selectionBox,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
