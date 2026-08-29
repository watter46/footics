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
  ArrayBufferTarget as Mp4ArrayBufferTarget,
  Muxer as Mp4Muxer,
} from 'mp4-muxer';
import {
  ArrayBufferTarget as WebmArrayBufferTarget,
  Muxer as WebmMuxer,
} from 'webm-muxer';
import type {
  AspectRatio,
  BoundaryBox,
  ExportProgress,
  Slide,
} from '@/lib/types/tactical-unified';
import {
  type AnyCanvasRenderingContext2D,
  renderTacticalFrameToCanvas,
} from './tactical-frame-renderer';
import {
  executeOffThreadVideoExport,
  type VideoExportWorkerInbound,
  type VideoExportWorkerOutbound,
  type VideoExportWorkerRequest,
} from './video-export-worker';

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
): BoundaryCropInfo {
  let cropX = 0;
  let cropY = 0;
  let cropW = stageWidth;
  let cropH = stageHeight;
  let isCropped = false;

  if (
    box?.enabled &&
    box.width > 0 &&
    box.height > 0 &&
    (box.width < 100 || box.height < 100 || box.x > 0 || box.y > 0)
  ) {
    cropX = (box.x / 100) * stageWidth;
    cropY = (box.y / 100) * stageHeight;
    cropW = (box.width / 100) * stageWidth;
    cropH = (box.height / 100) * stageHeight;
    isCropped = true;
  }

  // Baseline Resolution Guarantee depending on selected scale preset:
  // scale >= 2.5 (2K / 1440p QHD): 2560x1440 for 16:9, 1440x2560 for 9:16
  // scale >= 1.5 (1080p Full HD): 1920x1080 for 16:9, 1080x1920 for 9:16
  // scale < 1.5 (720p HD): 1280x720 for 16:9, 720x1280 for 9:16
  const isVertical = stageHeight > stageWidth;
  const isSquare = stageWidth === stageHeight;
  const isFourThree = Math.abs(stageWidth / stageHeight - 4 / 3) < 0.05;

  let baseWidth: number;
  let baseHeight: number;

  if (scale >= 2.5) {
    // 2K / 1440p (Ultra Quality)
    if (isVertical) {
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
    if (isVertical) {
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
    if (isVertical) {
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
  transparent?: boolean;
  totalDurationMs: number;
  boundaryBox?: BoundaryBox | null;
  stageWidth: number;
  stageHeight: number;
  slides?: Slide[];
  aspectRatio?: AspectRatio;
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
        } catch {
          // Continue to next combination
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
        } catch {
          // Continue to next combination
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
 * Safely creates a dedicated Web Worker instance for video export.
 * Handles bundler resolution errors gracefully.
 */
export function createVideoExportWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  try {
    return new Worker(new URL('./video-export-worker.ts', import.meta.url), {
      type: 'module',
    });
  } catch (err) {
    console.warn('Failed to instantiate Web Worker, using direct engine:', err);
    return null;
  }
}

/**
 * Direct main-thread WebCodecs video export executor (Zero-Wait Async Pipelining).
 * Executes the exact same optimized OffscreenCanvas + WebCodecs pipeline as the worker,
 * with cooperative microtask yielding to ensure zero UI freeze even on the main thread.
 */
export async function exportVideoDirect(
  options: VideoExportOptions,
): Promise<Blob> {
  const slides = options.slides;
  if (!slides || slides.length === 0) {
    throw new Error('Slides data is required for direct video export.');
  }

  const exportId = `direct_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const request: VideoExportWorkerRequest = {
    id: exportId,
    type: 'START_EXPORT',
    format: options.format,
    fps: options.fps,
    scale: options.scale ?? 2,
    quality: options.quality ?? 'high',
    transparent: options.transparent ?? options.format === 'webm',
    totalDurationMs: options.totalDurationMs,
    boundaryBox: options.boundaryBox,
    stageWidth: options.stageWidth,
    stageHeight: options.stageHeight,
    slides,
    aspectRatio: options.aspectRatio ?? '16:9',
    isMainThread: true,
  };

  const result = await executeOffThreadVideoExport(
    request,
    options.onProgress,
    options.checkCancelled,
  );

  return new Blob([result.buffer], { type: result.mimeType });
}

/**
 * Executes off-thread video export using dedicated Web Worker.
 * Releases 100% of UI thread resources for smooth user interaction.
 */
export async function exportVideoWithWorker(
  options: VideoExportOptions,
): Promise<Blob> {
  const worker = createVideoExportWorker();
  if (!worker) {
    throw new Error('Web Worker is not supported or failed to initialize.');
  }

  const slides = options.slides;
  if (!slides || slides.length === 0) {
    worker.terminate();
    throw new Error('Slides data is required for Web Worker video export.');
  }

  const exportId = `export_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return new Promise<Blob>((resolve, reject) => {
    let isSettled = false;
    let cancelCheckInterval: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (cancelCheckInterval) {
        clearInterval(cancelCheckInterval);
        cancelCheckInterval = null;
      }
      try {
        worker.terminate();
      } catch {
        // ignore
      }
    };

    worker.onmessage = (event: MessageEvent<VideoExportWorkerOutbound>) => {
      const msg = event.data;
      if (!msg || msg.id !== exportId) return;

      if (msg.type === 'PROGRESS') {
        options.onProgress?.(msg.progress);
      } else if (msg.type === 'SUCCESS') {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        const blob = new Blob([msg.buffer], { type: msg.mimeType });
        resolve(blob);
      } else if (msg.type === 'ERROR') {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        reject(new Error(msg.error));
      }
    };

    worker.onerror = (err) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      reject(
        new Error(err.message || 'Web Worker export encountered an error'),
      );
    };

    // Cancellation polling loop
    cancelCheckInterval = setInterval(() => {
      if (options.checkCancelled?.()) {
        if (isSettled) return;
        isSettled = true;
        const cancelMsg: VideoExportWorkerInbound = {
          id: exportId,
          type: 'CANCEL_EXPORT',
        };
        try {
          worker.postMessage(cancelMsg);
        } catch {
          // ignore
        }
        cleanup();
        reject(new Error('Export cancelled'));
      }
    }, 100);

    const requestMsg: VideoExportWorkerRequest = {
      id: exportId,
      type: 'START_EXPORT',
      format: options.format,
      fps: options.fps,
      scale: options.scale ?? 2,
      quality: options.quality ?? 'high',
      transparent: options.transparent ?? options.format === 'webm',
      totalDurationMs: options.totalDurationMs,
      boundaryBox: options.boundaryBox,
      stageWidth: options.stageWidth,
      stageHeight: options.stageHeight,
      slides,
      aspectRatio: options.aspectRatio ?? '16:9',
      isMainThread: false,
    };

    worker.postMessage(requestMsg);
  });
}

/**
 * Exports tactical animation to MP4 using WebCodecs & mp4-muxer,
 * with automatic MediaRecorder fallback if WebCodecs is unavailable or fails.
 */
export async function exportMp4Video(
  options: VideoExportOptions,
): Promise<Blob> {
  const {
    fps,
    scale = 2,
    quality = 'high',
    totalDurationMs,
    boundaryBox,
    stageWidth,
    stageHeight,
    slides,
    aspectRatio = '16:9',
    onRenderFrame,
    onCaptureFrame,
    onProgress,
    checkCancelled,
  } = options;

  const cropInfo = calculateBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
  );
  const { exportWidth, exportHeight } = cropInfo;

  const bitrate =
    (scale ?? 2) >= 2.5
      ? quality === 'low'
        ? 18_000_000
        : 30_000_000
      : (scale ?? 2) >= 1.5
        ? quality === 'low'
          ? 10_000_000
          : 16_000_000
        : quality === 'low'
          ? 5_000_000
          : 8_000_000;

  // Check if WebCodecs VideoEncoder is available and supported
  const encoderConfig = await getSupportedH264EncoderConfig(
    exportWidth,
    exportHeight,
    fps,
    bitrate,
  );

  // If WebCodecs is not supported, fall back to MediaRecorder
  if (
    !encoderConfig ||
    typeof window === 'undefined' ||
    !('VideoEncoder' in window)
  ) {
    return exportVideoWithMediaRecorder({
      ...options,
      format: 'mp4',
    });
  }

  const muxer = new Mp4Muxer({
    target: new Mp4ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: exportWidth,
      height: exportHeight,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;
  let videoEncoder: VideoEncoder | null = null;

  try {
    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        console.error('WebCodecs VideoEncoder runtime error:', e);
        encoderError = e;
      },
    });

    videoEncoder.configure(encoderConfig);
  } catch (initErr) {
    console.warn(
      'VideoEncoder.configure failed, falling back to MediaRecorder:',
      initErr,
    );
    return exportVideoWithMediaRecorder({
      ...options,
      format: 'mp4',
    });
  }

  // Dedicated offscreen canvas for 100% opaque sRGB frame capture
  const offscreenCanvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(exportWidth, exportHeight)
      : document.createElement('canvas');
  offscreenCanvas.width = exportWidth;
  offscreenCanvas.height = exportHeight;
  const offscreenCtx = (offscreenCanvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
    willReadFrequently: false,
  }) || offscreenCanvas.getContext('2d')) as AnyCanvasRenderingContext2D | null;

  if (!offscreenCtx) {
    throw new Error('Failed to create 2D canvas context for MP4 export');
  }

  const effectiveDurationMs = totalDurationMs > 0 ? totalDurationMs : 3000;
  const totalFrames = Math.max(
    1,
    Math.ceil((effectiveDurationMs / 1000) * fps),
  );
  const frameDurationUs = 1_000_000 / fps;

  let lastReportedTime = 0;
  let lastReportedPercent = -1;
  const keyFrameInterval = Math.max(fps * 2, 60);

  try {
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (checkCancelled?.()) {
        throw new Error('Export cancelled');
      }
      if (encoderError) {
        throw encoderError;
      }
      if (videoEncoder.state === 'closed') {
        throw new Error('VideoEncoder closed unexpectedly');
      }

      // Backpressure management with fast microtask unblocking (pipeline buffer: up to 60 frames, drains to 30)
      if (videoEncoder.encodeQueueSize > 60) {
        await new Promise<void>((resolve) => {
          if (!videoEncoder || videoEncoder.state === 'closed') {
            resolve();
            return;
          }
          videoEncoder.ondequeue = () => {
            if (!videoEncoder || videoEncoder.encodeQueueSize <= 30) {
              if (videoEncoder) videoEncoder.ondequeue = null;
              resolve();
            }
          };
        });
      }

      const timeMs = (frameIdx / fps) * 1000;

      if (slides && slides.length > 0) {
        // Direct deterministic canvas frame rendering (100% reliable & blazing fast)
        renderTacticalFrameToCanvas(offscreenCtx, {
          slides,
          timeMs,
          width: exportWidth,
          height: exportHeight,
          aspectRatio,
          boundaryBox,
          transparent: false,
        });
      } else {
        // Fallback to Konva Stage snapshot only if slides are not passed
        await onRenderFrame?.(timeMs);
        const sourceCanvas = onCaptureFrame?.(cropInfo);
        if (!sourceCanvas) {
          throw new Error('Failed to capture frame from canvas stage');
        }

        offscreenCtx.fillStyle = '#020617';
        offscreenCtx.fillRect(0, 0, exportWidth, exportHeight);
        offscreenCtx.imageSmoothingEnabled = true;
        offscreenCtx.imageSmoothingQuality = 'high';
        offscreenCtx.drawImage(sourceCanvas, 0, 0, exportWidth, exportHeight);
      }

      const timestampUs = Math.round(frameIdx * frameDurationUs);
      const videoFrame = new VideoFrame(offscreenCanvas, {
        timestamp: timestampUs,
        duration: Math.round(frameDurationUs),
      });

      if (videoEncoder.state === 'configured') {
        const isKeyFrame = frameIdx === 0 || frameIdx % keyFrameInterval === 0;
        videoEncoder.encode(videoFrame, {
          keyFrame: isKeyFrame,
        });
      }
      videoFrame.close();

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
          message: `Rendering frame ${frameIdx + 1} of ${totalFrames} (${progressPercent}%)`,
        });
      }
    }

    onProgress?.({
      percent: 96,
      stage: 'finalizing',
      message: 'Finalizing MP4 video container...',
    });

    if (videoEncoder.state === 'configured') {
      await videoEncoder.flush();
    }
    muxer.finalize();

    const buffer = muxer.target.buffer;
    onProgress?.({
      percent: 100,
      stage: 'idle',
      message: 'MP4 export completed successfully!',
    });

    return new Blob([buffer], { type: 'video/mp4' });
  } catch (err) {
    console.warn(
      'WebCodecs execution error, attempting MediaRecorder fallback:',
      err,
    );
    return exportVideoWithMediaRecorder({
      ...options,
      format: 'mp4',
    });
  } finally {
    try {
      if (videoEncoder && videoEncoder.state !== 'closed') {
        videoEncoder.close();
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Exports tactical animation to Transparent WebM using WebCodecs (webm-muxer + VP9)
 * with automatic MediaRecorder fallback if WebCodecs is unavailable.
 */
export async function exportTransparentWebm(
  options: VideoExportOptions,
): Promise<Blob> {
  const {
    fps,
    scale = 2,
    quality = 'high',
    transparent = true,
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

  const cropInfo = calculateBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
  );
  const { exportWidth, exportHeight } = cropInfo;

  const bitrate =
    (scale ?? 2) >= 2.5
      ? quality === 'low'
        ? 18_000_000
        : 30_000_000
      : (scale ?? 2) >= 1.5
        ? quality === 'low'
          ? 10_000_000
          : 16_000_000
        : quality === 'low'
          ? 5_000_000
          : 8_000_000;

  // Check if WebCodecs VP9 is supported
  const encoderConfig = await getSupportedVP9EncoderConfig(
    exportWidth,
    exportHeight,
    fps,
    bitrate,
    transparent,
  );

  if (
    !encoderConfig ||
    typeof window === 'undefined' ||
    !('VideoEncoder' in window)
  ) {
    return exportVideoWithMediaRecorder({
      ...options,
      format: 'webm',
      transparent: true,
    });
  }

  const muxer = new WebmMuxer({
    target: new WebmArrayBufferTarget(),
    video: {
      codec: 'V_VP9',
      width: exportWidth,
      height: exportHeight,
      frameRate: fps,
      alpha: transparent,
    },
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;
  let videoEncoder: VideoEncoder | null = null;

  try {
    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        console.error('WebCodecs VP9 VideoEncoder runtime error:', e);
        encoderError = e;
      },
    });

    videoEncoder.configure(encoderConfig);
  } catch (initErr) {
    console.warn(
      'VP9 VideoEncoder.configure failed, falling back to MediaRecorder:',
      initErr,
    );
    return exportVideoWithMediaRecorder({
      ...options,
      format: 'webm',
      transparent: true,
    });
  }

  const offscreenCanvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(exportWidth, exportHeight)
      : document.createElement('canvas');
  offscreenCanvas.width = exportWidth;
  offscreenCanvas.height = exportHeight;
  const offscreenCtx = (offscreenCanvas.getContext('2d', {
    alpha: transparent,
    desynchronized: true,
    willReadFrequently: false,
  }) || offscreenCanvas.getContext('2d')) as AnyCanvasRenderingContext2D | null;

  if (!offscreenCtx) {
    throw new Error('Failed to create 2D canvas context for WebM export');
  }

  if (transparent) {
    onSetBackgroundVisible?.(false);
  }

  const effectiveDurationMs = totalDurationMs > 0 ? totalDurationMs : 3000;
  const totalFrames = Math.max(
    1,
    Math.ceil((effectiveDurationMs / 1000) * fps),
  );
  const frameDurationUs = 1_000_000 / fps;

  let lastReportedTime = 0;
  let lastReportedPercent = -1;
  const keyFrameInterval = Math.max(fps * 2, 60);

  try {
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (checkCancelled?.()) {
        throw new Error('Export cancelled');
      }
      if (encoderError) {
        throw encoderError;
      }
      if (videoEncoder.state === 'closed') {
        throw new Error('VideoEncoder closed unexpectedly');
      }

      // Backpressure management with fast microtask unblocking (pipeline buffer: up to 60 frames, drains to 30)
      if (videoEncoder.encodeQueueSize > 60) {
        await new Promise<void>((resolve) => {
          if (!videoEncoder || videoEncoder.state === 'closed') {
            resolve();
            return;
          }
          videoEncoder.ondequeue = () => {
            if (!videoEncoder || videoEncoder.encodeQueueSize <= 30) {
              if (videoEncoder) videoEncoder.ondequeue = null;
              resolve();
            }
          };
        });
      }

      const timeMs = (frameIdx / fps) * 1000;

      if (slides && slides.length > 0) {
        renderTacticalFrameToCanvas(offscreenCtx, {
          slides,
          timeMs,
          width: exportWidth,
          height: exportHeight,
          aspectRatio,
          boundaryBox,
          transparent,
        });
      } else {
        await onRenderFrame?.(timeMs);
        const sourceCanvas = onCaptureFrame?.(cropInfo);
        if (!sourceCanvas) {
          throw new Error('Failed to capture frame from canvas stage');
        }

        if (transparent) {
          offscreenCtx.clearRect(0, 0, exportWidth, exportHeight);
        } else {
          offscreenCtx.fillStyle = '#020617';
          offscreenCtx.fillRect(0, 0, exportWidth, exportHeight);
        }

        offscreenCtx.imageSmoothingEnabled = true;
        offscreenCtx.imageSmoothingQuality = 'high';
        offscreenCtx.drawImage(sourceCanvas, 0, 0, exportWidth, exportHeight);
      }

      const timestampUs = Math.round(frameIdx * frameDurationUs);
      const videoFrame = new VideoFrame(offscreenCanvas, {
        timestamp: timestampUs,
        duration: Math.round(frameDurationUs),
      });

      if (videoEncoder.state === 'configured') {
        const isKeyFrame = frameIdx === 0 || frameIdx % keyFrameInterval === 0;
        videoEncoder.encode(videoFrame, {
          keyFrame: isKeyFrame,
        });
      }
      videoFrame.close();

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
          message: `Rendering WebM frame ${frameIdx + 1} of ${totalFrames} (${progressPercent}%)`,
        });
      }
    }

    onProgress?.({
      percent: 96,
      stage: 'finalizing',
      message: 'Finalizing WebM container...',
    });

    if (videoEncoder.state === 'configured') {
      await videoEncoder.flush();
    }
    muxer.finalize();

    const buffer = muxer.target.buffer;
    onProgress?.({
      percent: 100,
      stage: 'idle',
      message: 'WebM export completed successfully!',
    });

    return new Blob([buffer], { type: 'video/webm' });
  } catch (err) {
    console.warn(
      'WebCodecs VP9 execution error, attempting MediaRecorder fallback:',
      err,
    );
    return exportVideoWithMediaRecorder({
      ...options,
      format: 'webm',
      transparent: true,
    });
  } finally {
    if (transparent) {
      onSetBackgroundVisible?.(true);
    }
    try {
      if (videoEncoder && videoEncoder.state !== 'closed') {
        videoEncoder.close();
      }
    } catch {
      // ignore
    }
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

  const cropInfo = calculateBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
  );
  const { exportWidth, exportHeight } = cropInfo;

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
 * Unified tactical animation video export entry point.
 * Executes the Direct Turbo Engine (WebCodecs + Direct OffscreenCanvas Zero-Wait Pipelining)
 * directly in the execution context with cooperative microtask yielding (0% UI freeze).
 * Automatically falls back to format-specific WebCodecs and MediaRecorder handlers as needed.
 */
export async function exportTacticalVideo(
  options: VideoExportOptions,
): Promise<Blob> {
  // 1. Primary Engine: Direct Turbo Engine (WebCodecs GPU Hardware Accelerated + Zero-Wait Pipelining)
  if (
    options.slides &&
    options.slides.length > 0 &&
    typeof globalThis !== 'undefined' &&
    'VideoEncoder' in globalThis
  ) {
    try {
      return await exportVideoDirect(options);
    } catch (directErr) {
      console.warn(
        'Direct WebCodecs video export failed, falling back to format-specific handler:',
        directErr,
      );
    }
  }

  // 2. Format-specific handlers (WebCodecs / MediaRecorder fallback)
  if (options.format === 'mp4') {
    return exportMp4Video(options);
  }

  return exportTransparentWebm(options);
}
