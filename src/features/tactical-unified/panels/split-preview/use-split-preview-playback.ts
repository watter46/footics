'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PreviewCanvasStoreApi } from '@/features/tactical-unified/adapters/preview-canvas-store-adapter';
import { useAnimationFrameLoop } from '@/features/tactical-unified/panels/export/use-animation-frame-loop';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';

export interface UseSplitPreviewPlaybackParams {
  store: PreviewCanvasStoreApi;
  slides: Slide[];
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  sliderRef: React.RefObject<HTMLInputElement | null>;
}

export function useSplitPreviewPlayback({
  store,
  slides,
  timeLabelRef,
  sliderRef,
}: UseSplitPreviewPlaybackParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const totalDurationMs = calculateUnifiedTotalDuration(slides) || 1000;

  const onFrame = useCallback(
    (timeMs: number) => {
      if (isPlaying) {
        store.setPlaybackTime(timeMs);
        if (timeLabelRef.current) {
          timeLabelRef.current.textContent = `${(timeMs / 1000).toFixed(1)}s`;
        }
        if (sliderRef.current) {
          sliderRef.current.value = String(Math.round(timeMs));
        }
      }
    },
    [isPlaying, store, timeLabelRef, sliderRef],
  );

  const { seek } = useAnimationFrameLoop(isPlaying, totalDurationMs, onFrame);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (!next) {
        store.setPlaybackTime(null);
      }
      return next;
    });
  }, [store]);

  const handleReset = useCallback(() => {
    seek(0);
    if (!isPlaying) {
      store.setPlaybackTime(null);
    }
    if (timeLabelRef.current) {
      timeLabelRef.current.textContent = '0.0s';
    }
    if (sliderRef.current) {
      sliderRef.current.value = '0';
    }
  }, [isPlaying, seek, store, timeLabelRef, sliderRef]);

  const handleSeek = useCallback(
    (time: number) => {
      seek(time);
      store.setPlaybackTime(time);
      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = `${(time / 1000).toFixed(1)}s`;
      }
      if (sliderRef.current) {
        sliderRef.current.value = String(Math.round(time));
      }
    },
    [seek, store, timeLabelRef, sliderRef],
  );

  // アンマウント時の原状回復 (RAII)
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => {
    return () => {
      storeRef.current.setPlaybackTime(null);
    };
  }, []);

  return {
    isPlaying,
    totalDurationMs,
    togglePlay,
    handleReset,
    handleSeek,
  };
}
