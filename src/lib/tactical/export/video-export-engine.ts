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
