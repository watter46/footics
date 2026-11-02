import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
} from 'mediabunny';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
import { calculatePitchRect } from '../pitch-geometry';
import {
  type AnyCanvasRenderingContext2D,
  renderTacticalFrameToCanvas,
} from './tactical-frame-renderer';
import { calculateBoundaryCrop } from './video-crop-calc';
import type { VideoExportOptions } from './video-export-types';

/**
 * Exports video using Mediabunny (hardware-accelerated WebCodecs + in-browser muxing).
 */
export async function exportVideoWithMediabunny(
  options: VideoExportOptions,
): Promise<Blob> {
  const pitchRect = calculatePitchRect(
    { width: options.stageWidth, height: options.stageHeight },
    options.aspectRatio ?? '16:9',
  );
  const baseRect =
    options.boundaryBox?.fitTarget === 'canvas'
      ? { x: 0, y: 0, width: options.stageWidth, height: options.stageHeight }
      : pitchRect;
  const cropInfo = calculateBoundaryCrop(
    options.boundaryBox,
    options.stageWidth,
    options.stageHeight,
    options.scale ?? 2,
    baseRect,
  );
  const { exportWidth, exportHeight } = cropInfo;

  let canvas!: HTMLCanvasElement | OffscreenCanvas;
  let ctx: AnyCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const offscreen = new OffscreenCanvas(exportWidth, exportHeight);
      const offCtx = offscreen.getContext('2d', {
        alpha: options.transparent ?? options.format === 'webm',
      });
      if (offCtx) {
        canvas = offscreen;
        ctx = offCtx;
      }
    } catch (err) {
      console.warn(
        '[VideoExportEngine] OffscreenCanvas 2d context init failed:',
        err,
      );
      ctx = null;
    }
  }

  if (!ctx && typeof document !== 'undefined') {
    const docCanvas = document.createElement('canvas');
    docCanvas.width = exportWidth;
    docCanvas.height = exportHeight;
    const docCtx = docCanvas.getContext('2d', {
      alpha: options.transparent ?? options.format === 'webm',
    });
    if (docCtx) {
      canvas = docCanvas;
      ctx = docCtx;
    }
  }

  if (!ctx || !canvas) {
    throw new Error('Failed to create canvas context for video export');
  }

  const target = new BufferTarget();
  const format =
    options.format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat();
  const output = new Output({ format, target });

  const codec = options.format === 'webm' ? 'vp9' : 'avc';
  const bitrate =
    options.bitrate ??
    (options.scale && options.scale >= 2.5 ? 30_000_000 : 20_000_000);
  const keyFrameInterval = options.keyFrameIntervalSec ?? 2;

  const canvasSource = new CanvasSource(canvas, {
    codec,
    bitrate,
    keyFrameInterval,
    latencyMode: options.latencyMode ?? 'quality',
    hardwareAcceleration: 'prefer-hardware',
    ...(options.fullCodecString
      ? { fullCodecString: options.fullCodecString }
      : {}),
  });

  output.addVideoTrack(canvasSource);
  await output.start();

  const fps = options.fps;
  const effectiveDurationMs =
    options.totalDurationMs > 0 ? options.totalDurationMs : 3000;
  const totalFrames = Math.max(
    1,
    Math.ceil((effectiveDurationMs / 1000) * fps),
  );
  const frameDuration = 1 / fps;

  const transparent = options.transparent ?? options.format === 'webm';
  const slides = options.slides;
  const aspectRatio = options.aspectRatio ?? '16:9';
  const boundaryBox = options.boundaryBox;

  const useSingleSlideOverride = !slides || slides.length <= 1;
  const pitchTransform = options.pitchTransform;
  const hasTransform =
    pitchTransform &&
    (pitchTransform.tilt !== 0 ||
      pitchTransform.zoom !== 1 ||
      pitchTransform.panX !== 0 ||
      pitchTransform.panY !== 0);

  const mvpMatrix =
    useSingleSlideOverride && hasTransform
      ? new Float32Array(
          buildExportMVPMatrix(
            pitchTransform,
            exportWidth,
            exportHeight,
            aspectRatio,
          ),
        )
      : useSingleSlideOverride
        ? (options.mvpMatrix ?? undefined)
        : undefined;

  if (transparent) {
    options.onSetBackgroundVisible?.(false);
  }

  let lastRenderedSlideIdx = -1;

  try {
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (options.checkCancelled?.()) {
        await output.cancel();
        throw new Error('Export cancelled');
      }

      const timeMs = (frameIdx / fps) * 1000;
      const timestamp = frameIdx / fps;

      if (slides && slides.length > 0) {
        const interpolated = getInterpolatedUnifiedSlideFrame(slides, timeMs);
        const shouldSkipRender =
          frameIdx > 0 &&
          interpolated.isPaused &&
          lastRenderedSlideIdx === interpolated.currentSlideIndex;

        if (!shouldSkipRender) {
          renderTacticalFrameToCanvas(ctx, {
            slides,
            timeMs,
            width: exportWidth,
            height: exportHeight,
            aspectRatio,
            boundaryBox,
            transparent,
            mvpMatrix,
            playerPhotos: options.playerPhotos,
            pitchAppearance: options.pitchAppearance,
            marbleTexture: options.marbleTexture,
            screenBackground: options.screenBackground,
            precomputedFrame: interpolated,
          });
          lastRenderedSlideIdx = interpolated.isPaused
            ? interpolated.currentSlideIndex
            : -1;
        }
      } else {
        await options.onRenderFrame?.(timeMs);
        const sourceCanvas = options.onCaptureFrame?.(cropInfo);
        if (sourceCanvas) {
          if (transparent) {
            ctx.clearRect(0, 0, exportWidth, exportHeight);
          } else {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, exportWidth, exportHeight);
          }
          ctx.drawImage(sourceCanvas, 0, 0, exportWidth, exportHeight);
        }
      }

      await canvasSource.add(timestamp, frameDuration);

      if (
        options.onProgress &&
        (frameIdx === 0 ||
          (frameIdx + 1) % 15 === 0 ||
          frameIdx === totalFrames - 1)
      ) {
        options.onProgress({
          percent: Math.min(
            95,
            Math.round(((frameIdx + 1) / totalFrames) * 95),
          ),
          stage: 'rendering',
          message: `Rendering frame ${frameIdx + 1} of ${totalFrames}`,
        });
      }

      if (!options.isWorkerContext && frameIdx % 5 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    options.onProgress?.({
      percent: 96,
      stage: 'finalizing',
      message: 'Finalizing recorded video...',
    });

    await output.finalize();

    if (!target.buffer) {
      throw new Error('Mediabunny output buffer is empty after finalize');
    }

    options.onProgress?.({
      percent: 100,
      stage: 'idle',
      message: 'Video export completed successfully!',
    });

    return new Blob([target.buffer], {
      type: options.format === 'webm' ? 'video/webm' : 'video/mp4',
    });
  } finally {
    if (transparent) {
      options.onSetBackgroundVisible?.(true);
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
