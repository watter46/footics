/**
 * video-export-worker.ts
 * Dedicated Web Worker pipeline for off-thread WebCodecs video encoding.
 *
 * Capabilities:
 *   - 100% off-thread frame rendering with OffscreenCanvas (Zero UI freeze)
 *   - Blazing fast GPU-accelerated H.264 MP4 export (mp4-muxer)
 *   - Blazing fast GPU-accelerated VP9 Transparent WebM export (webm-muxer) with alpha channel
 *   - Automatic transferable buffer zero-copy postMessage
 *   - Graceful cancellation & throttled progress reporting
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

export interface VideoExportWorkerRequest {
  id: string;
  type: 'START_EXPORT';
  format: 'mp4' | 'webm';
  fps: number;
  scale?: number;
  quality?: 'low' | 'medium' | 'high';
  transparent?: boolean;
  totalDurationMs: number;
  boundaryBox?: BoundaryBox | null;
  stageWidth: number;
  stageHeight: number;
  slides: Slide[];
  aspectRatio?: AspectRatio;
  isMainThread?: boolean;
}

export interface VideoExportWorkerCancel {
  id: string;
  type: 'CANCEL_EXPORT';
}

export interface VideoExportWorkerPing {
  id: string;
  type: 'PING';
}

export type VideoExportWorkerInbound =
  | VideoExportWorkerRequest
  | VideoExportWorkerCancel
  | VideoExportWorkerPing;

export interface VideoExportWorkerProgressMessage {
  id: string;
  type: 'PROGRESS';
  progress: ExportProgress;
}

export interface VideoExportWorkerSuccessMessage {
  id: string;
  type: 'SUCCESS';
  buffer: ArrayBuffer;
  mimeType: string;
}

export interface VideoExportWorkerErrorMessage {
  id: string;
  type: 'ERROR';
  error: string;
}

export interface VideoExportWorkerPongMessage {
  id: string;
  type: 'PONG';
}

export type VideoExportWorkerOutbound =
  | VideoExportWorkerProgressMessage
  | VideoExportWorkerSuccessMessage
  | VideoExportWorkerErrorMessage
  | VideoExportWorkerPongMessage;

const H264_CODEC_CANDIDATES = [
  'avc1.42E01E', // Baseline Profile Level 3.0 (Ultra-low GPU compute overhead)
  'avc1.4d002a', // Main Profile Level 4.2 (High-throughput GPU accelerated)
  'avc1.4D401F', // Main Profile Level 3.1
  'avc1.64002a', // High Profile Level 4.2 (Maximum compression)
];

const VP9_CODEC_CANDIDATES = [
  'vp09.00.10.08', // Profile 0, 8-bit, 4:2:0
  'vp09.00.41.08', // Profile 0, Level 4.1
  'vp09.02.10.10', // Profile 2, 10-bit
  'vp9',
];

/**
 * Calculates boundary crop dimensions with even-number snapping.
 */
export function calculateWorkerBoundaryCrop(
  box: BoundaryBox | undefined | null,
  stageWidth: number,
  stageHeight: number,
  scale = 2,
) {
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

/**
 * Detects H.264 VideoEncoder configuration.
 */
export async function getWorkerH264EncoderConfig(
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

  // Prioritize 'realtime' latencyMode to unleash full GPU hardware encoder throughput
  // (avoids 1x realtime throttling imposed by 'quality' mode in hardware encoders)
  const latencyModes: LatencyMode[] = ['realtime', 'quality'];

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
          // Continue
        }
      }
    }
  }

  return null;
}

/**
 * Detects VP9 VideoEncoder configuration (supports alpha channel).
 */
export async function getWorkerVP9EncoderConfig(
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

  // Prioritize 'realtime' latencyMode for high-throughput encoding
  const latencyModes: LatencyMode[] = ['realtime', 'quality'];

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
          // Continue
        }
      }
    }
  }

  return null;
}

/**
 * Core off-thread video export executor.
 */
