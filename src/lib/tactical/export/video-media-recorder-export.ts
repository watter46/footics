import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { calculatePitchRect } from '../pitch-geometry';
import { renderTacticalFrameToCanvas } from './tactical-frame-renderer';
import { calculateBoundaryCrop } from './video-crop-calc';
import type { VideoExportOptions } from './video-export-types';

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
    ? new Float32Array(
        buildExportMVPMatrix(
          options.pitchTransform,
          exportWidth,
          exportHeight,
          aspectRatio,
        ),
      )
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

    options.onProgress?.({
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

    options.onProgress?.({
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
