/**
 * video-export-worker.ts
 * Dedicated Web Worker pipeline for off-thread WebCodecs video encoding.
 *
 * Capabilities:
 *   - 100% off-thread frame rendering with OffscreenCanvas (Zero UI freeze)
 *   - Blazing fast GPU-accelerated H.264 & VP9 WebCodecs encoding
 *   - Automatic transferable buffer zero-copy postMessage for chunks
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
  bitrate?: number;
  h264Profile?: 'baseline' | 'main' | 'high';
  maxQueueSize?: number;
  transparent?: boolean;
  totalDurationMs: number;
  boundaryBox?: BoundaryBox | null;
  stageWidth: number;
  stageHeight: number;
  slides: Slide[];
  aspectRatio?: AspectRatio;
  isMainThread?: boolean;
  startFrameIdx?: number;
  endFrameIdx?: number;
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

export interface VideoExportWorkerChunkMessage {
  id: string;
  type: 'CHUNK_DATA';
  chunkType: 'key' | 'delta';
  timestamp: number;
  duration: number;
  buffer: ArrayBuffer;
  decoderConfig?: VideoDecoderConfig;
}

export interface WorkerSegmentProfile {
  startFrame: number;
  endFrame: number;
  totalFrames: number;
  totalMs: number;
  zoneADrawMs: number;
  zoneBFrameMs: number;
  zoneCEncodeMs: number;
  queueWaitMs: number;
  flushMs: number;
  peakQueueSize: number;
  waitedTimes: number;
}

export interface VideoExportWorkerSuccessMessage {
  id: string;
  type: 'SUCCESS';
  buffer: ArrayBuffer;
  mimeType: string;
  profile?: WorkerSegmentProfile;
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
  | VideoExportWorkerChunkMessage
  | VideoExportWorkerSuccessMessage
  | VideoExportWorkerErrorMessage
  | VideoExportWorkerPongMessage;

const VP9_CODEC_CANDIDATES = [
  'vp09.00.10.08',
  'vp09.00.41.08',
  'vp09.02.10.10',
  'vp9',
];

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

  const isVertical = stageHeight > stageWidth;
  const isSquare = stageWidth === stageHeight;
  const isFourThree = Math.abs(stageWidth / stageHeight - 4 / 3) < 0.05;

  let baseWidth: number;
  let baseHeight: number;

  if (scale >= 2.5) {
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

export async function getWorkerH264EncoderConfig(
  width: number,
  height: number,
  fps: number,
  bitrate = 12_000_000,
  profile: 'baseline' | 'main' | 'high' = 'main',
): Promise<VideoEncoderConfig | null> {
  if (typeof globalThis === 'undefined' || !('VideoEncoder' in globalThis)) {
    return null;
  }

  const candidates =
    profile === 'baseline'
      ? ['avc1.42E01E', 'avc1.4d002a', 'avc1.64002a']
      : profile === 'high'
        ? ['avc1.64002a', 'avc1.4d002a', 'avc1.42E01E']
        : ['avc1.4d002a', 'avc1.4D401F', 'avc1.64002a', 'avc1.42E01E'];

  const accelOptions: HardwareAcceleration[] = [
    'prefer-hardware',
    'no-preference',
    'prefer-software',
  ];
  const latencyModes: LatencyMode[] = ['realtime', 'quality'];

  for (const hardwareAcceleration of accelOptions) {
    for (const latencyMode of latencyModes) {
      for (const codec of candidates) {
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
        } catch {}
      }
    }
  }
  return null;
}

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
        } catch {}
      }
    }
  }
  return null;
}

/**
 * Main Direct & Off-Thread Turbo Video Export Execution Engine.
 */