export async function executeOffThreadVideoExport(
  data: VideoExportWorkerRequest,
  onProgress?: (p: ExportProgress) => void,
  checkCancelled?: () => boolean,
): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  const {
    format,
    fps,
    scale = 2,
    quality = 'high',
    transparent = format === 'webm',
    totalDurationMs,
    boundaryBox,
    stageWidth,
    stageHeight,
    slides,
    aspectRatio = '16:9',
  } = data;

  const cropInfo = calculateWorkerBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
  );
  const { exportWidth, exportHeight } = cropInfo;

  const bitrate =
    scale >= 2.5
      ? quality === 'low'
        ? 18_000_000
        : 30_000_000
      : scale >= 1.5
        ? quality === 'low'
          ? 10_000_000
          : 16_000_000
        : quality === 'low'
          ? 5_000_000
          : 8_000_000;

  if (
    typeof OffscreenCanvas === 'undefined' &&
    typeof document === 'undefined'
  ) {
    throw new Error(
      'Canvas / OffscreenCanvas is not supported in this environment.',
    );
  }
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('WebCodecs VideoEncoder is not supported.');
  }

  const effectiveDurationMs = totalDurationMs > 0 ? totalDurationMs : 3000;
  const totalFrames = Math.max(
    1,
    Math.ceil((effectiveDurationMs / 1000) * fps),
  );
  const frameDurationUs = 1_000_000 / fps;

  let encoderError: Error | null = null;
  let videoEncoder: VideoEncoder | null = null;

  if (format === 'mp4') {
    const encoderConfig = await getWorkerH264EncoderConfig(
      exportWidth,
      exportHeight,
      fps,
      bitrate,
    );
    if (!encoderConfig) {
      throw new Error('No supported H.264 WebCodecs configuration found.');
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

    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        encoderError = e;
      },
    });
    videoEncoder.configure(encoderConfig);

    console.log(
      `[Video Export Worker] MP4 Encoder Configured: ` +
        `codec=${encoderConfig.codec}, ` +
        `accel=${encoderConfig.hardwareAcceleration || 'default'}, ` +
        `latency=${encoderConfig.latencyMode || 'default'}, ` +
        `bitrate=${((encoderConfig.bitrate || bitrate) / 1_000_000).toFixed(1)}Mbps, ` +
        `dimensions=${exportWidth}x${exportHeight}`,
    );

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
    }) ||
      offscreenCanvas.getContext('2d')) as AnyCanvasRenderingContext2D | null;

    if (!offscreenCtx) {
      throw new Error('Failed to create 2D OffscreenCanvas context for MP4');
    }

    let lastReportedTime = 0;
    let lastReportedPercent = -1;

    let totalZoneARenderMs = 0;
    let totalZoneBFrameMs = 0;
    let totalZoneCEncodeMs = 0;
    let totalQueueWaitMs = 0;
    let queueWaitCount = 0;
    let peakQueueSize = 0;
    const exportStartTime = performance.now();
    const keyFrameInterval = Math.max(fps * 2, 60);

    try {
      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (checkCancelled?.()) {
          throw new Error('Export cancelled');
        }
        if (encoderError) {
          throw encoderError;
        }

        if (videoEncoder.encodeQueueSize > peakQueueSize) {
          peakQueueSize = videoEncoder.encodeQueueSize;
        }

        // Async queue backpressure control (ultra-low latency GPU buffer: up to 24 frames, drains to 8)
        if (videoEncoder.encodeQueueSize > 24) {
          queueWaitCount++;
          const waitStart = performance.now();
          await new Promise<void>((resolve) => {
            if (!videoEncoder || videoEncoder.state === 'closed') {
              resolve();
              return;
            }
            videoEncoder.ondequeue = () => {
              if (!videoEncoder || videoEncoder.encodeQueueSize <= 8) {
                if (videoEncoder) videoEncoder.ondequeue = null;
                resolve();
              }
            };
          });
          const waitElapsed = performance.now() - waitStart;
          totalQueueWaitMs += waitElapsed;
        }

        const timeMs = (frameIdx / fps) * 1000;

        // [Zone A] 2D Canvas 描画
        const t0 = performance.now();
        renderTacticalFrameToCanvas(offscreenCtx, {
          slides,
          timeMs,
          width: exportWidth,
          height: exportHeight,
          aspectRatio,
          boundaryBox,
          transparent: false,
        });
        const t1 = performance.now();
        const zoneARenderMs = t1 - t0;
        totalZoneARenderMs += zoneARenderMs;

        // [Zone B] VideoFrame 生成 & メモリ確保
        const timestampUs = Math.round(frameIdx * frameDurationUs);
        const videoFrame = new VideoFrame(offscreenCanvas, {
          timestamp: timestampUs,
          duration: Math.round(frameDurationUs),
        });
        const t2 = performance.now();
        const zoneBFrameMs = t2 - t1;
        totalZoneBFrameMs += zoneBFrameMs;

        // [Zone C] GPU エンコード投入
        if (videoEncoder.state === 'configured') {
          const isKeyFrame =
            frameIdx === 0 || frameIdx % keyFrameInterval === 0;
          videoEncoder.encode(videoFrame, {
            keyFrame: isKeyFrame,
          });
        }
        videoFrame.close();
        const t3 = performance.now();
        const zoneCEncodeMs = t3 - t2;
        totalZoneCEncodeMs += zoneCEncodeMs;

        if (frameIdx % 60 === 0 || frameIdx === totalFrames - 1) {
          console.log(
            `[MP4 Export Frame ${frameIdx + 1}/${totalFrames}] ` +
              `[区画A(Canvas描画): ${zoneARenderMs.toFixed(2)}ms] ` +
              `[区画B(VideoFrame生成): ${zoneBFrameMs.toFixed(2)}ms] ` +
              `[区画C(GPUエンコード): ${zoneCEncodeMs.toFixed(2)}ms] ` +
              `| Queue: ${videoEncoder.encodeQueueSize}`,
          );
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
            message: `Rendering MP4 frame ${frameIdx + 1} of ${totalFrames} (${progressPercent}%)`,
          });
        }
      }

      onProgress?.({
        percent: 96,
        stage: 'finalizing',
        message: 'Finalizing MP4 container...',
      });

      const flushStart = performance.now();
      if (videoEncoder.state === 'configured') {
        await videoEncoder.flush();
      }
      const flushMs = performance.now() - flushStart;
      muxer.finalize();
      const totalExportElapsed = performance.now() - exportStartTime;
      const exportFps = totalFrames / (totalExportElapsed / 1000);
      const speedMultiplier = (
        effectiveDurationMs / totalExportElapsed
      ).toFixed(1);

      console.log(
        `%c[3-Zone Profiling Benchmark (MP4)] Total: ${totalExportElapsed.toFixed(1)}ms (${exportFps.toFixed(1)} fps, ${speedMultiplier}x realtime) | Frames: ${totalFrames} | ${exportWidth}x${exportHeight} | ${encoderConfig.codec} (${encoderConfig.hardwareAcceleration || 'default'}, ${encoderConfig.latencyMode || 'default'})\n` +
          `  - 区画A (Canvas描画): ${totalZoneARenderMs.toFixed(1)}ms (avg: ${(totalZoneARenderMs / totalFrames).toFixed(2)}ms/f, ${((totalZoneARenderMs / totalExportElapsed) * 100).toFixed(1)}%)\n` +
          `  - 区画B (VideoFrame生成): ${totalZoneBFrameMs.toFixed(1)}ms (avg: ${(totalZoneBFrameMs / totalFrames).toFixed(2)}ms/f, ${((totalZoneBFrameMs / totalExportElapsed) * 100).toFixed(1)}%)\n` +
          `  - 区画C (GPUエンコード投入/待機): ${(totalZoneCEncodeMs + totalQueueWaitMs + flushMs).toFixed(1)}ms (EncodeCall: ${totalZoneCEncodeMs.toFixed(1)}ms, QueueWait: ${totalQueueWaitMs.toFixed(1)}ms [waited ${queueWaitCount} times, peak queue: ${peakQueueSize}], Flush: ${flushMs.toFixed(1)}ms, ${(((totalZoneCEncodeMs + totalQueueWaitMs + flushMs) / totalExportElapsed) * 100).toFixed(1)}%)`,
        'color: #38bdf8; font-weight: bold;',
      );

      onProgress?.({
        percent: 100,
        stage: 'idle',
        message: 'MP4 export completed successfully!',
      });

      return {
        buffer: muxer.target.buffer,
        mimeType: 'video/mp4',
      };
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

  // WebM format (VP9 with alpha transparency)
  const encoderConfig = await getWorkerVP9EncoderConfig(
    exportWidth,
    exportHeight,
    fps,
    bitrate,
    transparent,
  );
  if (!encoderConfig) {
    throw new Error('No supported VP9 WebCodecs configuration found.');
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

  videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e;
    },
  });
  videoEncoder.configure(encoderConfig);

  console.log(
    `[Video Export Worker] WebM Encoder Configured: ` +
      `codec=${encoderConfig.codec}, ` +
      `accel=${encoderConfig.hardwareAcceleration || 'default'}, ` +
      `latency=${encoderConfig.latencyMode || 'default'}, ` +
      `bitrate=${((encoderConfig.bitrate || bitrate) / 1_000_000).toFixed(1)}Mbps, ` +
      `dimensions=${exportWidth}x${exportHeight}`,
  );

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
    throw new Error('Failed to create 2D OffscreenCanvas context for WebM');
  }

  let lastReportedTime = 0;
  let lastReportedPercent = -1;
  let totalZoneARenderMs = 0;
  let totalZoneBFrameMs = 0;
  let totalZoneCEncodeMs = 0;
  let totalQueueWaitMs = 0;
  let queueWaitCount = 0;
  let peakQueueSize = 0;
  const exportStartTime = performance.now();
  const keyFrameInterval = Math.max(fps * 2, 60);

  try {
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (checkCancelled?.()) {
        throw new Error('Export cancelled');
      }
      if (encoderError) {
        throw encoderError;
      }

      if (videoEncoder.encodeQueueSize > peakQueueSize) {
        peakQueueSize = videoEncoder.encodeQueueSize;
      }

      // Async queue backpressure control (ultra-low latency GPU buffer: up to 24 frames, drains to 8)
      if (videoEncoder.encodeQueueSize > 24) {
        queueWaitCount++;
        const waitStart = performance.now();
        await new Promise<void>((resolve) => {
          if (!videoEncoder || videoEncoder.state === 'closed') {
            resolve();
            return;
          }
          videoEncoder.ondequeue = () => {
            if (!videoEncoder || videoEncoder.encodeQueueSize <= 8) {
              if (videoEncoder) videoEncoder.ondequeue = null;
              resolve();
            }
          };
        });
        const waitElapsed = performance.now() - waitStart;
        totalQueueWaitMs += waitElapsed;
      }

      const timeMs = (frameIdx / fps) * 1000;

      // [Zone A] 2D Canvas 描画 (透過)
      const t0 = performance.now();
      renderTacticalFrameToCanvas(offscreenCtx, {
        slides,
        timeMs,
        width: exportWidth,
        height: exportHeight,
        aspectRatio,
        boundaryBox,
        transparent,
      });
      const t1 = performance.now();
      const zoneARenderMs = t1 - t0;
      totalZoneARenderMs += zoneARenderMs;

      // [Zone B] VideoFrame 生成 & メモリ確保
      const timestampUs = Math.round(frameIdx * frameDurationUs);
      const videoFrame = new VideoFrame(offscreenCanvas, {
        timestamp: timestampUs,
        duration: Math.round(frameDurationUs),
      });
      const t2 = performance.now();
      const zoneBFrameMs = t2 - t1;
      totalZoneBFrameMs += zoneBFrameMs;

      // [Zone C] GPU エンコード投入
      if (videoEncoder.state === 'configured') {
        const isKeyFrame = frameIdx === 0 || frameIdx % keyFrameInterval === 0;
        videoEncoder.encode(videoFrame, {
          keyFrame: isKeyFrame,
        });
      }
      videoFrame.close();
      const t3 = performance.now();
      const zoneCEncodeMs = t3 - t2;
      totalZoneCEncodeMs += zoneCEncodeMs;

      if (frameIdx % 60 === 0 || frameIdx === totalFrames - 1) {
        console.log(
          `[WebM Export Frame ${frameIdx + 1}/${totalFrames}] ` +
            `[区画A(Canvas描画): ${zoneARenderMs.toFixed(2)}ms] ` +
            `[区画B(VideoFrame生成): ${zoneBFrameMs.toFixed(2)}ms] ` +
            `[区画C(GPUエンコード): ${zoneCEncodeMs.toFixed(2)}ms] ` +
            `| Queue: ${videoEncoder.encodeQueueSize}`,
        );
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
          message: `Rendering WebM frame ${frameIdx + 1} of ${totalFrames} (${progressPercent}%)`,
        });
      }
    }

    onProgress?.({
      percent: 96,
      stage: 'finalizing',
      message: 'Finalizing WebM container...',
    });

    const flushStart = performance.now();
    if (videoEncoder.state === 'configured') {
      await videoEncoder.flush();
    }
    const flushMs = performance.now() - flushStart;
    muxer.finalize();
    const totalExportElapsed = performance.now() - exportStartTime;
    const exportFps = totalFrames / (totalExportElapsed / 1000);
    const speedMultiplier = (effectiveDurationMs / totalExportElapsed).toFixed(
      1,
    );

    console.log(
      `%c[3-Zone Profiling Benchmark (WebM)] Total: ${totalExportElapsed.toFixed(1)}ms (${exportFps.toFixed(1)} fps, ${speedMultiplier}x realtime) | Frames: ${totalFrames} | ${exportWidth}x${exportHeight} | ${encoderConfig.codec} (${encoderConfig.hardwareAcceleration || 'default'}, ${encoderConfig.latencyMode || 'default'})\n` +
        `  - 区画A (Canvas描画): ${totalZoneARenderMs.toFixed(1)}ms (avg: ${(totalZoneARenderMs / totalFrames).toFixed(2)}ms/f, ${((totalZoneARenderMs / totalExportElapsed) * 100).toFixed(1)}%)\n` +
        `  - 区画B (VideoFrame生成): ${totalZoneBFrameMs.toFixed(1)}ms (avg: ${(totalZoneBFrameMs / totalFrames).toFixed(2)}ms/f, ${((totalZoneBFrameMs / totalExportElapsed) * 100).toFixed(1)}%)\n` +
        `  - 区画C (GPUエンコード投入/待機): ${(totalZoneCEncodeMs + totalQueueWaitMs + flushMs).toFixed(1)}ms (EncodeCall: ${totalZoneCEncodeMs.toFixed(1)}ms, QueueWait: ${totalQueueWaitMs.toFixed(1)}ms [waited ${queueWaitCount} times, peak queue: ${peakQueueSize}], Flush: ${flushMs.toFixed(1)}ms, ${(((totalZoneCEncodeMs + totalQueueWaitMs + flushMs) / totalExportElapsed) * 100).toFixed(1)}%)`,
      'color: #38bdf8; font-weight: bold;',
    );

    onProgress?.({
      percent: 100,
      stage: 'idle',
      message: 'WebM export completed successfully!',
    });

    return {
      buffer: muxer.target.buffer,
      mimeType: 'video/webm',
    };
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

