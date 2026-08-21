import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import {
  createPitchBackground,
  createSoccerBallCanvas,
  extractPlayerMetadataMap,
  preRenderPlayerMarkers,
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
  ballBitmap?: ImageBitmap,
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

  // 2. ピッチ背景 & サッカーボールの事前キャッシュ (一度だけ描画)
  const bgCanvas = createPitchBackground(
    config.exportWidth,
    config.exportHeight,
    config.orientation,
    config.backgroundColor,
  );

  const baseDim = Math.min(config.exportWidth, config.exportHeight);
  const ballRadius = baseDim * 0.022;
  const ballCanvas: CanvasImageSource =
    ballBitmap || createSoccerBallCanvas(ballRadius);



  // 3. 選手メタデータの事前キャッシュとマーカーの事前レンダリング
  const playerMetadataMap = extractPlayerMetadataMap(config.scenes);
  const playerCanvasMap = preRenderPlayerMarkers(
    playerMetadataMap,
    config.exportWidth,
    config.exportHeight,
    photos,
  );

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

  // 最適なGPUハードウェアアクセラレーション対応コーデックプロファイルの自動検出
  const codecCandidates = [
    'avc1.64002a', // High Profile Level 4.2 (最優先・高画質・最高速GPUエンコード)
    'avc1.640033', // High Profile Level 5.1
    'avc1.4d002a', // Main Profile Level 4.2
    'avc1.42002a', // Baseline Profile Level 4.2
    'avc1.42001f', // Baseline Profile Level 3.1
  ];

  let selectedCodec = 'avc1.64002a';
  if ('isConfigSupported' in VideoEncoder) {
    for (const codec of codecCandidates) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: config.exportWidth,
          height: config.exportHeight,
          bitrate: config.bitrate,
          framerate: config.fps,
          hardwareAcceleration: 'prefer-hardware',
          latencyMode: 'quality',
        });
        if (support.supported) {
          selectedCodec = codec;
          break;
        }
      } catch {
        // 次の候補を試行
      }
    }
  }

  videoEncoder.configure({
    codec: selectedCodec,
    width: config.exportWidth,
    height: config.exportHeight,
    bitrate: config.bitrate,
    framerate: config.fps,
    hardwareAcceleration: 'prefer-hardware',
    latencyMode: 'quality',
  });

  const totalFrames = Math.max(
    1,
    Math.ceil((totalDurationMs / 1000) * config.fps),
  );
  const frameDurationUs = 1000000 / config.fps;
  const progressStep = Math.max(1, Math.floor(config.fps / 2)); // 約0.5秒おきに進捗通知

  // 5. 超高速・決定論的フレームレンダリング＆エンコードループ
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (isCancelled) {
      throw new Error('エクスポートがキャンセルされました');
    }
    if (encoderError) {
      throw encoderError;
    }

    // ハードウェアエンコーダのバックプレッシャ制御 (GPU並列処理を最大化しつつキュー枯渇・溢れを防止)
    if (videoEncoder.encodeQueueSize > 36) {
      await new Promise<void>((resolve) => {
        videoEncoder.ondequeue = () => {
          if (videoEncoder.encodeQueueSize <= 12) {
            videoEncoder.ondequeue = null;
            resolve();
          }
        };
      });
    }

    const timeMs = (frameIdx / config.fps) * 1000;
    const frameState = getInterpolatedFrameState(config.scenes, timeMs);

    // OffscreenCanvas 上に 1 フレーム分を描画 (事前キャッシュ blit + 高速マーカー)
    renderPitchFrame(
      ctx as unknown as RenderContext2D,
      bgCanvas,
      frameState,
      playerMetadataMap,
      config.exportWidth,
      config.exportHeight,
      photos,
      config.teamVisibility,
      ballCanvas,
      playerCanvasMap,
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
    if (frameIdx % progressStep === 0 || frameIdx === totalFrames - 1) {
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
      await processExport(
        message.config,
        message.photos,
        message.ballBitmap,
      );
    } catch (err) {
      workerScope.postMessage({
        type: 'error',
        error: err instanceof Error ? err.message : 'Unknown export error',
      });
    }
  }
};
