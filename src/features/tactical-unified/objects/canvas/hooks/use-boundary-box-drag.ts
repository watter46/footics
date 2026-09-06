'use client';

import { useCallback, useRef } from 'react';
import type { BoundaryBox as BoundaryBoxType } from '@/lib/types/tactical-unified';
import { pxToNorm } from '../helpers';

export type CornerId = 'tl' | 'tr' | 'br' | 'bl';

interface UseBoundaryBoxDragParams {
  box: BoundaryBoxType;
  baseRect: { x: number; y: number; width: number; height: number };
  pxX: number;
  pxY: number;
  pxW: number;
  pxH: number;
  onUpdate: (box: BoundaryBoxType) => void;
}

function calculateNewBox(
  cornerId: CornerId,
  deltaX: number,
  deltaY: number,
  start: { x: number; y: number; w: number; h: number },
) {
  let { x, y, w, h } = start;
  if (cornerId === 'br') {
    w = Math.max(20, start.w + deltaX);
    h = Math.max(20, start.h + deltaY);
  } else if (cornerId === 'tr') {
    w = Math.max(20, start.w + deltaX);
    const clampedDeltaY = Math.min(deltaY, start.h - 20);
    h = start.h - clampedDeltaY;
    y = start.y + clampedDeltaY;
  } else if (cornerId === 'tl') {
    const clampedDeltaX = Math.min(deltaX, start.w - 20);
    const clampedDeltaY = Math.min(deltaY, start.h - 20);
    w = start.w - clampedDeltaX;
    h = start.h - clampedDeltaY;
    x = start.x + clampedDeltaX;
    y = start.y + clampedDeltaY;
  } else if (cornerId === 'bl') {
    const clampedDeltaX = Math.min(deltaX, start.w - 20);
    w = start.w - clampedDeltaX;
    h = Math.max(20, start.h + deltaY);
    x = start.x + clampedDeltaX;
  }
  return { x, y, w, h };
}

export function useBoundaryBoxDrag({
  box,
  baseRect,
  pxX,
  pxY,
  pxW,
  pxH,
  onUpdate,
}: UseBoundaryBoxDragParams) {
  const { width, height } = baseRect;
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    box: BoundaryBoxType;
    px: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const handleCornerPointerDown = useCallback(
    (cornerId: CornerId, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        box,
        px: { x: pxX, y: pxY, w: pxW, h: pxH },
      };

      const handlePointerMove = (evt: Event) => {
        if (!dragStartRef.current || width <= 0 || height <= 0) return;
        const moveEvent = evt as PointerEvent;
        const deltaX = moveEvent.clientX - dragStartRef.current.pointerX;
        const deltaY = moveEvent.clientY - dragStartRef.current.pointerY;

        const next = calculateNewBox(
          cornerId,
          deltaX,
          deltaY,
          dragStartRef.current.px,
        );

        onUpdate({
          ...dragStartRef.current.box,
          x: pxToNorm(next.x - baseRect.x, width),
          y: pxToNorm(next.y - baseRect.y, height),
          width: pxToNorm(next.w, width),
          height: pxToNorm(next.h, height),
          enabled: true,
        });
      };

      const handlePointerUp = () => {
        target.removeEventListener('pointermove', handlePointerMove);
        target.removeEventListener('pointerup', handlePointerUp);
        target.removeEventListener('pointercancel', handlePointerUp);
        dragStartRef.current = null;
      };

      target.addEventListener('pointermove', handlePointerMove);
      target.addEventListener('pointerup', handlePointerUp);
      target.addEventListener('pointercancel', handlePointerUp);
    },
    [box, pxX, pxY, pxW, pxH, width, height, baseRect.x, baseRect.y, onUpdate],
  );

  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as SVGElement;
      target.setPointerCapture(e.pointerId);

      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        box,
        px: { x: pxX, y: pxY, w: pxW, h: pxH },
      };

      const handlePointerMove = (evt: Event) => {
        if (!dragStartRef.current || width <= 0 || height <= 0) return;
        const moveEvent = evt as PointerEvent;
        const deltaX = moveEvent.clientX - dragStartRef.current.pointerX;
        const deltaY = moveEvent.clientY - dragStartRef.current.pointerY;

        const deltaNormX = pxToNorm(deltaX, width);
        const deltaNormY = pxToNorm(deltaY, height);

        onUpdate({
          ...dragStartRef.current.box,
          x: dragStartRef.current.box.x + deltaNormX,
          y: dragStartRef.current.box.y + deltaNormY,
          enabled: true,
        });
      };

      const handlePointerUp = () => {
        target.removeEventListener('pointermove', handlePointerMove);
        target.removeEventListener('pointerup', handlePointerUp);
        target.removeEventListener('pointercancel', handlePointerUp);
        dragStartRef.current = null;
      };

      target.addEventListener('pointermove', handlePointerMove);
      target.addEventListener('pointerup', handlePointerUp);
      target.addEventListener('pointercancel', handlePointerUp);
    },
    [box, width, height, onUpdate, pxX, pxY, pxW, pxH],
  );

  return {
    handleCornerPointerDown,
    handleBoxPointerDown,
  };
}
