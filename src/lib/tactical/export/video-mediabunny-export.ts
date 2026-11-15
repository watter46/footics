import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
} from 'mediabunny';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { hasActiveDirectorCameraTrack } from '@/lib/tactical/engine/director-camera';
import type { AnyCanvasRenderingContext2D } from './renderers/renderer-context';
import { hasActiveFrameEffects, isPauseFrame } from './tactical-frame-effects';
import { renderTacticalPhaseFrameToCanvas } from './tactical-phase-frame-renderer';
import { calculateBoundaryCrop } from './video-crop-calc';
import type { VideoExportOptions } from './video-export-types';

/**
 * Exports video using Mediabunny (hardware-accelerated WebCodecs + in-browser muxing).
 */
export async function exportVideoWithMediabunny(
  options: VideoExportOptions,
): Promise<Blob> {
  const cropInfo = calculateBoundaryCrop(
    options.boundaryBox,
    options.stageWidth,
    options.stageHeight,
    options.scale ?? 1,
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

  if (transparent) {
    options.onSetBackgroundVisible?.(false);
  }

  const phase =
    slides && slides.length > 0
      ? normalizePhases({
          slides,
          aspectRatio,
          boundaryBox,
          directorCamera: options.directorCamera,
        })[0]
      : undefined;

  try {
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (options.checkCancelled?.()) {
        await output.cancel();
        throw new Error('Export cancelled');
      }

      const timeMs = (frameIdx / fps) * 1000;
      const timestamp = frameIdx / fps;

      if (slides && slides.length > 0 && phase) {
        const isPaused = isPauseFrame(
          slides,
          timeMs,
          options.directorCamera,
          options.directorCameraOptions,
        );
        const hasDynamicEffect = hasActiveFrameEffects(slides);
        const hasDirectorCamera = hasActiveDirectorCameraTrack(
          options.directorCamera,
        );

        const shouldSkipRender =
          frameIdx > 0 && isPaused && !hasDynamicEffect && !hasDirectorCamera;

        if (!shouldSkipRender) {
          renderTacticalPhaseFrameToCanvas({
            ctx,
            phase,
            timeMs,
            width: exportWidth,
            height: exportHeight,
            baseWidth: options.stageWidth,
            baseHeight: options.stageHeight,
            aspectRatio,
            boundaryBox,
            pitchTransform: options.pitchTransform,
            directorCamera: options.directorCamera,
            directorCameraOptions: options.directorCameraOptions,
            pitchAppearance: options.pitchAppearance,
            marbleTexture: options.marbleTexture,
            screenBackground: options.screenBackground,
            transparent,
            playerPhotos: options.playerPhotos,
            teamVisibility: options.teamVisibility,
            applyEffects: true,
          });
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
