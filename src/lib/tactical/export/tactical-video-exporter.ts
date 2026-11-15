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

import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type {
  DirectorCameraTrack,
  ExportProgress,
} from '@/lib/types/tactical/project';
import type {
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';
import {
  calculateUnifiedTotalDuration,
  type ResolveSyntheticDirectorCameraOptions,
} from '../engine/director-camera';
import { matchSlidePlayers } from '../interpolation-player';
import {
  preloadMarbleTextureBitmap,
  preloadSlidePlayerPhotos,
} from './share-payload';
import {
  calculateBoundaryCrop,
  exportTacticalVideo,
  getSupportedH264EncoderConfig,
  getSupportedVP9EncoderConfig,
} from './video-export-engine';

export interface MultiSlideVideoExportOptions {
  slides: readonly (Slide | DomainSlide)[];
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
  pitchTransform?: PitchTransform | null;
  pitchAppearance?: PitchAppearanceConfig;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  photos?: Record<string, string>;
  directorCamera?: DirectorCameraTrack | null;
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
  screenBackground?: ScreenBackgroundConfig;
  teamVisibility?: 'both' | 'home' | 'away';
  onProgress?: (progress: ExportProgress) => void;
  checkCancelled?: () => boolean;
}

/**
 * Applies transition duration, pause, and easing overrides to a sequence of slides.
 */
export function applySlideTimelineOverrides<T extends Slide | DomainSlide>(
  slides: readonly T[],
  overrides?: {
    transitionDurationMs?: number;
    pauseMs?: number;
    easing?: Slide['easing'];
  },
): readonly T[] {
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

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const effectiveSlides = applySlideTimelineOverrides(options.slides, {
    transitionDurationMs: options.transitionDurationMs,
    pauseMs: options.pauseMs,
    easing: options.easing,
  });

  const totalDurationMs = calculateUnifiedTotalDuration(effectiveSlides);
  const stageWidth = options.stageWidth ?? 1920;
  const stageHeight = options.stageHeight ?? 1080;

  const shouldPreload = !options.playerPhotos;
  const loadedPhotos =
    options.playerPhotos ??
    (await preloadSlidePlayerPhotos(effectiveSlides, options.photos));
  const marbleTexture = await preloadMarbleTextureBitmap(
    options.pitchAppearance,
  );

  try {
    return await exportTacticalVideo({
      format: 'mp4',
      fps: options.fps ?? 60,
      scale: options.scale ?? 1,
      quality: options.quality ?? 'high',
      bitrate: options.bitrate,
      keyFrameIntervalSec: options.keyFrameIntervalSec ?? 2,
      latencyMode: options.latencyMode ?? 'realtime',
      maxQueueSize: options.maxQueueSize ?? 60,
      transparent: options.transparent ?? false,
      totalDurationMs: totalDurationMs > 0 ? totalDurationMs : 1500,
      boundaryBox: options.boundaryBox,
      pitchTransform: options.pitchTransform,
      pitchAppearance: options.pitchAppearance,
      playerPhotos: loadedPhotos,
      marbleTexture,
      screenBackground: options.screenBackground,
      directorCamera: options.directorCamera,
      directorCameraOptions: options.directorCameraOptions,
      stageWidth,
      stageHeight,
      slides: effectiveSlides,
      aspectRatio: options.aspectRatio ?? '16:9',
      teamVisibility: options.teamVisibility,
      onProgress: options.onProgress,
      checkCancelled: options.checkCancelled,
    });
  } finally {
    if (shouldPreload && loadedPhotos) {
      for (const item of Object.values(loadedPhotos)) {
        if (
          item &&
          'close' in item &&
          typeof (item as ImageBitmap).close === 'function'
        ) {
          (item as ImageBitmap).close();
        }
      }
    }
    if (
      marbleTexture &&
      'close' in marbleTexture &&
      typeof (marbleTexture as ImageBitmap).close === 'function'
    ) {
      (marbleTexture as ImageBitmap).close();
    }
  }
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

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const effectiveSlides = applySlideTimelineOverrides(options.slides, {
    transitionDurationMs: options.transitionDurationMs,
    pauseMs: options.pauseMs,
    easing: options.easing,
  });

  const totalDurationMs = calculateUnifiedTotalDuration(effectiveSlides);
  const stageWidth = options.stageWidth ?? 1920;
  const stageHeight = options.stageHeight ?? 1080;

  const shouldPreload = !options.playerPhotos;
  const loadedPhotos =
    options.playerPhotos ??
    (await preloadSlidePlayerPhotos(effectiveSlides, options.photos));
  const marbleTexture = await preloadMarbleTextureBitmap(
    options.pitchAppearance,
  );

  try {
    return await exportTacticalVideo({
      format: 'webm',
      fps: options.fps ?? 60,
      scale: options.scale ?? 1,
      quality: options.quality ?? 'high',
      bitrate: options.bitrate,
      keyFrameIntervalSec: options.keyFrameIntervalSec ?? 2,
      latencyMode: options.latencyMode ?? 'realtime',
      maxQueueSize: options.maxQueueSize ?? 60,
      transparent: options.transparent ?? true,
      totalDurationMs: totalDurationMs > 0 ? totalDurationMs : 1500,
      boundaryBox: options.boundaryBox,
      pitchTransform: options.pitchTransform,
      pitchAppearance: options.pitchAppearance,
      playerPhotos: loadedPhotos,
      marbleTexture,
      screenBackground: options.screenBackground,
      directorCamera: options.directorCamera,
      directorCameraOptions: options.directorCameraOptions,
      stageWidth,
      stageHeight,
      slides: effectiveSlides,
      aspectRatio: options.aspectRatio ?? '16:9',
      teamVisibility: options.teamVisibility,
      onProgress: options.onProgress,
      checkCancelled: options.checkCancelled,
    });
  } finally {
    if (shouldPreload && loadedPhotos) {
      for (const item of Object.values(loadedPhotos)) {
        if (
          item &&
          'close' in item &&
          typeof (item as ImageBitmap).close === 'function'
        ) {
          (item as ImageBitmap).close();
        }
      }
    }
    if (
      marbleTexture &&
      'close' in marbleTexture &&
      typeof (marbleTexture as ImageBitmap).close === 'function'
    ) {
      (marbleTexture as ImageBitmap).close();
    }
  }
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
