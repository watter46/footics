'use client';

import { useCallback, useRef, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { PitchTransform } from '@/lib/types/tactical-unified';
import { useCanvasSpaceKey } from './use-canvas-space-key';

interface UseCanvasPitchPanOptions {
  activeSlideId: string;
  isPitchLocked: boolean;
  pitchTransformRef: React.MutableRefObject<PitchTransform>;
  applyPitchTransformToNodes: (
    panX: number,
    panY: number,
    zoom: number,
  ) => void;
}

export function useCanvasPitchPan({
  activeSlideId,
  isPitchLocked,
  pitchTransformRef,
  applyPitchTransformToNodes,
}: UseCanvasPitchPanOptions) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const updatePitchTransform = useTacticalUnifiedStore(
    (s) => s.updatePitchTransform,
  );
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);

  const [isPanning, setIsPanning] = useState(false);
  const { isSpacePressed, isSpacePressedRef } = useCanvasSpaceKey();
  const panStateRef = useRef<{
    isPanning: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    hasMoved: boolean;
  } | null>(null);

  const handlePointerDown = useCallback(
    (pos: { x: number; y: number }, isBg: boolean) => {
      const isSpace = isSpacePressedRef.current;
      const shouldPan =
        isSpace || (activeTool === 'select' && !isPitchLocked && isBg);
      if (shouldPan) {
        const panX = pitchTransformRef.current.panX ?? 0;
        const panY = pitchTransformRef.current.panY ?? 0;
        panStateRef.current = {
          isPanning: true,
          startX: pos.x,
          startY: pos.y,
          startPanX: panX,
          startPanY: panY,
          hasMoved: false,
        };
        setIsPanning(true);
        return true;
      }
      return false;
    },
    [activeTool, isPitchLocked, isSpacePressedRef, pitchTransformRef],
  );

  const handlePointerMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (panStateRef.current?.isPanning) {
        const dx = pos.x - panStateRef.current.startX;
        const dy = pos.y - panStateRef.current.startY;
        if (!panStateRef.current.hasMoved && Math.hypot(dx, dy) >= 4) {
          panStateRef.current.hasMoved = true;
        }
        const newPanX = panStateRef.current.startPanX + dx;
        const newPanY = panStateRef.current.startPanY + dy;
        applyPitchTransformToNodes(
          newPanX,
          newPanY,
          pitchTransformRef.current.zoom ?? 1,
        );
        return true;
      }
      return false;
    },
    [applyPitchTransformToNodes, pitchTransformRef],
  );

  const handlePointerUp = useCallback(() => {
    if (panStateRef.current?.isPanning) {
      const { hasMoved } = panStateRef.current;
      panStateRef.current = null;
      setIsPanning(false);
      if (hasMoved) {
        updatePitchTransform(activeSlideId, {
          panX: pitchTransformRef.current.panX,
          panY: pitchTransformRef.current.panY,
        });
      } else {
        clearSelection();
      }
      return true;
    }
    return false;
  }, [activeSlideId, clearSelection, updatePitchTransform, pitchTransformRef]);

  return {
    isPanning,
    isSpacePressed,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
