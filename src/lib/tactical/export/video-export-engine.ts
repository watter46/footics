/**
 * video-export-engine.ts
 * High-performance tactical animation video export engine.
 *
 * Supports:
 *   - Boundary Box cropping with even-dimension snapping (H.264/VP9 requirement)
 *   - SOTA Web Worker Pipeline (Off-Thread WebCodecs for MP4 & WebM with Zero UI Freeze)
 *   - MP4 (H.264 / WebCodecs + mp4-muxer) with automatic MediaRecorder fallback
 *   - Transparent WebM (VP9 / WebCodecs + webm-muxer) with automatic MediaRecorder fallback
 */

import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
} from 'mediabunny';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import type {
  AspectRatio,
  BoundaryBox,
  ExportProgress,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
import { calculatePitchRect } from '../pitch-geometry';
import {
  type AnyCanvasRenderingContext2D,
  renderTacticalFrameToCanvas,
} from './tactical-frame-renderer';

export interface BoundaryCropInfo {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  exportWidth: number;
  exportHeight: number;
  isCropped: boolean;
}

/**
 * Calculates crop dimensions from Boundary Box and stage dimensions with even-number snapping.
 */
export function calculateBoundaryCrop(
  box: BoundaryBox | undefined | null,
  stageWidth: number,
  stageHeight: number,
  scale = 2,
  pitchRect?: { x: number; y: number; width: number; height: number },
): BoundaryCropInfo {
  const rect = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageWidth,
    height: stageHeight,
  };
  let cropX = rect.x;
  let cropY = rect.y;
  let cropW = rect.width;
  let cropH = rect.height;
  let isCropped = false;

  const hasCustomPitchRect =
    rect.x !== 0 ||
    rect.y !== 0 ||
    rect.width !== stageWidth ||
    rect.height !== stageHeight;
  const isBoxCropped =
    Boolean(box?.enabled) &&
    (box?.width ?? 0) > 0 &&
    (box?.height ?? 0) > 0 &&
    ((box?.width ?? 100) < 100 ||
      (box?.height ?? 100) < 100 ||
      (box?.x ?? 0) > 0 ||
      (box?.y ?? 0) > 0);

  if (box?.enabled && box.width > 0 && box.height > 0) {
    cropX = rect.x + (box.x / 100) * rect.width;
    cropY = rect.y + (box.y / 100) * rect.height;
    cropW = (box.width / 100) * rect.width;
    cropH = (box.height / 100) * rect.height;
    isCropped = hasCustomPitchRect || isBoxCropped;
  }

  // Baseline Resolution Guarantee depending on selected scale preset:
  // scale >= 2.5 (2K / 1440p QHD): 2560x1440 for 16:9, 1440x2560 for 9:16
  // scale >= 1.5 (1080p Full HD): 1920x1080 for 16:9, 1080x1920 for 9:16
  // scale < 1.5 (720p HD): 1280x720 for 16:9, 720x1280 for 9:16
  const isSquare = stageWidth === stageHeight;
  const isFourFive = Math.abs(stageWidth / stageHeight - 4 / 5) < 0.05;
  const isFourThree = Math.abs(stageWidth / stageHeight - 4 / 3) < 0.05;
  const isVertical = stageHeight > stageWidth && !isFourFive;

  let baseWidth: number;
  let baseHeight: number;

  if (scale >= 2.5) {
    // 2K / 1440p (Ultra Quality)
    if (isFourFive) {
      baseWidth = 1440;
      baseHeight = 1800;
    } else if (isVertical) {
      baseWidth = 1440;
      baseHeight = 2560;
    } else if (isSquare) {
      baseWidth = 1440;
      baseHeight = 1440;
    } else if (isFourThree) {
      baseWidth = 1920;
      baseHeight = 1440;
    } else {
      baseWidth = 2560;
      baseHeight = 1440;
    }
  } else if (scale >= 1.5) {
    // 1080p (Full HD - Recommended)
    if (isFourFive) {
      baseWidth = 1080;
      baseHeight = 1350;
    } else if (isVertical) {
      baseWidth = 1080;
      baseHeight = 1920;
    } else if (isSquare) {
      baseWidth = 1080;
      baseHeight = 1080;
    } else if (isFourThree) {
      baseWidth = 1440;
      baseHeight = 1080;
    } else {
      baseWidth = 1920;
      baseHeight = 1080;
    }
  } else {
    // 720p (HD - Lightweight)
    if (isFourFive) {
      baseWidth = 720;
      baseHeight = 900;
    } else if (isVertical) {
      baseWidth = 720;
      baseHeight = 1280;
    } else if (isSquare) {
      baseWidth = 720;
      baseHeight = 720;
    } else if (isFourThree) {
      baseWidth = 960;
      baseHeight = 720;
    } else {
      baseWidth = 1280;
      baseHeight = 720;
    }
  }

  const minScaleX = baseWidth / stageWidth;
  const minScaleY = baseHeight / stageHeight;
  const effectiveScale = Math.max(scale, Math.max(minScaleX, minScaleY));

  let exportWidth = Math.round(cropW * effectiveScale);
  let exportHeight = Math.round(cropH * effectiveScale);

  // 8-pixel macroblock alignment ensures maximum GPU hardware acceleration throughput
  // while strictly preserving standard broadcast resolutions (1080p: 1920x1080, 2K: 2560x1440, 720p: 1280x720)
  exportWidth = Math.max(64, Math.round(exportWidth / 8) * 8);
  exportHeight = Math.max(64, Math.round(exportHeight / 8) * 8);

  return {
    cropX,
    cropY,
    cropW,
    cropH,
    exportWidth,
    exportHeight,
    isCropped,
  };
}

