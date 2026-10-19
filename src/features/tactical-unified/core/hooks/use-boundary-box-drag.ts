'use client';

import { useCallback, useRef } from 'react';
import type { BoundaryBox as BoundaryBoxType } from '@/lib/types/tactical-unified';
import {
  attachDragListeners,
  type CornerId,
  calculateNewBox,
  type DragContext,
  type UseBoundaryBoxDragParams,
} from '../utils/boundary-box-drag-helper';
import { pxToNorm } from '../utils/canvas-coordinates';

export type { CornerId, UseBoundaryBoxDragParams };

export function useBoundaryBoxDrag({
  box,
  baseRect,
  pxX,
  pxY,
  pxW,
  pxH,
  onUpdate,
  onCommit,
}: UseBoundaryBoxDragParams) {
  const { width, height } = baseRect;
  const dragStartRef = useRef<DragContext | null>(null);

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
        latestBox: box,
      };

      attachDragListeners(
        target,
        (moveEvent) => {
          if (!dragStartRef.current || width <= 0 || height <= 0) return;
          const next = calculateNewBox(
            cornerId,
            moveEvent.clientX - dragStartRef.current.pointerX,
            moveEvent.clientY - dragStartRef.current.pointerY,
            dragStartRef.current.px,
          );
          const updated: BoundaryBoxType = {
            ...dragStartRef.current.box,
            x: pxToNorm(next.x - baseRect.x, width),
            y: pxToNorm(next.y - baseRect.y, height),
            width: pxToNorm(next.w, width),
            height: pxToNorm(next.h, height),
            enabled: true,
          };
          dragStartRef.current.latestBox = updated;
          onUpdate(updated);
        },
        () => {
          if (dragStartRef.current && onCommit) {
            onCommit(dragStartRef.current.latestBox);
          }
          dragStartRef.current = null;
        },
      );
    },
    [
      box,
      pxX,
      pxY,
      pxW,
      pxH,
      width,
      height,
      baseRect.x,
      baseRect.y,
      onUpdate,
      onCommit,
    ],
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
        latestBox: box,
      };

      attachDragListeners(
        target,
        (moveEvent) => {
          if (!dragStartRef.current || width <= 0 || height <= 0) return;
          const deltaX = moveEvent.clientX - dragStartRef.current.pointerX;
          const deltaY = moveEvent.clientY - dragStartRef.current.pointerY;
          const updated: BoundaryBoxType = {
            ...dragStartRef.current.box,
            x: dragStartRef.current.box.x + pxToNorm(deltaX, width),
            y: dragStartRef.current.box.y + pxToNorm(deltaY, height),
            enabled: true,
          };
          dragStartRef.current.latestBox = updated;
          onUpdate(updated);
        },
        () => {
          if (dragStartRef.current && onCommit) {
            onCommit(dragStartRef.current.latestBox);
          }
          dragStartRef.current = null;
        },
      );
    },
    [box, width, height, onUpdate, onCommit, pxX, pxY, pxW, pxH],
  );

  return {
    handleCornerPointerDown,
    handleBoxPointerDown,
  };
}
