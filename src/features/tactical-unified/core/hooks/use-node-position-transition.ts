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
  const tweenRef = useRef<Konva.Tween | null>(null);

  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.destroy();
        tweenRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const stopTween = () => {
      if (tweenRef.current) {
        tweenRef.current.destroy();
        tweenRef.current = null;
      }
    };

    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevPosRef.current = { x, y };
      stopTween();
      node.position({ x, y });
      return;
    }

    if (typeof node.isDragging === 'function' && node.isDragging()) {
      prevPosRef.current = { x, y };
      stopTween();
      return;
    }

    if (disabled) {
      prevPosRef.current = { x, y };
      stopTween();
      node.position({ x, y });
      return;
    }

    const prev = prevPosRef.current;
    const dist = Math.hypot(x - prev.x, y - prev.y);
    prevPosRef.current = { x, y };

    stopTween();

    if (dist > 1) {
      const tween = new Konva.Tween({
        node,
        x,
        y,
        duration,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          if (tweenRef.current === tween) {
            tween.destroy();
            tweenRef.current = null;
          }
        },
      });
      tweenRef.current = tween;
      tween.play();
    } else {
      node.position({ x, y });
    }
  }, [x, y, disabled, duration, nodeRef]);
}