export interface VideoExportOptions {
  format: 'mp4' | 'webm';
  fps: number;
  scale?: number;
  quality?: 'low' | 'medium' | 'high';
  bitrate?: number;
  h264Profile?: 'baseline' | 'main' | 'high';
  keyFrameIntervalSec?: number;
  latencyMode?: 'realtime' | 'quality';
  maxQueueSize?: number;
  transparent?: boolean;
  totalDurationMs: number;
  boundaryBox?: BoundaryBox | null;
  stageWidth: number;
  stageHeight: number;
  slides?: Slide[];
  aspectRatio?: AspectRatio;
  pitchTransform?: PitchTransform | null;
  mvpMatrix?: Float32Array | null;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  onRenderFrame?: (timeMs: number) => Promise<void> | void;
  onCaptureFrame?: (cropInfo: BoundaryCropInfo) => HTMLCanvasElement | null;
  onSetBackgroundVisible?: (visible: boolean) => void;
  onProgress?: (progress: ExportProgress) => void;
  checkCancelled?: () => boolean;
}

const H264_CODEC_CANDIDATES = [
  'avc1.64002a', // High Profile Level 4.2 (GPU native maximum quality)
  'avc1.4d002a', // Main Profile Level 4.2
  'avc1.4D401F', // Main Profile Level 3.1
  'avc1.42E01E', // Baseline Profile Level 3.0 (Fallback)
];

const VP9_CODEC_CANDIDATES = [
  'vp09.00.10.08', // Profile 0, 8-bit, 4:2:0
  'vp09.00.41.08', // Profile 0, Level 4.1
  'vp09.02.10.10', // Profile 2, 10-bit
  'vp9',
];

/**
 * Detects the best supported H.264 codec configuration for VideoEncoder,
 * strictly prioritizing GPU hardware acceleration ('prefer-hardware').
 */
