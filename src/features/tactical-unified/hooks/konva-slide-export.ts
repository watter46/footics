/**
 * konva-slide-export.ts
 * Pure calculation and format export helpers for slide image rendering.
 */

import { zipSync } from 'fflate';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface RenderSlideImageOptions {
  slide: Slide;
  aspectRatio: AspectRatio;
  scale?: number;
  stageWidth?: number;
  stageHeight?: number;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  directorCamera?: DirectorCameraTrack | null;
  pitchAppearance?: PitchAppearanceConfig;
  screenBackground?: ScreenBackgroundConfig;
  teamVisibility?: 'both' | 'home' | 'away';
}

export interface ExportSlidesArchiveOptions {
  slides: Slide[];
  aspectRatio: AspectRatio;
  scale?: number;
  stageWidth?: number;
  stageHeight?: number;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  directorCamera?: DirectorCameraTrack | null;
  pitchAppearance?: PitchAppearanceConfig;
  screenBackground?: ScreenBackgroundConfig;
  teamVisibility?: 'both' | 'home' | 'away';
}

export async function renderSlideToPngBlob(
  options: RenderSlideImageOptions,
): Promise<Blob> {
  const stageWidth = options.stageWidth ?? 1920;
  const stageHeight = options.stageHeight ?? 1080;
  const scale = options.scale ?? 1;
  const box =
    options.boundaryBox !== undefined
      ? options.boundaryBox
      : options.slide.boundaryBox;
  const crop = calculateBoundaryCrop(box, stageWidth, stageHeight, scale);
  const canvas = document.createElement('canvas');
  canvas.width = crop.exportWidth;
  canvas.height = crop.exportHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context from canvas');

  const playerPhotos = await preloadSlidePlayerPhotos([options.slide]);
  const phase = normalizePhases({
    slides: [options.slide],
    aspectRatio: options.aspectRatio,
    boundaryBox: box,
    directorCamera: options.directorCamera ?? null,
  })[0];

  try {
    renderTacticalFrameToCanvas(ctx, {
      slides: [options.slide],
      phase,
      timeMs: 0,
      width: crop.exportWidth,
      height: crop.exportHeight,
      baseWidth: stageWidth,
      baseHeight: stageHeight,
      aspectRatio: options.aspectRatio,
      boundaryBox: box,
      pitchTransform:
        options.pitchTransform !== undefined
          ? options.pitchTransform
          : (options.slide.pitchTransform ?? null),
      directorCamera: options.directorCamera ?? null,
      pitchAppearance: options.pitchAppearance,
      screenBackground: options.screenBackground,
      teamVisibility: options.teamVisibility,
      playerPhotos,
      applyEffects: false,
    });

    const blob: Blob | null = await new Promise((resolve) => {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((b) => resolve(b), 'image/png');
      } else {
        resolve(null);
      }
    });
    if (blob) return blob;
    if (typeof canvas.toDataURL === 'function') {
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl) return await dataUrlToBlob(dataUrl);
    }
    throw new Error('Failed to create PNG blob from canvas');
  } finally {
    for (const bitmap of Object.values(playerPhotos)) {
      bitmap?.close?.();
    }
  }
}

export async function exportSingleSlidePng(
  options: RenderSlideImageOptions,
): Promise<void> {
  const blob = await renderSlideToPngBlob(options);
  const filename = `tactical-slide-${String(options.slide.index + 1).padStart(2, '0')}.png`;
  downloadBlob(blob, filename);
}

export async function exportAllSlidesZip(
  options: ExportSlidesArchiveOptions,
): Promise<void> {
  const stageWidth = options.stageWidth ?? 1920;
  const stageHeight = options.stageHeight ?? 1080;
  const files: Record<string, Uint8Array> = {};
  for (const slide of options.slides) {
    const blob = await renderSlideToPngBlob({
      slide,
      aspectRatio: options.aspectRatio,
      scale: options.scale ?? 1,
      stageWidth,
      stageHeight,
      boundaryBox:
        options.boundaryBox !== undefined
          ? options.boundaryBox
          : slide.boundaryBox,
      pitchTransform:
        options.pitchTransform !== undefined
          ? options.pitchTransform
          : (slide.pitchTransform ?? null),
      directorCamera: options.directorCamera ?? null,
      pitchAppearance: options.pitchAppearance,
      screenBackground: options.screenBackground,
      teamVisibility: options.teamVisibility,
    });
    const buffer = await blob.arrayBuffer();
    files[`slide-${String(slide.index + 1).padStart(2, '0')}.png`] =
      new Uint8Array(buffer);
  }

  const zipped = zipSync(files, { level: 6 });
  const zipBlob = new Blob([zipped], {
    type: 'application/zip',
  });
  downloadBlob(zipBlob, 'tactical-slides.zip');
}