export async function executeOffThreadVideoExport(
  request: VideoExportWorkerRequest,
  onProgress?: (progress: ExportProgress) => void,
  checkCancelled?: () => boolean,
): Promise<{
  buffer: ArrayBuffer;
  mimeType: string;
  profile?: WorkerSegmentProfile;
}> {
  const {
    format,
    fps,
    scale = 2,
    quality = 'high',
    bitrate: customBitrate,
    h264Profile = 'high',
    maxQueueSize = 60,
    transparent = false,
    totalDurationMs,
    boundaryBox,
    stageWidth,
    stageHeight,
    slides,
    aspectRatio = '16:9',
    isMainThread = false,
  } = request;

  const cropInfo = calculateWorkerBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
  );
  const { exportWidth, exportHeight } = cropInfo;

  const bitrate =
    customBitrate ??
    ((scale ?? 2) >= 2.5
      ? quality === 'low'
        ? 12_000_000
        : 24_000_000
      : (scale ?? 2) >= 1.5
        ? quality === 'low'
          ? 8_000_000
          : 12_000_000
        : quality === 'low'
          ? 4_000_000
          : 8_000_000);

  const effectiveDurationMs = totalDurationMs > 0 ? totalDurationMs : 3000;
  const totalFrames = Math.max(
    1,
    Math.ceil((effectiveDurationMs / 1000) * fps),
  );
  const frameDurationUs = 1_000_000 / fps;

  const startFrameIdx = Math.max(0, request.startFrameIdx ?? 0);
  const endFrameIdx = Math.min(
    totalFrames - 1,
    request.endFrameIdx ?? totalFrames - 1,
  );
  const actualFramesCount = endFrameIdx - startFrameIdx + 1;

  let encoderError: Error | null = null;
  let videoEncoder: VideoEncoder | null = null;

  const handleError = (e: Error) => {
    console.error(`[Footics Video Export Engine] VideoEncoder error:`, e);
    encoderError = e;
  };

  const offscreenCanvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(exportWidth, exportHeight)
      : document.createElement('canvas');
  offscreenCanvas.width = exportWidth;
  offscreenCanvas.height = exportHeight;

  let encoderConfig: VideoEncoderConfig | null = null;
  let muxer: Mp4Muxer<Mp4ArrayBufferTarget> | WebmMuxer<WebmArrayBufferTarget>;
  let mimeType = '';

  if (format === 'mp4') {
    encoderConfig = await getWorkerH264EncoderConfig(
      exportWidth,
      exportHeight,
      fps,
      bitrate,
      h264Profile,
    );
    if (!encoderConfig) {
      throw new Error('No supported H.264 WebCodecs configuration found.');
    }
    mimeType = 'video/mp4';

    const mp4Muxer = new Mp4Muxer({
      target: new Mp4ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: exportWidth,
        height: exportHeight,
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });
    muxer = mp4Muxer;

    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => mp4Muxer.addVideoChunk(chunk, meta),
      error: handleError,
    });
    videoEncoder.configure(encoderConfig);
  } else {
    encoderConfig = await getWorkerVP9EncoderConfig(
      exportWidth,
      exportHeight,
      fps,
      bitrate,
      transparent,
    );
    if (!encoderConfig) {
      throw new Error('No supported VP9 WebCodecs configuration found.');
    }
    mimeType = 'video/webm';

    const webmMuxer = new WebmMuxer({
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
    muxer = webmMuxer;

    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => webmMuxer.addVideoChunk(chunk, meta),
      error: handleError,
    });
    videoEncoder.configure(encoderConfig);
  }

  console.log(
    `[Footics Turbo Engine] Configured: format=${format.toUpperCase()}, codec=${encoderConfig.codec}, dimensions=${exportWidth}x${exportHeight}, fps=${fps}, frames=${actualFramesCount}, maxQueue=${maxQueueSize}`,
  );

  const offscreenCtx = (offscreenCanvas.getContext('2d', {
    alpha: format === 'webm' ? transparent : false,
    desynchronized: true,
    willReadFrequently: false,
  }) || offscreenCanvas.getContext('2d')) as AnyCanvasRenderingContext2D | null;

  if (!offscreenCtx) {
    throw new Error('Failed to create 2D OffscreenCanvas context');
  }

  let peakQueueSize = 0;
  let waitedTimes = 0;
  let queueWaitMs = 0;
  let zoneADrawMs = 0;
  let zoneBFrameMs = 0;
  let zoneCEncodeMs = 0;
  let flushMs = 0;
  const keyFrameInterval = Math.max(fps * 2, 60);

  const highWatermark = Math.max(10, maxQueueSize);
  const lowWatermark = Math.max(5, Math.floor(highWatermark / 3));

  const startTimeTotal =
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    for (let frameIdx = startFrameIdx; frameIdx <= endFrameIdx; frameIdx++) {
      if (checkCancelled?.()) throw new Error('Export cancelled');
      if (encoderError) throw encoderError;
      if (videoEncoder.state === 'closed') {
        throw new Error('VideoEncoder closed unexpectedly');
      }

      peakQueueSize = Math.max(peakQueueSize, videoEncoder.encodeQueueSize);

      // Backpressure management with fast microtask unblocking + safety timeout
      if (videoEncoder.encodeQueueSize > highWatermark) {
        const queueStart =
          typeof performance !== 'undefined' ? performance.now() : Date.now();
        waitedTimes++;
        await new Promise<void>((resolve) => {
          if (
            !videoEncoder ||
            videoEncoder.state === 'closed' ||
            videoEncoder.encodeQueueSize <= lowWatermark
          ) {
            resolve();
            return;
          }
          const timer = setTimeout(() => {
            if (videoEncoder) videoEncoder.ondequeue = null;
            resolve();
          }, 50);
          videoEncoder.ondequeue = () => {
            if (!videoEncoder || videoEncoder.encodeQueueSize <= lowWatermark) {
              clearTimeout(timer);
              if (videoEncoder) videoEncoder.ondequeue = null;
              resolve();
            }
          };
        });
        queueWaitMs +=
          (typeof performance !== 'undefined'
            ? performance.now()
            : Date.now()) - queueStart;
      }

      // Microtask yield on main thread to ensure 0% UI freeze
      if (isMainThread && frameIdx % 15 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }

      const timeMs = (frameIdx / fps) * 1000;

      // Zone A: Canvas 描画
      const tDrawStart =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      renderTacticalFrameToCanvas(offscreenCtx, {
        slides,
        timeMs,
        width: exportWidth,
        height: exportHeight,
        aspectRatio,
        boundaryBox,
        transparent: format === 'webm' ? transparent : false,
      });
      const tDrawEnd =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const currentDrawMs = tDrawEnd - tDrawStart;
      zoneADrawMs += currentDrawMs;

      // Zone B: VideoFrame 生成
      const tFrameStart =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const timestampUs = Math.round(frameIdx * frameDurationUs);
      const videoFrame = new VideoFrame(offscreenCanvas, {
        timestamp: timestampUs,
        duration: Math.round(frameDurationUs),
      });
      const tFrameEnd =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const currentFrameMs = tFrameEnd - tFrameStart;
      zoneBFrameMs += currentFrameMs;

      // Zone C: GPU エンコード投入
      const tEncodeStart =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (videoEncoder.state === 'configured') {
        const isKeyFrame =
          frameIdx === startFrameIdx || frameIdx % keyFrameInterval === 0;
        videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      }
      videoFrame.close();
      const tEncodeEnd =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const currentEncodeMs = tEncodeEnd - tEncodeStart;
      zoneCEncodeMs += currentEncodeMs;

      if (frameIdx % 30 === 0 || frameIdx === endFrameIdx) {
        console.log(
          `[${format.toUpperCase()} Frame ${frameIdx + 1}/${totalFrames}] ` +
            `[区画A(描画): ${currentDrawMs.toFixed(2)}ms] ` +
            `[区画B(Frame): ${currentFrameMs.toFixed(2)}ms] ` +
            `[区画C(GPU): ${currentEncodeMs.toFixed(2)}ms] | ` +
            `Queue: ${videoEncoder.encodeQueueSize}/${maxQueueSize} (Buffer Limit: ${maxQueueSize})`,
        );
      }

      const progressPercent = Math.min(
        95,
        Math.round(((frameIdx - startFrameIdx + 1) / actualFramesCount) * 95),
      );
      if (
        frameIdx === endFrameIdx ||
        (frameIdx - startFrameIdx) % 30 === 0 ||
        frameIdx - startFrameIdx === 0
      ) {
        onProgress?.({
          percent: progressPercent,
          stage: 'rendering',
          message: `Rendering ${format.toUpperCase()} frame ${frameIdx + 1} of ${totalFrames} (${progressPercent}%)`,
        });
      }
    }

    onProgress?.({
      percent: 96,
      stage: 'finalizing',
      message: `Finalizing ${format.toUpperCase()} container...`,
    });

    if (videoEncoder.state === 'configured') {
      const tFlushStart =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      await videoEncoder.flush();
      flushMs =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
        tFlushStart;
    }

    muxer.finalize();
    const finalBuffer = muxer.target.buffer;

    const totalMs =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
      startTimeTotal;
    const fpsSpeed = actualFramesCount / (totalMs / 1000);
    const realtimeRatio = effectiveDurationMs / totalMs;

    console.log(
      `%c[3-Zone Profiling Benchmark (${format.toUpperCase()})] Total: ${totalMs.toFixed(1)}ms (${fpsSpeed.toFixed(1)} fps, ${realtimeRatio.toFixed(1)}x realtime) | Frames: ${actualFramesCount} | Buffer Limit: ${maxQueueSize} | ${exportWidth}x${exportHeight} | ${encoderConfig.codec} (${encoderConfig.hardwareAcceleration || 'default'}, ${encoderConfig.latencyMode || 'default'})\n` +
        `  - 区画A (Canvas描画): ${zoneADrawMs.toFixed(1)}ms (avg: ${(zoneADrawMs / actualFramesCount).toFixed(2)}ms/f, ${((zoneADrawMs / totalMs) * 100).toFixed(1)}%)\n` +
        `  - 区画B (VideoFrame生成): ${zoneBFrameMs.toFixed(1)}ms (avg: ${(zoneBFrameMs / actualFramesCount).toFixed(2)}ms/f, ${((zoneBFrameMs / totalMs) * 100).toFixed(1)}%)\n` +
        `  - 区画C (GPUエンコード投入/待機): ${(zoneCEncodeMs + queueWaitMs + flushMs).toFixed(1)}ms (EncodeCall: ${zoneCEncodeMs.toFixed(1)}ms, QueueWait: ${queueWaitMs.toFixed(1)}ms [waited: ${waitedTimes} times, peak queue: ${peakQueueSize}/${maxQueueSize}], Flush: ${flushMs.toFixed(1)}ms, ${(((zoneCEncodeMs + queueWaitMs + flushMs) / totalMs) * 100).toFixed(1)}%)`,
      'color: #10b981; font-weight: bold; font-size: 13px;',
    );

    onProgress?.({
      percent: 100,
      stage: 'idle',
      message: `${format.toUpperCase()} export completed successfully!`,
    });

    const profile: WorkerSegmentProfile = {
      startFrame: startFrameIdx,
      endFrame: endFrameIdx,
      totalFrames: actualFramesCount,
      totalMs,
      zoneADrawMs,
      zoneBFrameMs,
      zoneCEncodeMs,
      queueWaitMs,
      flushMs,
      peakQueueSize,
      waitedTimes,
    };

    return { buffer: finalBuffer, mimeType, profile };
  } finally {
    try {
      if (videoEncoder && videoEncoder.state !== 'closed') {
        videoEncoder.close();
      }
    } catch {}
  }
}

