/**
 * konva-export-helpers.ts
 * Pure calculation and format export helpers for Konva canvas pipeline.
 */

import type Konva from 'konva';
import type { ExportTarget, Slide } from '@/lib/types/tactical-unified';

export {
  calculateExportCropRect,
  type ExportCropRect,
  type ExportCropRectOptions,
} from '../objects/canvas/helpers/canvas-pitch-transform-helper';

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
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  for (const slide of options.slides) {
    if (options.activateSlide) await options.activateSlide(slide.id);
    await new Promise((r) => requestAnimationFrame(r));
    const dataUrl = options.captureSlide(options.scale, slide.id);
    if (!dataUrl) continue;
    const blob = await dataUrlToBlob(dataUrl);
    zip.file(`slide-${String(slide.index + 1).padStart(2, '0')}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'tactical-slides.zip');
}

export async function exportGifSlides(options: {
  stage: Konva.Stage;
  frames: string[];
}): Promise<void> {
  const { default: GIF } = await import('gif.js');
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: options.stage.width(),
    height: options.stage.height(),
  });

  for (const dataUrl of options.frames) {
    const img = await new Promise<HTMLImageElement>((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = dataUrl;
    });
    gif.addFrame(img, { delay: 800 });
  }

  await new Promise<void>((res) => {
    gif.on('finished', (blob: Blob) => {
      downloadBlob(blob, 'tactical-animation.gif');
      res();
    });
    gif.render();
  });
}

export async function exportMp4Frames(options: {
  frames: string[];
}): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  options.frames.forEach((f, i) => {
    const b64 = f.split(',')[1] ?? '';
    zip.file(`frame-${String(i).padStart(3, '0')}.png`, b64, {
      base64: true,
    });
  });
  const zipBlob = await zip.generateAsync({ type: 'blob' });
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
  options: {
    stage: Konva.Stage | null;
    slides: Slide[];
    captureSlide: (scale: number, slideId?: string) => string | null;
    activateSlide?: (slideId: string) => Promise<void>;
  },
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

  if (target.format === 'gif') {
    await exportGifSlides({ stage: options.stage, frames });
  } else if (target.format === 'mp4') {
    await exportMp4Frames({ frames });
  }
}
