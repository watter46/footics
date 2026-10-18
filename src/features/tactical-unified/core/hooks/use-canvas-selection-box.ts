'use client';

import { useCallback, useState } from 'react';
import {
  getEnclosedObjects,
  type SelectionBox,
} from '../utils/canvas-selection-helpers';
import { useCanvasStore } from './use-canvas-store';

export type { SelectionBox };

export interface UseCanvasSelectionBoxOptions {
  vRect: { width: number; height: number };
}

export function useCanvasSelectionBox({ vRect }: UseCanvasSelectionBoxOptions) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObjects = useCanvasStore((s) => s.selectObjects);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const annotations = useCanvasStore((s) => s.annotations);

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const handleSelectionDown = useCallback(
    (pixelPos: { x: number; y: number }, isBg: boolean, isShift: boolean) => {
      if (activeTool === 'select' && isBg) {
        setSelectionBox({
          startX: pixelPos.x,
          startY: pixelPos.y,
          currentX: pixelPos.x,
          currentY: pixelPos.y,
          isShift,
        });
        return true;
      }
      return false;
    },
    [activeTool],
  );

  const handleSelectionMove = useCallback(
    (pixelPos: { x: number; y: number }) => {
      if (selectionBox) {
        setSelectionBox((prev) =>
          prev
            ? {
                ...prev,
                currentX: pixelPos.x,
                currentY: pixelPos.y,
              }
            : null,
        );
        return true;
      }
      return false;
    },
    [selectionBox],
  );

  const handleSelectionUp = useCallback(() => {
    if (selectionBox) {
      const { startX, startY, currentX, currentY, isShift } = selectionBox;
      const dist = Math.hypot(currentX - startX, currentY - startY);

      if (dist >= 5 && vRect.width > 0 && vRect.height > 0) {
        const minPxX = Math.min(startX, currentX);
        const maxPxX = Math.max(startX, currentX);
        const minPxY = Math.min(startY, currentY);
        const maxPxY = Math.max(startY, currentY);

        const minNormX = (minPxX / vRect.width) * 100;
        const maxNormX = (maxPxX / vRect.width) * 100;
        const minNormY = (minPxY / vRect.height) * 100;
        const maxNormY = (maxPxY / vRect.height) * 100;

        const enclosed = getEnclosedObjects(annotations, {
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
    vRect.width,
    vRect.height,
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
