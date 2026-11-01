'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ASPECT_RATIOS } from '@/lib/types/tactical-unified';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import { calculateVirtualCanvasRect } from '../utils/virtual-canvas-rect';
import { useCanvasStore } from './use-canvas-store';

export interface UseCanvasViewportParams {
  imageAspect?: number;
  onStageSizeChange?: (size: { width: number; height: number }) => void;
}

export interface UseCanvasViewportResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerSize: { width: number; height: number };
  vRect: PitchRectBounds;
}

export function useCanvasViewport({
  imageAspect,
  onStageSizeChange,
}: UseCanvasViewportParams = {}): UseCanvasViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const nextWidth = Math.floor(entry.contentRect.width);
        const nextHeight = Math.floor(entry.contentRect.height);
        setContainerSize((prev) => {
          if (prev.width === nextWidth && prev.height === nextHeight) {
            return prev;
          }
          return { width: nextWidth, height: nextHeight };
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const storeAspectRatio = useCanvasStore((s) => s.aspectRatio);
  const effectiveAspect =
    imageAspect ??
    (storeAspectRatio ? ASPECT_RATIOS[storeAspectRatio] : undefined) ??
    (containerSize.height > 0 ? containerSize.width / containerSize.height : 1);

  const paddingRatio = useCanvasStore((s) => s.capabilities?.paddingRatio ?? 0);

  const rawVRect = useMemo(
    () =>
      calculateVirtualCanvasRect(
        containerSize,
        effectiveAspect,
        undefined,
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
