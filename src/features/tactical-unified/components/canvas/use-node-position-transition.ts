'use client';

import Konva from 'konva';
import { useEffect, useRef } from 'react';

export interface UseNodePositionTransitionOptions {
  nodeRef: React.RefObject<Konva.Group | Konva.Shape | null>;
  x: number;
  y: number;
  duration?: number;
  disabled?: boolean;
}

/**
 * Smoothly tweens a Konva node position (Group / Shape) when coordinates change,
 * bypassing tweening during dragging or on initial mount.
 */
export function useNodePositionTransition({
  nodeRef,
  x,
  y,
  duration = 0.28,
  disabled = false,
}: UseNodePositionTransitionOptions): void {
  const isFirstMount = useRef(true);
  const prevPosRef = useRef({ x, y });

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevPosRef.current = { x, y };
      node.position({ x, y });
      return;
    }

    if (
      disabled ||
      (typeof (node as any).isDragging === 'function' &&
        (node as any).isDragging())
    ) {
      prevPosRef.current = { x, y };
      node.position({ x, y });
      return;
    }

    const prev = prevPosRef.current;
    const dist = Math.hypot(x - prev.x, y - prev.y);
    prevPosRef.current = { x, y };

    if (dist > 1) {
      node.to({
        x,
        y,
        duration,
        easing: Konva.Easings.EaseInOut,
      });
    } else {
      node.position({ x, y });
    }
  }, [x, y, disabled, duration, nodeRef]);
}
