/**
 * tactical-video-exporter.ts
 * Multi-Slide Morphing Video Export Engine (WebCodecs MP4 & WebM)
 *
 * SOTA High-performance Tactical Animation & Video Pipeline:
 *   - Slide-to-slide player morphing (ID / ShirtNo / Name matching with bezier easing)
 *   - WebCodecs VideoEncoder (GPU hardware-accelerated H.264 / VP9) + mp4-muxer / webm-muxer
 *   - Static pause-frame cloning optimization to eliminate redundant GPU rasterization
 *   - Boundary Box cropping with 8-pixel macroblock alignment
 *   - Automatic MediaRecorder fallback for non-WebCodecs environments
 */

import {
  ArrayBufferTarget as Mp4ArrayBufferTarget,
  Muxer as Mp4Muxer,
} from 'mp4-muxer';
import type {
  AspectRatio,
  BoundaryBox,
  ExportProgress,
  Slide,
} from '@/lib/types/tactical-unified';
import {
  calculateUnifiedTotalDuration,
  matchSlidePlayers,
} from '../unified-interpolation';
import {
  type AnyCanvasRenderingContext2D,
  isPauseFrame,
  renderTacticalFrameToCanvas,
} from './tactical-frame-renderer';
import {
  calculateBoundaryCrop,
  exportTacticalVideo,
  exportVideoWithMediaRecorder,
  getSupportedH264EncoderConfig,
  getSupportedVP9EncoderConfig,
} from './video-export-engine';

export interface MultiSlideVideoExportOptions {
  slides: Slide[];
  format?: 'mp4' | 'webm';
  fps?: number;
  scale?: number;
  quality?: 'low' | 'medium' | 'high';
  bitrate?: number;
  h264Profile?: 'baseline' | 'main' | 'high';
  transitionDurationMs?: number;
  pauseMs?: number;
  easing?: Slide['easing'];
  keyFrameIntervalSec?: number;
  latencyMode?: 'realtime' | 'quality';
  maxQueueSize?: number;
  transparent?: boolean;
  stageWidth?: number;
  stageHeight?: number;
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  onProgress?: (progress: ExportProgress) => void;
  checkCancelled?: () => boolean;
}

/**
 * Applies transition duration, pause, and easing overrides to a sequence of slides.
 */
export function applySlideTimelineOverrides(
  slides: Slide[],
  overrides?: {
    transitionDurationMs?: number;
    pauseMs?: number;
    easing?: Slide['easing'];
  },
): Slide[] {
  if (
    !overrides ||
    (!overrides.transitionDurationMs && !overrides.pauseMs && !overrides.easing)
  ) {
    return slides;
  }

  return slides.map((slide) => ({
    ...slide,
    ...(overrides.transitionDurationMs !== undefined
      ? { transitionDurationMs: overrides.transitionDurationMs }
      : {}),
    ...(overrides.pauseMs !== undefined ? { pauseMs: overrides.pauseMs } : {}),
    ...(overrides.easing !== undefined ? { easing: overrides.easing } : {}),
  }));
}

/**
 * Exports multi-slide tactical animation to MP4 using WebCodecs & mp4-muxer.
 */
