/**
 * konva-export-helpers.ts
 * Pure calculation and format export helpers for Konva canvas pipeline.
 */

import { zipSync } from 'fflate';
import type Konva from 'konva';
import type {
  BoundaryBox,
  ExportTarget,
  Slide,
} from '@/lib/types/tactical-unified';
import { resolveBoundaryBoxPixelRect } from '../core/utils/geometry';
import { dataUrlToBlob, downloadBlob } from './konva-slide-export';

export {
  calculateExportCropRect,
  type ExportCropRect,
  type ExportCropRectOptions,
} from '../core';

export {
  dataUrlToBlob,
  downloadBlob,
  type ExportSlidesArchiveOptions,
  exportAllSlidesZip,
  exportSingleSlidePng,
  type RenderSlideImageOptions,
  renderSlideToPngBlob,
} from './konva-slide-export';

export function stageToBlob(
  stage: Konva.Stage,
  config?: Parameters<Konva.Stage['toBlob']>[0],
): Promise<Blob | null> {
  return new Promise((resolve) => {
    stage.toBlob({
      ...config,
      callback: (blob) => resolve(blob),
    });
  });
}

export async function exportPngBlob(
  stage: Konva.Stage,
  options?: {
    crop?: boolean;
    scale?: number;
    boundaryBox?: BoundaryBox | null;
    pitchRect?: { x: number; y: number; width: number; height: number };
  },
): Promise<Blob> {
  const pixelRatio = options?.scale ?? 2;
  const shouldCrop = options?.crop ?? true;
  const boundaryBox = options?.boundaryBox;

  let config: Parameters<Konva.Stage['toBlob']>[0] = {
    mimeType: 'image/png',
    pixelRatio,
  };

  if (shouldCrop && boundaryBox?.enabled !== false && boundaryBox) {
    const stageW = stage.width();
    const stageH = stage.height();
    const rect = resolveBoundaryBoxPixelRect(
      boundaryBox,
      { width: stageW, height: stageH },
      options?.pitchRect,
    );
    config = {
      ...config,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  const blob = await stageToBlob(stage, config);
  if (!blob) {
    throw new Error('Failed to create PNG blob from canvas stage');
  }
  return blob;
}

export function getTargetSlides(
  slides: Slide[],
  target: ExportTarget,
): Slide[] {
  if (target.scope !== 'range') return slides;
  const from = slides.findIndex((s) => s.id === target.fromSlideId);
  const to = slides.findIndex((s) => s.id === target.toSlideId);
  return slides.slice(Math.max(0, from), to >= 0 ? to + 1 : undefined);
}

export async function collectSlideFrames(
  slides: Slide[],
  captureSlide: (scale: number, slideId?: string) => string | null,
  activateSlide?: (slideId: string) => Promise<void>,
): Promise<string[]> {
  const frames: string[] = [];
  for (const slide of slides) {
    if (activateSlide) await activateSlide(slide.id);
    await new Promise((r) => requestAnimationFrame(r));
    const dataUrl = captureSlide(2, slide.id);
    if (dataUrl) frames.push(dataUrl);
  }
  return frames;
}

export async function exportZipSlides(options: {
  slides: Slide[];
  captureSlide: (scale: number, slideId?: string) => string | null;
  activateSlide?: (slideId: string) => Promise<void>;
  scale: number;
}): Promise<void> {
  const files: Record<string, Uint8Array> = {};

  for (const slide of options.slides) {
    if (options.activateSlide) await options.activateSlide(slide.id);
    await new Promise((r) => requestAnimationFrame(r));
    const dataUrl = options.captureSlide(options.scale, slide.id);
    if (!dataUrl) continue;
    const blob = await dataUrlToBlob(dataUrl);
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

export async function exportMp4Frames(options: {
  frames: string[];
}): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < options.frames.length; i++) {
    const f = options.frames[i];
    if (!f) continue;
    const b64 = f.split(',')[1] ?? '';
    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let j = 0; j < binaryString.length; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
    files[`frame-${String(i).padStart(3, '0')}.png`] = bytes;
  }
  const zipped = zipSync(files, { level: 6 });
  const zipBlob = new Blob([zipped], {
    type: 'application/zip',
  });
  downloadBlob(zipBlob, 'tactical-frames.zip');
}

export interface ExecuteExportOptions {
  stage: Konva.Stage | null;
  slides: Slide[];
  captureSlide: (scale: number, slideId?: string) => string | null;
  activateSlide?: (slideId: string) => Promise<void>;
}

export async function executeExportFormat(
  target: ExportTarget,
  options: ExecuteExportOptions,
): Promise<void> {
  if (target.format === 'png') {
    const scale = target.scale ?? 2;
    const dataUrl = options.captureSlide(scale);
    if (!dataUrl) return;
    const blob = await dataUrlToBlob(dataUrl);
    downloadBlob(blob, 'tactical-scene.png');
    return;
  }

  if (target.format === 'zip') {
    await exportZipSlides({
      slides: options.slides,
      captureSlide: options.captureSlide,
      activateSlide: options.activateSlide,
      scale: target.scale ?? 2,
    });
    return;
  }

  if (!options.stage) return;
  const targetSlides = getTargetSlides(options.slides, target);
  const frames = await collectSlideFrames(
    targetSlides,
    options.captureSlide,
    options.activateSlide,
  );

  if (target.format === 'mp4') {
    await exportMp4Frames({ frames });
  }
}
