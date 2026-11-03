'use client';

import { useCallback, useRef, useState } from 'react';
import { getStagePitchAndNormPos } from '../utils/canvas-coordinates';
import {
  getEnclosedObjects,
  type SelectionBox,
} from '../utils/canvas-selection-helpers';
import { useCanvasStore } from './use-canvas-store';

export type { SelectionBox };

export interface UseCanvasSelectionBoxOptions {
  vRect: { width: number; height: number; x?: number; y?: number };
}

export function useCanvasSelectionBox({ vRect }: UseCanvasSelectionBoxOptions) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObjects = useCanvasStore((s) => s.selectObjects);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const annotations = useCanvasStore((s) => s.annotations);
  const pitchTransform = useCanvasStore((s) => s.pitchTransform);
  const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const selectionBoxRef = useRef<SelectionBox | null>(null);

  const handleSelectionDown = useCallback(
    (pixelPos: { x: number; y: number }, isBg: boolean, isShift: boolean) => {
      if (activeTool === 'select' && isBg) {
        const box: SelectionBox = {
          startX: pixelPos.x,
          startY: pixelPos.y,
          currentX: pixelPos.x,
          currentY: pixelPos.y,
          isShift,
        };
        selectionBoxRef.current = box;
        setSelectionBox(box);
        return true;
      }
      return false;
    },
    [activeTool],
  );

  const handleSelectionMove = useCallback(
    (pixelPos: { x: number; y: number }) => {
      if (selectionBoxRef.current) {
        const updated: SelectionBox = {
          ...selectionBoxRef.current,
          currentX: pixelPos.x,
          currentY: pixelPos.y,
        };
        selectionBoxRef.current = updated;
        setSelectionBox(updated);
        return true;
      }
      return false;
    },
    [],
  );

  const handleSelectionUp = useCallback(() => {
    const box = selectionBoxRef.current;
    if (box) {
      const { startX, startY, currentX, currentY, isShift } = box;
      const dist = Math.hypot(currentX - startX, currentY - startY);

      if (dist >= 5 && vRect.width > 0 && vRect.height > 0) {
        const minPxX = Math.min(startX, currentX);
        const maxPxX = Math.max(startX, currentX);
        const minPxY = Math.min(startY, currentY);
        const maxPxY = Math.max(startY, currentY);

        const fullVRect = {
          x: vRect.x ?? 0,
          y: vRect.y ?? 0,
          width: vRect.width,
          height: vRect.height,
        };

        const p1 = getStagePitchAndNormPos(
          { x: minPxX, y: minPxY },
          fullVRect,
          pitchTransform ?? {},
        );
        const p2 = getStagePitchAndNormPos(
          { x: maxPxX, y: maxPxY },
          fullVRect,
          pitchTransform ?? {},
        );

        const minNormX = Math.min(p1.normPos.x, p2.normPos.x);
        const maxNormX = Math.max(p1.normPos.x, p2.normPos.x);
        const minNormY = Math.min(p1.normPos.y, p2.normPos.y);
        const maxNormY = Math.max(p1.normPos.y, p2.normPos.y);

        const enclosed = getEnclosedObjects(
          annotations,
          {
            minNormX,
            maxNormX,
            minNormY,
            maxNormY,
          },
          teamVisibility,
        );
        selectObjects(enclosed, isShift);
      } else if (!isShift) {
        clearSelection();
      }

      selectionBoxRef.current = null;
      setSelectionBox(null);
      return true;
    }
    return false;
  }, [
    vRect.width,
    vRect.height,
    vRect.x,
    vRect.y,
    pitchTransform,
    teamVisibility,
    annotations,
    selectObjects,
    clearSelection,
  ]);

  return {
    selectionBox,
    handleSelectionDown,
    handleSelectionMove,
    handleSelectionUp,
  };
}