// ── Web Worker Message Handling Loop ──
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  let activeExportId: string | null = null;
  let isCancelled = false;

  self.onmessage = async (event: MessageEvent<VideoExportWorkerInbound>) => {
    const msg = event.data;
    if (!msg) return;

    if (msg.type === 'PING') {
      const pongMsg: VideoExportWorkerPongMessage = {
        id: msg.id,
        type: 'PONG',
      };
      self.postMessage(pongMsg);
      return;
    }

    if (msg.type === 'CANCEL_EXPORT') {
      if (activeExportId === msg.id) {
        isCancelled = true;
      }
      return;
    }

    if (msg.type === 'START_EXPORT') {
      activeExportId = msg.id;
      isCancelled = false;

      try {
        const result = await executeOffThreadVideoExport(
          msg,
          (progress) => {
            const progressMsg: VideoExportWorkerProgressMessage = {
              id: msg.id,
              type: 'PROGRESS',
              progress,
            };
            self.postMessage(progressMsg);
          },
          () => isCancelled,
        );

        const successMsg: VideoExportWorkerSuccessMessage = {
          id: msg.id,
          type: 'SUCCESS',
          buffer: result.buffer,
          mimeType: result.mimeType,
        };
        (
          self as unknown as {
            postMessage: (
              message: VideoExportWorkerOutbound,
              transfer?: Transferable[],
            ) => void;
          }
        ).postMessage(successMsg, [result.buffer]);
      } catch (err: unknown) {
        const errorMsg: VideoExportWorkerErrorMessage = {
          id: msg.id,
          type: 'ERROR',
          error: err instanceof Error ? err.message : String(err),
        };
        self.postMessage(errorMsg);
      } finally {
        if (activeExportId === msg.id) {
          activeExportId = null;
          isCancelled = false;
        }
      }
    }
  };
}