export async function exportMultiSlideMp4Video(
  options: MultiSlideVideoExportOptions,
): Promise<Blob> {
  const {
    fps = 60,
    scale = 2,
    quality = 'high',
    boundaryBox,
    stageWidth = 1280,
    stageHeight = 720,
    aspectRatio = '16:9',
    keyFrameIntervalSec = 2,
    latencyMode = 'realtime',
    maxQueueSize = 60,
    onProgress,
    checkCancelled,
  } = options;

  // 1. Prepare slides with timeline overrides
  const effectiveSlides = applySlideTimelineOverrides(options.slides, {
    transitionDurationMs: options.transitionDurationMs,
    pauseMs: options.pauseMs,
    easing: options.easing,
  });

  if (effectiveSlides.length === 0) {
    throw new Error('No slides provided for MP4 export');
  }

  const totalDurationMs = calculateUnifiedTotalDuration(effectiveSlides);
  const effectiveDurationMs = totalDurationMs > 0 ? totalDurationMs : 1500;

  // 2. Compute Crop & Resolution (Macroblock 8-aligned)
  const cropInfo = calculateBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
  );
  const { exportWidth, exportHeight } = cropInfo;

  const bitrate =
    options.bitrate ??
    (scale >= 2.5
      ? quality === 'low'
        ? 18_000_000
        : 30_000_000
      : scale >= 1.5
        ? quality === 'low'
          ? 12_000_000
          : 24_000_000
        : quality === 'low'
          ? 6_000_000
          : 10_000_000);

  // 3. Encoder Configuration
  const encoderConfig = await getSupportedH264EncoderConfig(
    exportWidth,
    exportHeight,
    fps,
    bitrate,
  );

  if (
    !encoderConfig ||
    typeof globalThis === 'undefined' ||
    !('VideoEncoder' in globalThis)
  ) {
    // Fallback to MediaRecorder
    return exportVideoWithMediaRecorder({
      format: 'mp4',
      fps,
      scale,
      quality,
      bitrate,
      totalDurationMs: effectiveDurationMs,
      boundaryBox,
      stageWidth,
      stageHeight,
      slides: effectiveSlides,
      aspectRatio,
      onProgress,
      checkCancelled,
    });
  }

  // Override latencyMode if specified
  encoderConfig.latencyMode = latencyMode;

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
        console.error('[TacticalVideoExporter] WebCodecs runtime error:', e);
        encoderError = e;
      },
    });
    videoEncoder.configure(encoderConfig);
  } catch (initErr) {
    console.warn(
      '[TacticalVideoExporter] VideoEncoder configure failed, falling back to MediaRecorder:',
      initErr,
    );
    return exportVideoWithMediaRecorder({
      format: 'mp4',
      fps,
      scale,
      quality,
      bitrate,
      totalDurationMs: effectiveDurationMs,
      boundaryBox,
      stageWidth,
      stageHeight,
      slides: effectiveSlides,
      aspectRatio,
      onProgress,
      checkCancelled,
    });
  }

  // 4. Dedicated Offscreen Canvas
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

  const totalFrames = Math.max(
    1,
    Math.ceil((effectiveDurationMs / 1000) * fps),
  );
  const frameDurationUs = 1_000_000 / fps;
  const keyFrameInterval = Math.max(fps * keyFrameIntervalSec, 30);

  let lastReportedTime = 0;
  let lastReportedPercent = -1;
  let cachedPauseFrame: VideoFrame | null = null;

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

      // Backpressure management
      if (videoEncoder.encodeQueueSize > maxQueueSize) {
        await new Promise<void>((resolve) => {
          if (!videoEncoder || videoEncoder.state === 'closed') {
            resolve();
            return;
          }
          const drainThreshold = Math.max(10, Math.floor(maxQueueSize / 2));
          videoEncoder.ondequeue = () => {
            if (
              !videoEncoder ||
              videoEncoder.encodeQueueSize <= drainThreshold
            ) {
              if (videoEncoder) videoEncoder.ondequeue = null;
              resolve();
            }
          };
        });
      }

      const timeMs = (frameIdx / fps) * 1000;
      const isPaused = isPauseFrame(effectiveSlides, timeMs);
      const timestampUs = Math.round(frameIdx * frameDurationUs);
      const isKeyFrame = frameIdx === 0 || frameIdx % keyFrameInterval === 0;

      let videoFrame: VideoFrame;

      if (isPaused && cachedPauseFrame && !isKeyFrame) {
        // Fast static frame clone without CPU canvas rasterization
        videoFrame = cachedPauseFrame.clone();
      } else {
        // Render complete frame to canvas
        renderTacticalFrameToCanvas(offscreenCtx, {
          slides: effectiveSlides,
          timeMs,
          width: exportWidth,
          height: exportHeight,
          aspectRatio,
          boundaryBox,
          transparent: false,
        });

        videoFrame = new VideoFrame(offscreenCanvas, {
          timestamp: timestampUs,
          duration: Math.round(frameDurationUs),
        });

        if (isPaused) {
          if (cachedPauseFrame) {
            cachedPauseFrame.close();
          }
          cachedPauseFrame = videoFrame.clone();
        } else if (cachedPauseFrame) {
          cachedPauseFrame.close();
          cachedPauseFrame = null;
        }
      }

      if (videoEncoder.state === 'configured') {
        videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
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
          message: `Encoding morphing frame ${frameIdx + 1} of ${totalFrames} (${progressPercent}%)`,
        });
      }
    }

    if (cachedPauseFrame) {
      cachedPauseFrame.close();
      cachedPauseFrame = null;
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
    if (cachedPauseFrame) {
      cachedPauseFrame.close();
      cachedPauseFrame = null;
    }
    console.warn(
      '[TacticalVideoExporter] WebCodecs execution error, attempting MediaRecorder fallback:',
      err,
    );
    return exportVideoWithMediaRecorder({
      format: 'mp4',
      fps,
      scale,
      quality,
      bitrate,
      totalDurationMs: effectiveDurationMs,
      boundaryBox,
      stageWidth,
      stageHeight,
      slides: effectiveSlides,
      aspectRatio,
      onProgress,
      checkCancelled,
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
 * Exports multi-slide tactical animation to Transparent / Opaque WebM (VP9).
 */
export async function exportMultiSlideWebmVideo(
  options: MultiSlideVideoExportOptions,
): Promise<Blob> {
  const effectiveSlides = applySlideTimelineOverrides(options.slides, {
    transitionDurationMs: options.transitionDurationMs,
    pauseMs: options.pauseMs,
    easing: options.easing,
  });

  const totalDurationMs = calculateUnifiedTotalDuration(effectiveSlides);

  return exportTacticalVideo({
    format: 'webm',
    fps: options.fps ?? 60,
    scale: options.scale ?? 2,
    quality: options.quality ?? 'high',
    bitrate: options.bitrate,
    keyFrameIntervalSec: options.keyFrameIntervalSec ?? 2,
    latencyMode: options.latencyMode ?? 'realtime',
    maxQueueSize: options.maxQueueSize ?? 60,
    transparent: options.transparent ?? true,
    totalDurationMs: totalDurationMs > 0 ? totalDurationMs : 1500,
    boundaryBox: options.boundaryBox,
    stageWidth: options.stageWidth ?? 1280,
    stageHeight: options.stageHeight ?? 720,
    slides: effectiveSlides,
    aspectRatio: options.aspectRatio ?? '16:9',
    onProgress: options.onProgress,
    checkCancelled: options.checkCancelled,
  });
}

/**
 * Universal multi-slide video export entrypoint.
 */
export async function exportMultiSlideVideo(
  options: MultiSlideVideoExportOptions,
): Promise<Blob> {
  if (options.format === 'webm') {
    return exportMultiSlideWebmVideo(options);
  }
  return exportMultiSlideMp4Video(options);
}

// Re-export matching and utility functions
export {
  calculateBoundaryCrop,
  calculateUnifiedTotalDuration,
  exportTacticalVideo,
  getSupportedH264EncoderConfig,
  getSupportedVP9EncoderConfig,
  matchSlidePlayers,
};
