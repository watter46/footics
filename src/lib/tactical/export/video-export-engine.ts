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
  type BoundaryCropInfo,
  calculateBoundaryCrop,
} from './video-crop-calc';
import type { VideoExportOptions } from './video-export-types';
import { exportVideoWithMediaRecorder } from './video-media-recorder-export';
import { exportVideoWithMediabunny } from './video-mediabunny-export';

export {
  getSupportedH264Codec,
  getSupportedH264EncoderConfig,
  getSupportedVP9Codec,
  getSupportedVP9EncoderConfig,
} from './video-codec-support';
export type { BoundaryCropInfo, VideoExportOptions };
export {
  calculateBoundaryCrop,
  exportVideoWithMediabunny,
  exportVideoWithMediaRecorder,
};

/**
 * Creates a dedicated Web Worker instance for off-thread video export.
 */
export function createVideoExportWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(
      new URL('./video-mediabunny.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    );
  } catch {
    return null;
  }
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

/**
 * Exports video using a dedicated Web Worker with zero main-thread freeze,
 * falling back automatically to direct Mediabunny execution on failure.
 */
export async function exportVideoWithWorker(
  options: VideoExportOptions,
): Promise<Blob> {
  const worker = createVideoExportWorker();
  if (!worker) return exportVideoDirect(options);

  try {
    return await new Promise<Blob>((resolve, reject) => {
      const { onProgress, ...serializablePayload } = options;
      const transferList: Transferable[] = [];

      if (typeof ImageBitmap !== 'undefined') {
        if (options.playerPhotos) {
          for (const photo of Object.values(options.playerPhotos)) {
            if (photo instanceof ImageBitmap) {
              transferList.push(photo);
            }
          }
        }
        if (options.marbleTexture instanceof ImageBitmap) {
          transferList.push(options.marbleTexture);
        }
      }

      worker.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (data?.type === 'PROGRESS') {
          onProgress?.(data.progress);
        } else if (data?.type === 'SUCCESS') {
          resolve(
            new Blob([data.buffer], { type: data.mimeType || 'video/mp4' }),
          );
        } else if (data?.type === 'ERROR') {
          reject(new Error(data.error || 'Worker export failed'));
        }
      };

      worker.onerror = (err) => {
        reject(
          err instanceof ErrorEvent
            ? new Error(err.message)
            : new Error('Worker execution error'),
        );
      };

      worker.postMessage(
        { type: 'START_EXPORT', payload: serializablePayload },
        transferList,
      );
    });
  } catch (err) {
    console.warn(
      '[Footics Video Export] Worker export failed, falling back to exportVideoDirect:',
      err,
    );
    return exportVideoDirect(options);
  } finally {
    worker.terminate();
  }
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
 * Unified tactical animation video export entry point using Mediabunny,
 * falling back smoothly to MediaRecorder if necessary.
 */
export async function exportTacticalVideo(
  options: VideoExportOptions,
): Promise<Blob> {
  try {
    return await exportVideoWithWorker(options);
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
