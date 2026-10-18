'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeCursorZoomAdjustment,
  computePanDelta,
  computeWheelZoom,
  type PanStartState,
} from '../utils/canvas-zoom-pan-helper';
import { useCanvasStore } from './use-canvas-store';

export interface UseCanvasZoomPanOptions {
  vRect: { width: number; height: number };
  disabled?: boolean;
}

function getEventPos(
  e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent | WheelEvent>,
) {
  const stage = e.target.getStage();
  const pointer = stage?.getPointerPosition();
  if (pointer) return pointer;
  const evt = e.evt;
  return {
    x: 'clientX' in evt ? evt.clientX : 0,
    y: 'clientY' in evt ? evt.clientY : 0,
  };
}

export function useCanvasZoomPan({ vRect, disabled }: UseCanvasZoomPanOptions) {
  const pitchTransform = useCanvasStore((s) => s.pitchTransform);
  const setPitchTransform = useCanvasStore((s) => s.setPitchTransform);
  const isPitchLocked = Boolean(pitchTransform.isLocked);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<PanStartState>({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        if (isPanningRef.current) {
          isPanningRef.current = false;
          setIsPanning(false);
        }
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      if (disabled || isPitchLocked) return;
      const pos = getEventPos(e);
      const oldZoom = pitchTransform.zoom ?? 1;
      const nextZoom = computeWheelZoom(oldZoom, e.evt.deltaY);
      if (nextZoom === oldZoom) return;

      const { nextPanX, nextPanY } = computeCursorZoomAdjustment(
        pos,
        vRect,
        pitchTransform.panX ?? 0,
        pitchTransform.panY ?? 0,
        oldZoom,
        nextZoom,
      );
      setPitchTransform({ zoom: nextZoom, panX: nextPanX, panY: nextPanY });
    },
    [disabled, isPitchLocked, pitchTransform, setPitchTransform, vRect],
  );

  const handlePanPointerDown = useCallback(
    (e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
      if (disabled || isPitchLocked) return false;
      const isMiddle = 'button' in e.evt && e.evt.button === 1;
      if (!isSpacePressed && !isMiddle) return false;

      const pos = getEventPos(e);
      panStartRef.current = {
        x: pos.x,
        y: pos.y,
        panX: pitchTransform.panX ?? 0,
        panY: pitchTransform.panY ?? 0,
      };
      isPanningRef.current = true;
      setIsPanning(true);
      return true;
    },
    [
      disabled,
      isPitchLocked,
      isSpacePressed,
      pitchTransform.panX,
      pitchTransform.panY,
    ],
  );

  const handlePanPointerMove = useCallback(
    (e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
      if (!isPanningRef.current) return false;
      const pos = getEventPos(e);
      const { nextPanX, nextPanY } = computePanDelta(panStartRef.current, pos);
      setPitchTransform({ panX: nextPanX, panY: nextPanY });
      return true;
    },
    [setPitchTransform],
  );

  const handlePanPointerUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      return true;
    }
    return false;
  }, []);

  return {
    isPitchLocked,
    isPanning,
    isSpacePressed,
    handleWheel,
    handlePanPointerDown,
    handlePanPointerMove,
    handlePanPointerUp,
  };
}
