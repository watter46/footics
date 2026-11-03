'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import type {
  PitchAppearanceConfig,
  Slide,
} from '@/lib/types/tactical-unified';
import { getCachedMarbleImage, loadMarbleTexture } from './load-marble-texture';

export interface UseExportPreviewTexturesParams {
  slides: Slide[];
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
}

export function useExportPreviewTextures({
  slides,
  photos,
  playerPhotos,
  pitchAppearance,
}: UseExportPreviewTexturesParams) {
  const [internalBitmaps, setInternalBitmaps] = useState<
    Record<string, ImageBitmap>
  >(() => ({}));
  const loadedBitmapsRef = useRef<Record<string, ImageBitmap>>({});
  const [marbleTexture, setMarbleTexture] = useState<HTMLImageElement | null>(
    () => getCachedMarbleImage(),
  );

  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  // アンマウント時に ImageBitmap を一括 close (RAII)
  useEffect(
    () => () => {
      for (const bm of Object.values(loadedBitmapsRef.current)) bm?.close?.();
      loadedBitmapsRef.current = {};
    },
    [],
  );

  const photoSignature = useMemo(() => {
    const playerIds = slides.flatMap((s) =>
      (s.players ?? [])
        .filter((p) => p.style?.insideContent === 'photo')
        .map((p) => `${p.id}:${p.playerId ?? ''}`),
    );
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
    const cached = getCachedMarbleImage();
    if (cached?.complete && cached.naturalWidth > 0) {
      if (marbleTexture !== cached) {
        setMarbleTexture(cached);
      }
      return;
    }
    let isCancelled = false;
    loadMarbleTexture()
      .then((img) => !isCancelled && setMarbleTexture(img))
      .catch((err) =>
        console.warn(
          '[useExportPreviewTextures] Failed to load marble texture:',
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
          if (!loadedBitmapsRef.current[key]) bm?.close?.();
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

  return {
    effectivePlayerPhotos,
    marbleTexture,
  };
}
