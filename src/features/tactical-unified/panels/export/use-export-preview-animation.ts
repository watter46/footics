'use client';

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useStore } from 'zustand';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { hasActiveFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';

const fallbackSessionStore = createSessionStore();
const fallbackPlaybackStore = createPlaybackStore();

import {
  PREVIEW_DIMENSIONS,
  resolveExportPreviewCropInfo,
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

  const stores = useContext(TacticalStoresContext);
  const sessionStore = stores?.sessionStore ?? fallbackSessionStore;
  const playbackStore = stores?.playbackStore ?? fallbackPlaybackStore;

  const seekTo = useStore(playbackStore, (s) =>
    stores ? s.seekTo : undefined,
  );
  const workspaceMode = useStore(sessionStore, (s) => s.workspaceMode);
  const storeTeamVisibility = useStore(sessionStore, (s) => s.teamVisibility);
  const playbackTimeMs = useStore(playbackStore, (s) => Number(s.timeMs));
  const effectiveTeamVisibility =
    teamVisibility ?? storeTeamVisibility ?? 'both';
  const lastSeekNoticeTimeRef = useRef<number>(-9999);
  const lastDispatchedSeekMsRef = useRef<number | null>(null);
  const lastStoreTimeMsRef = useRef<number>(playbackTimeMs);
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

  const { shouldCropPreview, previewWidth, previewHeight, previewAspectStyle } =
    useMemo(
      () => resolveExportPreviewCropInfo(boundaryBox, basePreviewDim),
      [boundaryBox, basePreviewDim],
    );
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
          lastDispatchedSeekMsRef.current = Math.max(0, timeMs);
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

  useEffect(() => {
    if (!stores) return;
    if (playbackTimeMs === lastStoreTimeMsRef.current) return;
    lastStoreTimeMsRef.current = playbackTimeMs;
    if (
      lastDispatchedSeekMsRef.current !== null &&
      Math.abs(playbackTimeMs - lastDispatchedSeekMsRef.current) < 1e-6
    ) {
      lastDispatchedSeekMsRef.current = null;
      return;
    }
    seek(playbackTimeMs);
  }, [stores, playbackTimeMs, seek]);

  const prevPlayingRef = useRef(effectiveIsPlaying);
  useEffect(() => {
    if (
      prevPlayingRef.current &&
      !effectiveIsPlaying &&
      stateRef.current.workspaceMode === 'director'
    ) {
      lastDispatchedSeekMsRef.current = Math.max(0, currentTimeMsRef.current);
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
