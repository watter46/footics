'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { hasActiveFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';

import {
  PREVIEW_DIMENSIONS,
  resolveExportPreviewMVPMatrix,
  type UseExportPreviewAnimationParams,
} from './export-preview-constants';
import { useAnimationFrameLoop } from './use-animation-frame-loop';
import { useExportPreviewTextures } from './use-export-preview-textures';

export {
  ASPECT_CONTAINER_CLASSES,
  CINEMATIC_MASK_FILL,
  hasActivePitchTransform,
  PREVIEW_DIMENSIONS,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
  type UseExportPreviewAnimationParams,
} from './export-preview-constants';
export { useAnimationFrameLoop } from './use-animation-frame-loop';

export function useExportPreviewAnimation({
  slides,
  aspectRatio,
  canvasAspectRatio,
  boundaryBox,
  pitchTransform,
  directorCamera,
  directorCameraOptions,
  photos,
  playerPhotos,
  pitchAppearance,
  screenBackground,
  teamVisibility,
  externalIsPlaying,
  onToggleExternalPlay,
  canvasRef,
  timeLabelRef,
  sliderRef,
}: UseExportPreviewAnimationParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const effectiveIsPlaying = externalIsPlaying ?? isPlaying;
  const totalDurationMs = resolvePlaybackDurationMs(slides) || 1000;
  const currentTimeMsRef = useRef<number>(0);

  const seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo);
  const workspaceMode =
    useTacticalUnifiedStoreContext((s) => s.workspaceMode) ?? 'normal';
  const storeTeamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
  const effectiveTeamVisibility =
    teamVisibility ?? storeTeamVisibility ?? 'both';
  const lastSeekNoticeTimeRef = useRef<number>(-9999);
  const isInternalSeekRef = useRef<boolean>(false);
  const stateRef = useRef({ workspaceMode, effectiveIsPlaying, seekTo });
  stateRef.current = { workspaceMode, effectiveIsPlaying, seekTo };

  const { effectivePlayerPhotos, marbleTexture } = useExportPreviewTextures({
    slides,
    photos,
    playerPhotos,
    pitchAppearance,
  });

  const effectiveCanvasAspect = canvasAspectRatio ?? '16:9';
  const basePreviewDim =
    PREVIEW_DIMENSIONS[effectiveCanvasAspect] ?? PREVIEW_DIMENSIONS['16:9'];

  const phase = useMemo(
    () =>
      slides.length > 0
        ? normalizePhases({
            slides,
            aspectRatio,
            boundaryBox,
            directorCamera,
          })[0]
        : undefined,
    [slides, aspectRatio, boundaryBox, directorCamera],
  );

  const cropInfo = useMemo(() => {
    const box = boundaryBox?.enabled !== false ? boundaryBox : null;
    const { width: w, height: h } = basePreviewDim;
    const pitchRect = w > 0 ? { x: 0, y: 0, width: w, height: h } : undefined;
    return calculateBoundaryCrop(box, w, h, 1, pitchRect);
  }, [boundaryBox, basePreviewDim]);

  const shouldCropPreview = cropInfo.isCropped;
  const previewWidth = shouldCropPreview
    ? cropInfo.exportWidth
    : basePreviewDim.width;
  const previewHeight = shouldCropPreview
    ? cropInfo.exportHeight
    : basePreviewDim.height;
  const previewAspectStyle = shouldCropPreview
    ? `${previewWidth} / ${previewHeight}`
    : undefined;
  const effectiveDirectorCameraOptions = directorCameraOptions ?? {
    isEditing: !effectiveIsPlaying,
  };

  const mvpMatrix = useMemo(
    () =>
      resolveExportPreviewMVPMatrix({
        effectiveIsPlaying,
        slidesCount: slides.length,
        pitchTransform,
        directorCamera,
        width: basePreviewDim.width,
        height: basePreviewDim.height,
        aspectRatio,
      }),
    [
      effectiveIsPlaying,
      slides.length,
      directorCamera,
      pitchTransform,
      basePreviewDim.width,
      basePreviewDim.height,
      aspectRatio,
    ],
  );

  // ── Canvas Frame Drawing ──
  const drawFrame = useCallback(
    (timeMs: number, effectTimeMs?: number) => {
      currentTimeMsRef.current = timeMs;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const effectiveBoundaryBox =
        shouldCropPreview && boundaryBox?.enabled !== false
          ? boundaryBox
          : null;

      renderTacticalFrameToCanvas(ctx, {
        slides,
        phase,
        timeMs,
        width: canvas.width,
        height: canvas.height,
        baseWidth: basePreviewDim.width,
        baseHeight: basePreviewDim.height,
        aspectRatio,
        boundaryBox: effectiveBoundaryBox,
        transparent: false,
        mvpMatrix,
        playerPhotos: effectivePlayerPhotos,
        pitchAppearance,
        marbleTexture,
        screenBackground,
        directorCamera,
        directorCameraOptions: effectiveDirectorCameraOptions,
        teamVisibility: effectiveTeamVisibility,
        ...(effectTimeMs !== undefined ? { effectTimeMs } : {}),
      });

      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = `${(timeMs / 1000).toFixed(1)}s`;
      }
      if (sliderRef.current) {
        sliderRef.current.value = String(Math.round(timeMs));
      }

      if (
        stateRef.current.effectiveIsPlaying &&
        stateRef.current.workspaceMode === 'director'
      ) {
        if (Math.abs(timeMs - lastSeekNoticeTimeRef.current) >= 60) {
          lastSeekNoticeTimeRef.current = timeMs;
          isInternalSeekRef.current = true;
          stateRef.current.seekTo?.(timeMs);
        }
      }
    },
    [
      slides,
      phase,
      basePreviewDim,
      shouldCropPreview,
      boundaryBox,
      aspectRatio,
      mvpMatrix,
      effectivePlayerPhotos,
      pitchAppearance,
      marbleTexture,
      screenBackground,
      directorCamera,
      effectiveDirectorCameraOptions,
      effectiveTeamVisibility,
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
    directorCamera,
    slides,
    pitchAppearance,
    screenBackground,
    boundaryBox,
    effectiveTeamVisibility,
  ]);

  // 静止中（!effectiveIsPlaying）の常時エフェクトループ（RAII クリーンアップ必須）
  useEffect(() => {
    if (effectiveIsPlaying || !hasActiveFrameEffects(slides)) return;
    let rafId = 0;
    let startTime: number | null = null;
    const IDLE_CYCLE_MS = 3000;
    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = (now - startTime) % IDLE_CYCLE_MS;
      drawFrame(currentTimeMsRef.current, elapsed);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [effectiveIsPlaying, slides, drawFrame]);

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
      if (isInternalSeekRef.current) {
        isInternalSeekRef.current = false;
        return;
      }
      if (playbackSeekTimeMs !== null) seek(playbackSeekTimeMs);
    }
  }, [playbackSeekId, playbackSeekTimeMs, seek]);

  const prevPlayingRef = useRef(effectiveIsPlaying);
  useEffect(() => {
    if (
      prevPlayingRef.current &&
      !effectiveIsPlaying &&
      stateRef.current.workspaceMode === 'director'
    ) {
      isInternalSeekRef.current = true;
      stateRef.current.seekTo?.(currentTimeMsRef.current);
    }
    prevPlayingRef.current = effectiveIsPlaying;
  }, [effectiveIsPlaying]);

  const togglePlay = useCallback(
    () =>
      onToggleExternalPlay
        ? onToggleExternalPlay()
        : setIsPlaying((prev) => !prev),
    [onToggleExternalPlay],
  );
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