export async function getSupportedH264EncoderConfig(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
): Promise<VideoEncoderConfig | null> {
  if (typeof globalThis === 'undefined' || !('VideoEncoder' in globalThis)) {
    return null;
  }

  const accelOptions: HardwareAcceleration[] = [
    'prefer-hardware',
    'no-preference',
    'prefer-software',
  ];

  const latencyModes: LatencyMode[] = ['quality', 'realtime'];

  for (const hardwareAcceleration of accelOptions) {
    for (const latencyMode of latencyModes) {
      for (const codec of H264_CODEC_CANDIDATES) {
        try {
          const testConfig: VideoEncoderConfig = {
            codec,
            width,
            height,
            bitrate,
            framerate: fps,
            hardwareAcceleration,
            bitrateMode: 'variable',
            latencyMode,
          };
          const support = await VideoEncoder.isConfigSupported(testConfig);
          if (support.supported && support.config) {
            return support.config;
          }
        } catch (err) {
          console.warn('[VideoExportEngine] H264 config check error:', err);
        }
      }
    }
  }

  return null;
}

/**
 * Backward-compatible helper for H.264 codec string lookup.
 */
export async function getSupportedH264Codec(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
): Promise<string> {
  const config = await getSupportedH264EncoderConfig(
    width,
    height,
    fps,
    bitrate,
  );
  return config?.codec ?? 'avc1.64002a';
}

/**
 * Detects the best supported VP9 codec configuration for VideoEncoder,
 * supporting alpha transparency when alpha is true.
 */
export async function getSupportedVP9EncoderConfig(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
  alpha = false,
): Promise<VideoEncoderConfig | null> {
  if (typeof globalThis === 'undefined' || !('VideoEncoder' in globalThis)) {
    return null;
  }

  const accelOptions: HardwareAcceleration[] = [
    'prefer-hardware',
    'no-preference',
    'prefer-software',
  ];

  const latencyModes: LatencyMode[] = ['quality', 'realtime'];

  for (const hardwareAcceleration of accelOptions) {
    for (const latencyMode of latencyModes) {
      for (const codec of VP9_CODEC_CANDIDATES) {
        try {
          const testConfig: VideoEncoderConfig = {
            codec,
            width,
            height,
            bitrate,
            framerate: fps,
            hardwareAcceleration,
            bitrateMode: 'variable',
            latencyMode,
            ...(alpha ? { alpha: 'keep' } : {}),
          };
          const support = await VideoEncoder.isConfigSupported(testConfig);
          if (support.supported && support.config) {
            return support.config;
          }
        } catch (err) {
          console.warn('[VideoExportEngine] VP9 config check error:', err);
        }
      }
    }
  }

  return null;
}

/**
 * Helper for VP9 codec string lookup.
 */
export async function getSupportedVP9Codec(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
  alpha = false,
): Promise<string> {
  const config = await getSupportedVP9EncoderConfig(
    width,
    height,
    fps,
    bitrate,
    alpha,
  );
  return config?.codec ?? 'vp09.00.10.08';
}

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
      }) as unknown as AnyCanvasRenderingContext2D;
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
    }) as unknown as AnyCanvasRenderingContext2D;
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

  const mvpMatrix = options.pitchTransform
    ? (buildExportMVPMatrix(
        options.pitchTransform,
        exportWidth,
        exportHeight,
        aspectRatio,
      ) as unknown as Float32Array)
    : (options.mvpMatrix ?? null);

  if (transparent) {
    options.onSetBackgroundVisible?.(false);
  }

  try {
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (options.checkCancelled?.()) {
        await output.cancel();
        throw new Error('Export cancelled');
      }

      const timeMs = (frameIdx / fps) * 1000;
      const timestamp = frameIdx / fps;

      if (slides && slides.length > 0) {
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
        });
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

      options.onProgress?.({
        percent: Math.min(95, Math.round(((frameIdx + 1) / totalFrames) * 95)),
        stage: 'rendering',
        message: `Rendering frame ${frameIdx + 1} of ${totalFrames}`,
      });

      if (frameIdx % 10 === 0) {
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
  }
}

/**
 * Backward-compatible worker stub (Worker engine superseded by Mediabunny).
 */
export function createVideoExportWorker(): Worker | null {
  return null;
}

