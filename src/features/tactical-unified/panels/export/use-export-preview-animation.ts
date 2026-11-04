'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';
import {
  ASPECT_CONTAINER_CLASSES,
  CINEMATIC_MASK_FILL,
  hasActivePitchTransform,
  PREVIEW_DIMENSIONS,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
} from './export-preview-constants';
import { useAnimationFrameLoop } from './use-animation-frame-loop';
import { useExportPreviewTextures } from './use-export-preview-textures';

export {
  ASPECT_CONTAINER_CLASSES,
  CINEMATIC_MASK_FILL,
  hasActivePitchTransform,
  PREVIEW_DIMENSIONS,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
  useAnimationFrameLoop,
};

export interface UseExportPreviewAnimationParams {
  slides: Slide[];
  aspectRatio: AspectRatio;
  /** キャンバス自体の出力アスペクト比（省略時は aspectRatio、レイアウト画面では '16:9' 固定） */
  canvasAspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  screenBackground?: ScreenBackgroundConfig;
  externalIsPlaying?: boolean;
  onToggleExternalPlay?: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  sliderRef: React.RefObject<HTMLInputElement | null>;
}

export function useExportPreviewAnimation({
  slides,
  aspectRatio,
  canvasAspectRatio,
  boundaryBox,
  pitchTransform,
  photos,
  playerPhotos,
  pitchAppearance,
  screenBackground,
  externalIsPlaying,
  onToggleExternalPlay,
  canvasRef,
  timeLabelRef,
  sliderRef,
}: UseExportPreviewAnimationParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const effectiveIsPlaying =
    externalIsPlaying !== undefined ? externalIsPlaying : isPlaying;
  const totalDurationMs = calculateUnifiedTotalDuration(slides) || 1000;
  const currentTimeMsRef = useRef<number>(0);

  const { effectivePlayerPhotos, marbleTexture } = useExportPreviewTextures({
    slides,
    photos,
    playerPhotos,
    pitchAppearance,
  });

  const effectiveAspectRatio = canvasAspectRatio ?? aspectRatio;
  const basePreviewDim =
    PREVIEW_DIMENSIONS[effectiveAspectRatio] ?? PREVIEW_DIMENSIONS['16:9'];

  const cropInfo = useMemo(() => {
    return calculateBoundaryCrop(
      boundaryBox,
      basePreviewDim.width,
      basePreviewDim.height,
      1,
      basePreviewDim.width > 0
        ? {
            x: 0,
            y: 0,
            width: basePreviewDim.width,
            height: basePreviewDim.height,
          }
        : undefined,
    );
  }, [boundaryBox, basePreviewDim.width, basePreviewDim.height]);

  // 静止時・再生時に関わらず、境界線が有効であれば常時クロップを適用
  const shouldCropPreview = cropInfo.isCropped;

  const previewWidth = useMemo(() => {
    if (!shouldCropPreview) return basePreviewDim.width;
    return cropInfo.exportWidth;
  }, [shouldCropPreview, cropInfo.exportWidth, basePreviewDim.width]);

  const previewHeight = useMemo(() => {
    if (!shouldCropPreview) return basePreviewDim.height;
    return cropInfo.exportHeight;
  }, [shouldCropPreview, cropInfo.exportHeight, basePreviewDim.height]);

  const mvpMatrix = useMemo(() => {
    if (
      (effectiveIsPlaying && slides.length > 1) ||
      !hasActivePitchTransform(pitchTransform) ||
      !pitchTransform
    ) {
      return null;
    }
    return new Float32Array(
      buildExportMVPMatrix(
        pitchTransform,
        basePreviewDim.width,
        basePreviewDim.height,
        aspectRatio,
      ),
    );
  }, [
    effectiveIsPlaying,
    slides.length,
    pitchTransform,
    basePreviewDim.width,
    basePreviewDim.height,
    aspectRatio,
  ]);

  const previewAspectStyle = useMemo(() => {
    if (!shouldCropPreview) return undefined;
    return `${previewWidth} / ${previewHeight}`;
  }, [shouldCropPreview, previewWidth, previewHeight]);

  // ── Canvas Frame Drawing ──
  const drawFrame = useCallback(
    (timeMs: number) => {
      currentTimeMsRef.current = timeMs;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const effectiveBoundaryBox = shouldCropPreview ? boundaryBox : null;

      renderTacticalFrameToCanvas(ctx, {
        slides,
        timeMs,
        width: canvas.width,
        height: canvas.height,
        aspectRatio,
        boundaryBox: effectiveBoundaryBox,
        transparent: false,
        mvpMatrix,
        playerPhotos: effectivePlayerPhotos,
        pitchAppearance,
        marbleTexture,
        screenBackground,
      });

      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = `${(timeMs / 1000).toFixed(1)}s`;
      }
      if (sliderRef.current) {
        sliderRef.current.value = String(Math.round(timeMs));
      }
    },
    [
      slides,
      shouldCropPreview,
      boundaryBox,
      aspectRatio,
      mvpMatrix,
      effectivePlayerPhotos,
      pitchAppearance,
      marbleTexture,
      screenBackground,
      canvasRef,
      timeLabelRef,
      sliderRef,
    ],
  );

  // ── アニメーション停止中、カメラやスライド・外観設定の更新を即座に静止キャンバスへ反映 ──
  useEffect(() => {
    if (!effectiveIsPlaying) drawFrame(currentTimeMsRef.current);
  }, [
    effectiveIsPlaying,
    drawFrame,
    pitchTransform,
    slides,
    pitchAppearance,
    screenBackground,
    boundaryBox,
  ]);

  const { seek } = useAnimationFrameLoop(
    effectiveIsPlaying,
    totalDurationMs,
    drawFrame,
  );

  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const playbackSeekId = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekId,
  );
  const lastHandledSeekIdRef = useRef(0);

  useEffect(() => {
    if (playbackSeekId > 0 && playbackSeekId !== lastHandledSeekIdRef.current) {
      lastHandledSeekIdRef.current = playbackSeekId;
      if (playbackSeekTimeMs !== null) seek(playbackSeekTimeMs);
    }
  }, [playbackSeekId, playbackSeekTimeMs, seek]);

  const togglePlay = useCallback(() => {
    if (onToggleExternalPlay) {
      onToggleExternalPlay();
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [onToggleExternalPlay]);
  const handleReset = useCallback(() => seek(0), [seek]);

  return {
    isPlaying: effectiveIsPlaying,
    totalDurationMs,
    previewWidth,
    previewHeight,
    previewAspectStyle,
    togglePlay,
    handleReset,
    handleSeek: seek,
  };
}
