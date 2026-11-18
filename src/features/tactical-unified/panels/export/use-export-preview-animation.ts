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
import {
  hasActiveDirectorCameraTrack,
  resolvePlaybackDurationMs,
} from '@/lib/tactical/engine/director-camera';
import { hasActiveFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import { renderTacticalPhaseFrameToCanvas } from '@/lib/tactical/export/tactical-phase-frame-renderer';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

const fallbackSessionStore = createSessionStore();
const fallbackPlaybackStore = createPlaybackStore();

import {
  PREVIEW_DIMENSIONS,
  resolveExportPreviewCropInfo,
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

  const stores = useContext(TacticalStoresContext);
  const sessionStore = stores?.sessionStore ?? fallbackSessionStore;
  const playbackStore = stores?.playbackStore ?? fallbackPlaybackStore;
  const initialPlaybackTimeMs = stores
    ? Number(playbackStore.getState().timeMs)
    : 0;
  const currentTimeMsRef = useRef<number>(initialPlaybackTimeMs);

  const seekTo = useStore(playbackStore, (s) =>
    stores ? s.seekTo : undefined,
  );
  const workspaceMode = useStore(sessionStore, (s) => s.workspaceMode);
  const storeTeamVisibility = useStore(sessionStore, (s) => s.teamVisibility);
  const effectiveTeamVisibility =
    teamVisibility ?? storeTeamVisibility ?? 'both';
  const lastSeekNoticeTimeRef = useRef<number>(-9999);
  const lastDispatchedSeekMsRef = useRef<number | null>(null);
  const lastStoreTimeMsRef = useRef<number>(initialPlaybackTimeMs);
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
  const isEditingCamera =
    directorCameraOptions?.isEditing ?? !effectiveIsPlaying;
  const selectedCueId = directorCameraOptions?.selectedCueId;
  const effectiveDirectorCameraOptions = useMemo(
    () => ({
      isEditing: isEditingCamera,
      ...(selectedCueId !== undefined ? { selectedCueId } : {}),
    }),
    [isEditingCamera, selectedCueId],
  );

  // ── Canvas Frame Drawing ──
  const drawFrame = useCallback(
    (timeMs: number, effectTimeMs?: number) => {
      currentTimeMsRef.current = timeMs;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx || !phase) return;

      renderTacticalPhaseFrameToCanvas({
        ctx,
        phase,
        timeMs,
        width: canvas.width,
        height: canvas.height,
        baseWidth: basePreviewDim.width,
        baseHeight: basePreviewDim.height,
        aspectRatio,
        boundaryBox:
          shouldCropPreview && boundaryBox?.enabled !== false
            ? boundaryBox
            : null,
        transparent: false,
        pitchTransform:
          effectiveIsPlaying && hasActiveDirectorCameraTrack(directorCamera)
            ? undefined
            : pitchTransform,
        pitchTransformOverride: !effectiveIsPlaying
          ? pitchTransform
          : undefined,
        playerPhotos: effectivePlayerPhotos,
        pitchAppearance,
        marbleTexture,
        screenBackground,
        directorCamera,
        directorCameraOptions: effectiveDirectorCameraOptions,
        teamVisibility: effectiveTeamVisibility,
        ...(effectTimeMs !== undefined ? { effectTimeMs } : {}),
      });

      if (timeLabelRef.current)
        timeLabelRef.current.textContent = `${(timeMs / 1000).toFixed(1)}s`;
      if (sliderRef.current)
        sliderRef.current.value = String(Math.round(timeMs));

      if (
        stateRef.current.effectiveIsPlaying &&
        stateRef.current.workspaceMode === 'director' &&
        Math.abs(timeMs - lastSeekNoticeTimeRef.current) >= 60
      ) {
        lastSeekNoticeTimeRef.current = timeMs;
        lastDispatchedSeekMsRef.current = Math.max(0, timeMs);
        stateRef.current.seekTo?.(timeMs);
      }
    },
    [
      phase,
      basePreviewDim,
      shouldCropPreview,
      boundaryBox,
      aspectRatio,
      pitchTransform,
      effectiveIsPlaying,
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
  const hasRenderedInitialRef = useRef(false);
  useEffect(() => {
    if (!effectiveIsPlaying || !hasRenderedInitialRef.current) {
      hasRenderedInitialRef.current = true;
      drawFrame(currentTimeMsRef.current);
    }
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
    if (
      effectiveIsPlaying ||
      !hasActiveFrameEffects(slides as readonly DomainSlide[])
    )
      return;
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
    initialPlaybackTimeMs,
  );

  useEffect(() => {
    if (!stores) return;
    return playbackStore.subscribe((state, prev) => {
      if (state.timeMs === prev.timeMs) return;
      const nextMs = Number(state.timeMs);
      if (nextMs === lastStoreTimeMsRef.current) return;
      lastStoreTimeMsRef.current = nextMs;
      const dispatched = lastDispatchedSeekMsRef.current;
      if (dispatched !== null && Math.abs(nextMs - dispatched) < 1e-6) {
        lastDispatchedSeekMsRef.current = null;
        return;
      }
      seek(nextMs);
    });
  }, [stores, playbackStore, seek]);

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