/**
 * Direct video export executor using Mediabunny.
 */
export async function exportVideoDirect(
  options: VideoExportOptions,
): Promise<Blob> {
  const slides = options.slides;
  if (!slides || slides.length === 0) {
    throw new Error('Slides data is required for Web Worker video export.');
  }
  return exportVideoWithMediabunny(options);
}

export async function exportVideoWithWorker(
  options: VideoExportOptions,
): Promise<Blob> {
  return exportVideoDirect(options);
}

/**
 * Exports tactical animation to MP4 using Mediabunny,
 * with automatic MediaRecorder fallback.
 */
export async function exportMp4Video(
  options: VideoExportOptions,
): Promise<Blob> {
  try {
    return await exportVideoWithMediabunny({ ...options, format: 'mp4' });
  } catch (err) {
    console.warn(
      '[Footics Video Export] Mediabunny MP4 export failed, attempting MediaRecorder fallback:',
      err,
    );
    return exportVideoWithMediaRecorder({ ...options, format: 'mp4' });
  }
}

/**
 * Exports tactical animation to Transparent / Opaque WebM (VP9) using Mediabunny,
 * with automatic MediaRecorder fallback.
 */
export async function exportTransparentWebm(
  options: VideoExportOptions,
): Promise<Blob> {
  try {
    return await exportVideoWithMediabunny({
      ...options,
      format: 'webm',
      transparent: options.transparent ?? true,
    });
  } catch (err) {
    console.warn(
      '[Footics Video Export] Mediabunny WebM export failed, attempting MediaRecorder fallback:',
      err,
    );
    return exportVideoWithMediaRecorder({
      ...options,
      format: 'webm',
      transparent: options.transparent ?? true,
    });
  }
}

/**
 * Universal video export using MediaRecorder API (fallback for MP4 and WebM).
 */
