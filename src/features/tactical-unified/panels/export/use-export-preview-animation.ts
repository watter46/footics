'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
import { useAnimationFrameLoop } from './use-animation-frame-loop';

export { useAnimationFrameLoop };

export const PREVIEW_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
};

export const ASPECT_CONTAINER_CLASSES: Record<AspectRatio, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16] max-h-[340px]',
  '4:5': 'aspect-[4/5] max-h-[340px]',
  '1:1': 'aspect-square max-h-[340px]',
};

export const SPLIT_PREVIEW_CONTAINER_CLASSES: Record<AspectRatio, string> = {
  '16:9': 'aspect-video w-full max-h-full',
  '9:16': 'aspect-[9/16] h-full max-h-full w-auto max-w-full',
  '4:5': 'aspect-[4/5] h-full max-h-full w-auto max-w-full',
  '1:1': 'aspect-square h-full max-h-full w-auto max-w-full',
};

export function hasActivePitchTransform(pt?: PitchTransform | null): boolean {
  if (!pt) return false;
  return (
    pt.tilt !== 0 ||
    (pt.yaw !== undefined && pt.yaw !== 90) ||
    pt.zoom !== 1 ||
    pt.panX !== 0 ||
    pt.panY !== 0
  );
}

export interface UseExportPreviewAnimationParams {
  slides: Slide[];
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  sliderRef: React.RefObject<HTMLInputElement | null>;
}

let cachedMarbleImage: HTMLImageElement | null = null;
let marbleImagePromise: Promise<HTMLImageElement> | null = null;

function loadMarbleTexture(): Promise<HTMLImageElement> {
  if (cachedMarbleImage?.complete && cachedMarbleImage.naturalWidth > 0) {
    return Promise.resolve(cachedMarbleImage);
  }
  if (!marbleImagePromise) {
    marbleImagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      if (typeof Image === 'undefined') {
        reject(new Error('Image is not available'));
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        cachedMarbleImage = img;
        resolve(img);
      };
      img.onerror = (e) => {
        marbleImagePromise = null;
        reject(e);
      };
      img.src = '/assets/pitch-marble-texture.jpg';
    });
  }
  return marbleImagePromise;
}

export function useExportPreviewAnimation({
  slides,
  aspectRatio,
  boundaryBox,
  pitchTransform,
  photos,
  playerPhotos,
  pitchAppearance,
  canvasRef,
  timeLabelRef,
  sliderRef,
}: UseExportPreviewAnimationParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [internalBitmaps, setInternalBitmaps] = useState<
    Record<string, ImageBitmap>
  >({});
  const loadedBitmapsRef = useRef<Record<string, ImageBitmap>>({});
  const [marbleTexture, setMarbleTexture] = useState<HTMLImageElement | null>(
    () => cachedMarbleImage,
  );
  const totalDurationMs = calculateUnifiedTotalDuration(slides) || 1000;

  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  // コンポーネント／フックのアンマウント時にのみ、保持していた全 ImageBitmap を一括 close (RAII)
  useEffect(
    () => () => {
      for (const bm of Object.values(loadedBitmapsRef.current)) bm?.close?.();
      loadedBitmapsRef.current = {};
    },
    [],
  );

  const photoSignature = useMemo(() => {
    const playerIds: string[] = [];
    for (const slide of slides) {
      for (const player of slide.players ?? []) {
        if (player.style?.insideContent === 'photo') {
          playerIds.push(`${player.id}:${player.playerId ?? ''}`);
        }
      }
    }
    const photoEntries = photos
      ? Object.entries(photos)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join(';')
      : '';
    return `${playerIds.join(',')}|${photoEntries}`;
  }, [slides, photos]);

  useEffect(() => {
    if (pitchAppearance?.pitchBackgroundType !== 'marble') return;
    if (cachedMarbleImage?.complete && cachedMarbleImage.naturalWidth > 0) {
      if (marbleTexture !== cachedMarbleImage) {
        setMarbleTexture(cachedMarbleImage);
      }
      return;
    }
    let isCancelled = false;
    loadMarbleTexture()
      .then((img) => !isCancelled && setMarbleTexture(img))
      .catch((err) =>
        console.warn(
          '[useExportPreviewAnimation] Failed to load marble texture:',
          err,
        ),
      );
    return () => {
      isCancelled = true;
    };
  }, [pitchAppearance?.pitchBackgroundType, marbleTexture]);

  useEffect(() => {
    if (playerPhotos) return;
    let isCancelled = false;

    preloadSlidePlayerPhotos(slidesRef.current, photos).then((map) => {
      if (isCancelled) {
        for (const [key, bm] of Object.entries(map)) {
          if (!loadedBitmapsRef.current[key]) {
            bm?.close?.();
          }
        }
        return;
      }
      loadedBitmapsRef.current = { ...loadedBitmapsRef.current, ...map };
      setInternalBitmaps((prev) => ({ ...prev, ...map }));
    });

    return () => {
      isCancelled = true;
    };
  }, [photoSignature, photos, playerPhotos]);

  const effectivePlayerPhotos = playerPhotos ?? internalBitmaps;

  const { width: previewWidth, height: previewHeight } =
    PREVIEW_DIMENSIONS[aspectRatio] ?? PREVIEW_DIMENSIONS['16:9'];

  const mvpMatrix = useMemo(() => {
    if (
      slides.length > 1 ||
      !hasActivePitchTransform(pitchTransform) ||
      !pitchTransform
    ) {
      return null;
    }
    return new Float32Array(
      buildExportMVPMatrix(
        pitchTransform,
        previewWidth,
        previewHeight,
        aspectRatio,
      ),
    );
  }, [slides.length, pitchTransform, previewWidth, previewHeight, aspectRatio]);

  const isBoundaryActive = Boolean(
    boundaryBox?.enabled &&
      boundaryBox.width > 0 &&
      boundaryBox.height > 0 &&
      (boundaryBox.width < 100 ||
        boundaryBox.height < 100 ||
        boundaryBox.x > 0 ||
        boundaryBox.y > 0),
  );

  const previewAspectStyle = useMemo(() => {
    if (!isBoundaryActive || !boundaryBox) return undefined;
    const cropW = Math.max(
      1,
      Math.round(previewWidth * (boundaryBox.width / 100)),
    );
    const cropH = Math.max(
      1,
      Math.round(previewHeight * (boundaryBox.height / 100)),
    );
    return `${cropW} / ${cropH}`;
  }, [isBoundaryActive, boundaryBox, previewWidth, previewHeight]);

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
        pitchAppearance,
        marbleTexture,
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
      pitchAppearance,
      marbleTexture,
      canvasRef,
      timeLabelRef,
      sliderRef,
    ],
  );

  const { seek } = useAnimationFrameLoop(isPlaying, totalDurationMs, drawFrame);
  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);
  const handleReset = useCallback(() => seek(0), [seek]);

  return {
    isPlaying,
    totalDurationMs,
    previewWidth,
    previewHeight,
    previewAspectStyle,
    togglePlay,
    handleReset,
    handleSeek: seek,
  };
}
