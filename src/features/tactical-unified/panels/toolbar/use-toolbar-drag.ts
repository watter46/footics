'use client';

/**
 * use-toolbar-drag.ts
 * Draggable toolbar position logic
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

export function useToolbarDrag() {
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    isDragging: boolean;
  }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    isDragging: false,
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;

      e.preventDefault();
      const pointerId = e.pointerId;
      const target = e.currentTarget;
      target.setPointerCapture(pointerId);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y,
        isDragging: true,
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!dragRef.current.isDragging) return;
        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;
        setPosition({
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        dragRef.current.isDragging = false;
        try {
          target.releasePointerCapture(upEvent.pointerId);
        } catch {
          // ignore
        }
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [position],
  );

  return { position, handlePointerDown };
}
