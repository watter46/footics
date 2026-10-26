/**
 * konva-slide-export.ts
 * Pure calculation and format export helpers for slide image rendering.
 */

import { zipSync } from 'fflate';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-export-engine';
import {
  calculatePitchRect,
  PITCH_BOUNDARY_CONFIGS,
} from '@/lib/tactical/pitch-geometry';
import type {
  AspectRatio,
  BoundaryBox,
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
}

export interface ExportSlidesArchiveOptions {
  slides: Slide[];
  aspectRatio: AspectRatio;
  scale?: number;
  stageWidth?: number;
  stageHeight?: number;
}

export async function renderSlideToPngBlob(
  options: RenderSlideImageOptions,
): Promise<Blob> {
  const config =
    PITCH_BOUNDARY_CONFIGS[options.aspectRatio] ??
    PITCH_BOUNDARY_CONFIGS['16:9'];
  const stageWidth = options.stageWidth ?? config.widthPx;
  const stageHeight = options.stageHeight ?? config.heightPx;
  const scale = options.scale ?? 2;
  const box =
    options.boundaryBox !== undefined
      ? options.boundaryBox
      : options.slide.boundaryBox;
  const pitchRect = calculatePitchRect(
    { width: stageWidth, height: stageHeight },
    options.aspectRatio,
  );
  const baseRect =
    box?.fitTarget === 'canvas'
      ? { x: 0, y: 0, width: stageWidth, height: stageHeight }
      : pitchRect;
  const crop = calculateBoundaryCrop(
    box,
    stageWidth,
    stageHeight,
    scale,
    baseRect,
  );
  const canvas = document.createElement('canvas');
  canvas.width = crop.exportWidth;
  canvas.height = crop.exportHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context from canvas');

  const playerPhotos = await preloadSlidePlayerPhotos([options.slide]);

  try {
    renderTacticalFrameToCanvas(ctx, {
      slides: [options.slide],
      timeMs: 0,
      width: crop.exportWidth,
      height: crop.exportHeight,
      aspectRatio: options.aspectRatio,
      boundaryBox: box,
      playerPhotos,
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
  const config =
    PITCH_BOUNDARY_CONFIGS[options.aspectRatio] ??
    PITCH_BOUNDARY_CONFIGS['16:9'];
  const stageWidth = options.stageWidth ?? config.widthPx;
  const stageHeight = options.stageHeight ?? config.heightPx;
  const files: Record<string, Uint8Array> = {};
  for (const slide of options.slides) {
    const blob = await renderSlideToPngBlob({
      slide,
      aspectRatio: options.aspectRatio,
      scale: options.scale,
      stageWidth,
      stageHeight,
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