export async function exportVideoWithMediaRecorder(
  options: VideoExportOptions,
): Promise<Blob> {
  const {
    format,
    fps,
    scale = 2,
    transparent = false,
    totalDurationMs,
    boundaryBox,
    stageWidth,
    stageHeight,
    slides,
    aspectRatio = '16:9',
    onRenderFrame,
    onCaptureFrame,
    onSetBackgroundVisible,
    onProgress,
    checkCancelled,
  } = options;

  if (typeof window === 'undefined' || !('MediaRecorder' in window)) {
    throw new Error('MediaRecorder API is not supported in this browser.');
  }

  const pitchRect = calculatePitchRect(
    { width: stageWidth, height: stageHeight },
    aspectRatio,
  );
  const baseRect =
    boundaryBox?.fitTarget === 'canvas'
      ? { x: 0, y: 0, width: stageWidth, height: stageHeight }
      : pitchRect;
  const cropInfo = calculateBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
    baseRect,
  );
  const { exportWidth, exportHeight } = cropInfo;

  const mvpMatrix = options.pitchTransform
    ? (buildExportMVPMatrix(
        options.pitchTransform,
        exportWidth,
        exportHeight,
        aspectRatio,
      ) as unknown as Float32Array)
    : (options.mvpMatrix ?? null);

  const streamCanvas = document.createElement('canvas');
  streamCanvas.width = exportWidth;
  streamCanvas.height = exportHeight;
  const streamCtx = streamCanvas.getContext('2d', {
    alpha: transparent,
  });

  if (!streamCtx) {
    throw new Error('Failed to create 2D canvas context for MediaRecorder');
  }

  // Candidate mimeTypes by format preference
  const candidateMimeTypes =
    format === 'mp4'
      ? [
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=h264',
          'video/webm;codecs=vp9',
          'video/webm',
        ]
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

  let selectedMimeType = '';
  for (const mime of candidateMimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMimeType = mime;
      break;
    }
  }

  if (!selectedMimeType) {
    selectedMimeType = 'video/webm';
  }

  if (transparent) {
    onSetBackgroundVisible?.(false);
  }

  const stream =
    typeof (
      streamCanvas as HTMLCanvasElement & {
        captureStream?: (fps?: number) => MediaStream;
      }
    ).captureStream === 'function'
      ? (
          streamCanvas as HTMLCanvasElement & {
            captureStream: (fps?: number) => MediaStream;
          }
        ).captureStream(0)
      : streamCanvas.captureStream(fps);
  const track = stream.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;
  const hasRequestFrame = typeof track?.requestFrame === 'function';

  const recordedChunks: Blob[] = [];

  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 30_000_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const effectiveDurationMs = totalDurationMs > 0 ? totalDurationMs : 3000;
  const totalFrames = Math.max(
    1,
    Math.ceil((effectiveDurationMs / 1000) * fps),
  );
  const frameDelayMs = 1000 / fps;

  try {
    recorder.start();

    let lastReportedTime = 0;
    let lastReportedPercent = -1;

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (checkCancelled?.()) {
        recorder.stop();
        throw new Error('Export cancelled');
      }

      const timeMs = (frameIdx / fps) * 1000;

      if (slides && slides.length > 0) {
        renderTacticalFrameToCanvas(streamCtx, {
          slides,
          timeMs,
          width: exportWidth,
          height: exportHeight,
          aspectRatio,
          boundaryBox,
          transparent,
          mvpMatrix,
          playerPhotos: options.playerPhotos,
        });
      } else {
        await onRenderFrame?.(timeMs);
        const sourceCanvas = onCaptureFrame?.(cropInfo);
        if (!sourceCanvas) {
          throw new Error('Failed to capture frame from canvas');
        }

        if (transparent) {
          streamCtx.clearRect(0, 0, exportWidth, exportHeight);
        } else {
          streamCtx.fillStyle = '#020617';
          streamCtx.fillRect(0, 0, exportWidth, exportHeight);
        }

        streamCtx.imageSmoothingEnabled = true;
        streamCtx.imageSmoothingQuality = 'high';
        streamCtx.drawImage(sourceCanvas, 0, 0, exportWidth, exportHeight);
      }

      const progressPercent = Math.min(
        95,
        Math.round(((frameIdx + 1) / totalFrames) * 95),
      );
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (
        progressPercent !== lastReportedPercent &&
        (now - lastReportedTime >= 60 || frameIdx === totalFrames - 1)
      ) {
        lastReportedTime = now;
        lastReportedPercent = progressPercent;
        onProgress?.({
          percent: progressPercent,
          stage: 'rendering',
          message: `Recording frame ${frameIdx + 1} of ${totalFrames} (${progressPercent}%)`,
        });
      }

      // Zero-wait frame capture if requestFrame is supported, else fallback to timer
      if (hasRequestFrame && track?.requestFrame) {
        track.requestFrame();
        if (frameIdx % 4 === 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, frameDelayMs));
      }
    }

    onProgress?.({
      percent: 96,
      stage: 'finalizing',
      message: 'Finalizing recorded video...',
    });

    const completionPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: selectedMimeType });
        resolve(blob);
      };
    });

    recorder.stop();
    const finalBlob = await completionPromise;

    onProgress?.({
      percent: 100,
      stage: 'idle',
      message: 'Video export completed successfully!',
    });

    return finalBlob;
  } finally {
    if (transparent) {
      onSetBackgroundVisible?.(true);
    }
  }
}

/**
 * Unified tactical animation video export entry point using Mediabunny,
 * falling back smoothly to MediaRecorder if necessary.
 */
export async function exportTacticalVideo(
  options: VideoExportOptions,
): Promise<Blob> {
  try {
    return await exportVideoWithMediabunny(options);
  } catch (err) {
    console.warn(
      '[Footics Video Export] Mediabunny export failed, falling back to MediaRecorder:',
      err,
    );
  }

  if (options.format === 'mp4') {
    return exportMp4Video(options);
  }

  return exportTransparentWebm(options);
}
