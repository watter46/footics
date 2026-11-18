'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import { calculateVirtualCanvasRect } from '../utils/virtual-canvas-rect';

export interface UseCanvasViewportParams {
  imageAspect?: number;
  paddingRatio?: number;
  onStageSizeChange?: (size: { width: number; height: number }) => void;
}

export interface UseCanvasViewportResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerSize: { width: number; height: number };
  vRect: PitchRectBounds;
}

export function useCanvasViewport({
  imageAspect,
  paddingRatio = 0,
  onStageSizeChange,
}: UseCanvasViewportParams = {}): UseCanvasViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const hasInitializedSizeRef = useRef(false);
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const applySize = (nextWidth: number, nextHeight: number) => {
      setContainerSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);

      if (!hasInitializedSizeRef.current && nextWidth > 0 && nextHeight > 0) {
        hasInitializedSizeRef.current = true;
        applySize(nextWidth, nextHeight);
        return;
      }

      pendingSizeRef.current = { width: nextWidth, height: nextHeight };
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const next = pendingSizeRef.current;
        pendingSizeRef.current = null;
        if (!next) return;
        applySize(next.width, next.height);
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingSizeRef.current = null;
    };
  }, []);

  const effectiveAspect = imageAspect ?? 16 / 9;

  const rawVRect = useMemo(
    () =>
      calculateVirtualCanvasRect(
        containerSize,
        effectiveAspect,
        1920,
        paddingRatio,
      ),
    [containerSize, effectiveAspect, paddingRatio],
  );

  const prevVRectRef = useRef<PitchRectBounds>(rawVRect);
  const vRect = useMemo(() => {
    const prev = prevVRectRef.current;
    if (
      prev &&
      prev.x === rawVRect.x &&
      prev.y === rawVRect.y &&
      prev.width === rawVRect.width &&
      prev.height === rawVRect.height
    ) {
      return prev;
    }
    prevVRectRef.current = rawVRect;
    return rawVRect;
  }, [rawVRect]);

  useEffect(() => {
    if (vRect.width > 0 && vRect.height > 0) {
      onStageSizeChange?.({ width: vRect.width, height: vRect.height });
    }
  }, [vRect.width, vRect.height, onStageSizeChange]);

  return {
    containerRef,
    containerSize,
    vRect,
  };
}