// ─────────────────────────────────────────
// Web Worker Message Listener
// ─────────────────────────────────────────

if (typeof self !== 'undefined' && typeof window === 'undefined') {
  let activeExportId: string | null = null;
  let isCancelled = false;

  const handleMessage = async (
    event: MessageEvent<VideoExportWorkerInbound>,
  ) => {
    const msg = event.data;
    if (!msg) return;

    if (msg.type === 'PING') {
      self.postMessage({
        id: msg.id,
        type: 'PONG',
      } as VideoExportWorkerPongMessage);
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
            self.postMessage({
              id: msg.id,
              type: 'PROGRESS',
              progress,
            } as VideoExportWorkerProgressMessage);
          },
          () => isCancelled,
        );

        (
          self as unknown as {
            postMessage: (msg: any, transfer?: Transferable[]) => void;
          }
        ).postMessage(
          {
            id: msg.id,
            type: 'SUCCESS',
            buffer: result.buffer,
            mimeType: result.mimeType,
            profile: result.profile,
          } as VideoExportWorkerSuccessMessage,
          [result.buffer],
        );
      } catch (err: unknown) {
        self.postMessage({
          id: msg.id,
          type: 'ERROR',
          error: err instanceof Error ? err.message : String(err),
        } as VideoExportWorkerErrorMessage);
      } finally {
        if (activeExportId === msg.id) {
          activeExportId = null;
          isCancelled = false;
        }
      }
    }
  };

  self.addEventListener('message', handleMessage);
  self.onmessage = handleMessage;
}
