import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import {
  createPitchBackground,
  extractPlayerMetadataMap,
  type RenderContext2D,
  renderPitchFrame,
} from '@/lib/tactical/export/pitch-renderer';
import type {
  ExportJobConfig,
  ExportWorkerInMessage,
} from '@/lib/tactical/export/types';
import {
  calculateTotalDuration,
  getInterpolatedFrameState,
} from '@/lib/tactical/interpolation';

interface WorkerGlobalScopeLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<ExportWorkerInMessage>) => void) | null;
}

const workerScope = self as unknown as WorkerGlobalScopeLike;

let isCancelled = false;

async function processExport(
  config: ExportJobConfig,
  photos?: Record<string, ImageBitmap>,
) {
  isCancelled = false;

  const totalDurationMs = calculateTotalDuration(config.scenes);
  if (totalDurationMs <= 0 || config.scenes.length <= 1) {
    throw new Error('エクスポートには2つ以上のシーンが必要です');
  }

  // 1. OffscreenCanvas の初期化
  const offscreenCanvas = new OffscreenCanvas(
    config.exportWidth,
    config.exportHeight,
  );
  const ctx = offscreenCanvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
  });

  if (!ctx) {
    throw new Error(
      'Worker 内で OffscreenCanvas 2D コンテキストの生成に失敗しました',
    );
  }

  // 2. ピッチ背景の事前キャッシュ (1枚の OffscreenCanvas に一度だけ描画)
  const bgCanvas = createPitchBackground(
    config.exportWidth,
    config.exportHeight,
    config.orientation,
    config.backgroundColor,
  );

  // 3. 選手メタデータの事前キャッシュ
  const playerMetadataMap = extractPlayerMetadataMap(config.scenes);

  // 4. mp4-muxer と WebCodecs VideoEncoder の初期化
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: config.exportWidth,
      height: config.exportHeight,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      console.error('VideoEncoder error in worker:', e);
      encoderError = e;
    },
  });

  videoEncoder.configure({
    codec: 'avc1.4d002a',
    width: config.exportWidth,
    height: config.exportHeight,
    bitrate: config.bitrate,
    framerate: config.fps,
  });

  const totalFrames = Math.max(
    1,
    Math.ceil((totalDurationMs / 1000) * config.fps),
  );
  const frameDurationUs = 1000000 / config.fps;

  // 5. 超高速・決定論的フレームレンダリング＆エンコードループ
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (isCancelled) {
      throw new Error('エクスポートがキャンセルされました');
    }
    if (encoderError) {
      throw encoderError;
    }

    // ハードウェアエンコーダのバックプレッシャ制御
    while (videoEncoder.encodeQueueSize > 24) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }

    const timeMs = (frameIdx / config.fps) * 1000;
    const frameState = getInterpolatedFrameState(config.scenes, timeMs);

    // OffscreenCanvas 上に 1 フレーム分を描画 (背景 blit + マーカー)
    renderPitchFrame(
      ctx as unknown as RenderContext2D,
      bgCanvas,
      frameState,
      playerMetadataMap,
      config.exportWidth,
      config.exportHeight,
      photos,
      config.teamVisibility,
    );

    // ゼロコピー: OffscreenCanvas から直接 VideoFrame を生成してエンコード
    const timestampUs = Math.round(frameIdx * frameDurationUs);
    const videoFrame = new VideoFrame(offscreenCanvas, {
      timestamp: timestampUs,
      duration: Math.round(frameDurationUs),
    });

    videoEncoder.encode(videoFrame, {
      keyFrame: frameIdx % (config.fps * 2) === 0, // 2秒ごとにIフレーム (圧縮効率向上)
    });
    videoFrame.close();

    // 進捗率を通知 (メインスレッドの通信負荷を軽減するため間引き)
    if (frameIdx % 15 === 0 || frameIdx === totalFrames - 1) {
      const progress = Math.min(
        99,
        Math.round(((frameIdx + 1) / totalFrames) * 100),
      );
      workerScope.postMessage({ type: 'progress', progress });
    }
  }

  // 6. エンコーダのフラッシュと MP4 最終化
  await videoEncoder.flush();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  workerScope.postMessage({ type: 'complete', buffer }, [buffer]);
}

workerScope.onmessage = async (event: MessageEvent<ExportWorkerInMessage>) => {
  const message = event.data;

  if (message.type === 'cancel') {
    isCancelled = true;
    return;
  }

  if (message.type === 'start') {
    try {
      await processExport(message.config, message.photos);
    } catch (err) {
      workerScope.postMessage({
        type: 'error',
        error: err instanceof Error ? err.message : 'Unknown export error',
      });
    }
  }
};
