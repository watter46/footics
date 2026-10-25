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

import type {
  AspectRatio,
  BoundaryBox,
  ExportProgress,
  Slide,
} from '@/lib/types/tactical-unified';
import { PITCH_BOUNDARY_CONFIGS } from '../pitch-geometry';
import {
  calculateUnifiedTotalDuration,
  matchSlidePlayers,
} from '../unified-interpolation';
import {
  calculateBoundaryCrop,
  exportTacticalVideo,
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
 * Exports multi-slide tactical animation to MP4 using Mediabunny.
 */
export async function exportMultiSlideMp4Video(
  options: MultiSlideVideoExportOptions,
): Promise<Blob> {
  if (!options.slides || options.slides.length === 0) {
    throw new Error('No slides provided for MP4 export');
  }

  const effectiveSlides = applySlideTimelineOverrides(options.slides, {
    transitionDurationMs: options.transitionDurationMs,
    pauseMs: options.pauseMs,
    easing: options.easing,
  });

  const totalDurationMs = calculateUnifiedTotalDuration(effectiveSlides);
  const config =
    PITCH_BOUNDARY_CONFIGS[options.aspectRatio ?? '16:9'] ??
    PITCH_BOUNDARY_CONFIGS['16:9'];
  const stageWidth = options.stageWidth ?? config.widthPx;
  const stageHeight = options.stageHeight ?? config.heightPx;

  return exportTacticalVideo({
    format: 'mp4',
    fps: options.fps ?? 60,
    scale: options.scale ?? 2,
    quality: options.quality ?? 'high',
    bitrate: options.bitrate,
    keyFrameIntervalSec: options.keyFrameIntervalSec ?? 2,
    latencyMode: options.latencyMode ?? 'realtime',
    maxQueueSize: options.maxQueueSize ?? 60,
    transparent: options.transparent ?? false,
    totalDurationMs: totalDurationMs > 0 ? totalDurationMs : 1500,
    boundaryBox: options.boundaryBox,
    stageWidth,
    stageHeight,
    slides: effectiveSlides,
    aspectRatio: options.aspectRatio ?? '16:9',
    onProgress: options.onProgress,
    checkCancelled: options.checkCancelled,
  });
}

/**
 * Exports multi-slide tactical animation to Transparent / Opaque WebM (VP9).
 */
export async function exportMultiSlideWebmVideo(
  options: MultiSlideVideoExportOptions,
): Promise<Blob> {
  if (!options.slides || options.slides.length === 0) {
    throw new Error('No slides provided for WebM export');
  }

  const effectiveSlides = applySlideTimelineOverrides(options.slides, {
    transitionDurationMs: options.transitionDurationMs,
    pauseMs: options.pauseMs,
    easing: options.easing,
  });

  const totalDurationMs = calculateUnifiedTotalDuration(effectiveSlides);
  const config =
    PITCH_BOUNDARY_CONFIGS[options.aspectRatio ?? '16:9'] ??
    PITCH_BOUNDARY_CONFIGS['16:9'];
  const stageWidth = options.stageWidth ?? config.widthPx;
  const stageHeight = options.stageHeight ?? config.heightPx;

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
    stageWidth,
    stageHeight,
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
