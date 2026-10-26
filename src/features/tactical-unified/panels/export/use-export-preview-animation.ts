'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';

export const PREVIEW_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  '16:9': { width: 640, height: 360 },
  '9:16': { width: 360, height: 640 },
  '4:5': { width: 360, height: 450 },
  '1:1': { width: 360, height: 360 },
};

export const ASPECT_CONTAINER_CLASSES: Record<AspectRatio, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16] max-h-[340px]',
  '4:5': 'aspect-[4/5] max-h-[340px]',
  '1:1': 'aspect-square max-h-[340px]',
};

export interface UseExportPreviewAnimationParams {
  slides: Slide[];
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  sliderRef: React.RefObject<HTMLInputElement | null>;
}

export function useAnimationFrameLoop(
  isPlaying: boolean,
  totalDurationMs: number,
  onFrame: (timeMs: number) => void,
) {
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = null;

    const loop = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - currentTimeRef.current;
      }

      const elapsed = timestamp - startTimeRef.current;
      currentTimeRef.current = elapsed % totalDurationMs;

      onFrame(currentTimeRef.current);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, totalDurationMs, onFrame]);

  useEffect(() => {
    onFrame(currentTimeRef.current);
  }, [onFrame]);

  const seek = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      startTimeRef.current = null;
      onFrame(time);
    },
    [onFrame],
  );

  return { seek };
}

export function useExportPreviewAnimation({
  slides,
  aspectRatio,
  boundaryBox,
  pitchTransform,
  photos,
  playerPhotos,
  canvasRef,
  timeLabelRef,
  sliderRef,
}: UseExportPreviewAnimationParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [internalBitmaps, setInternalBitmaps] = useState<
    Record<string, ImageBitmap>
  >({});
  const totalDurationMs = calculateUnifiedTotalDuration(slides) || 1000;

  useEffect(() => {
    if (playerPhotos) return;
    let isCancelled = false;
    let loadedMap: Record<string, ImageBitmap> = {};

    preloadSlidePlayerPhotos(slides, photos).then((map) => {
      if (isCancelled) {
        for (const bm of Object.values(map)) {
          bm?.close?.();
        }
        return;
      }
      loadedMap = map;
      setInternalBitmaps(map);
    });

    return () => {
      isCancelled = true;
      for (const bm of Object.values(loadedMap)) {
        bm?.close?.();
      }
    };
  }, [slides, photos, playerPhotos]);

  const effectivePlayerPhotos = playerPhotos ?? internalBitmaps;

  const { width: previewWidth, height: previewHeight } =
    PREVIEW_DIMENSIONS[aspectRatio] ?? PREVIEW_DIMENSIONS['16:9'];

  const mvpMatrix = useMemo(() => {
    if (!pitchTransform) return null;
    return new Float32Array(
      buildExportMVPMatrix(
        pitchTransform,
        previewWidth,
        previewHeight,
        aspectRatio,
      ),
    );
  }, [pitchTransform, previewWidth, previewHeight, aspectRatio]);

  // ── Canvas Frame Drawing ──
  const drawFrame = useCallback(
    (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderTacticalFrameToCanvas(ctx, {
        slides,
        timeMs,
        width: canvas.width,
        height: canvas.height,
        aspectRatio,
        boundaryBox,
        transparent: false,
        mvpMatrix,
        playerPhotos: effectivePlayerPhotos,
      });

      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = `${(timeMs / 1000).toFixed(1)}s`;
      }
      if (sliderRef.current) {
        sliderRef.current.value = String(Math.round(timeMs));
      }
    },
    [
      slides,
      boundaryBox,
      aspectRatio,
      mvpMatrix,
      effectivePlayerPhotos,
      canvasRef,
      timeLabelRef,
      sliderRef,
    ],
  );

  const { seek } = useAnimationFrameLoop(isPlaying, totalDurationMs, drawFrame);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    seek(0);
  }, [seek]);

  return {
    isPlaying,
    totalDurationMs,
    previewWidth,
    previewHeight,
    togglePlay,
    handleReset,
    handleSeek: seek,
  };
}
