'use client';

import {
  type PointerEvent,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useExportPreviewAnimation } from '@/features/tactical-unified/panels/export/export-preview-player';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import { PreviewBoundaryOverlay } from './preview-boundary-overlay';

export function TacticalSplitPreviewPanel() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const projectAspectRatio = useTacticalUnifiedStoreContext(
    (s) => s.project.aspectRatio ?? '4:5',
  );
  const aspectRatio = activeSlide?.aspectRatio ?? projectAspectRatio;
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance,
  );
  const screenBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.screenBackground,
  );
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const togglePlayback = useTacticalUnifiedStoreContext(
    (s) => s.togglePlayback,
  );
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );
  const updateActiveSlideBoundaryBox = useTacticalUnifiedStoreContext(
    (s) => s.updateActiveSlideBoundaryBox,
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // 境界線の状態とクロッププレビュー切り替え
  const boundaryBox = activeSlide?.boundaryBox;
  const isBoundaryActive = Boolean(boundaryBox?.enabled);
  const [isCroppedPreview, setIsCroppedPreview] = useState(false);

  const showCropped = (isPlaying || isCroppedPreview) && isBoundaryActive;

  const allPhasePlayers = useMemo(
    () => slides.flatMap((s) => s.players ?? []),
    [slides],
  );
  const playerPhotoMap = usePlayerPhotoRegistry(allPhasePlayers);

  const playerPhotos = useMemo(() => {
    const record: Record<string, CanvasImageSource> = {};
    for (const [key, img] of playerPhotoMap.entries()) {
      record[key] = img;
    }
    for (const p of allPhasePlayers) {
      const key = getPlayerPhotoKey(p);
      const img = playerPhotoMap.get(key);
      if (img) {
        record[p.id] = img;
        if (p.playerId) {
          record[String(p.playerId)] = img;
        }
      }
    }
    return record;
  }, [allPhasePlayers, playerPhotoMap]);

  const { previewWidth, previewHeight, previewAspectStyle } =
    useExportPreviewAnimation({
      slides,
      aspectRatio,
      canvasAspectRatio: '16:9',
      boundaryBox: showCropped ? (boundaryBox ?? null) : null,
      pitchTransform: isPlaying ? null : (activeSlide?.pitchTransform ?? null),
      playerPhotos,
      pitchAppearance,
      screenBackground,
      externalIsPlaying: isPlaying,
      onToggleExternalPlay: togglePlayback,
      canvasRef,
      timeLabelRef,
      sliderRef,
    });

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // JSDOM fallback
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !activeSlide) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey) {
      // Shift + 左ドラッグ: パン
      const currentPanX = activeSlide.pitchTransform?.panX ?? 0;
      const currentPanY = activeSlide.pitchTransform?.panY ?? 0;
      updatePitchTransform(activeSlide.id, {
        panX: currentPanX + dx,
        panY: currentPanY + dy,
      });
    } else {
      // 左ドラッグ（Shiftなし）: オービット（Tilt & Yaw）
      const currentTilt = activeSlide.pitchTransform?.tilt ?? 0;
      const currentYaw = activeSlide.pitchTransform?.yaw ?? 90;

      const nextTilt = Math.max(
        0,
        Math.min(70, Math.round(currentTilt - dy * 0.25)),
      );
      const rawYaw = currentYaw + dx * 0.4;
      const nextYaw = Math.round((((rawYaw % 360) + 360) % 360) * 10) / 10;

      updatePitchTransform(activeSlide.id, {
        tilt: nextTilt,
        yaw: nextYaw,
      });
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // JSDOM fallback
    }
  };

  const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    if (!activeSlide) return;
    e.preventDefault();
    const currentZoom = activeSlide.pitchTransform?.zoom ?? 1;
    const nextZoom = Math.max(
      0.5,
      Math.min(2.5, +(currentZoom - e.deltaY * 0.0015).toFixed(2)),
    );
    updatePitchTransform(activeSlide.id, { zoom: nextZoom });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0D0D0E] text-white select-none overflow-hidden">
      {/* Center Layout Preview Canvas */}
      <div className="flex-1 min-h-0 p-4 flex items-center justify-center bg-[#070709] overflow-hidden w-full h-full">
        <div
          ref={containerRef}
          data-testid="preview-container"
          style={
            showCropped && previewAspectStyle
              ? { aspectRatio: previewAspectStyle }
              : undefined
          }
          className={`relative ${
            showCropped
              ? 'max-w-full max-h-full w-auto h-auto'
              : 'aspect-video w-full max-h-full'
          } rounded-lg overflow-hidden border border-white/10 bg-[#020617] flex items-center justify-center shadow-lg`}
        >
          <canvas
            ref={canvasRef}
            width={previewWidth}
            height={previewHeight}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing touch-none"
          />

          {/* 切り替えボタン (境界線有効時のみ表示) */}
          {isBoundaryActive && !isPlaying && (
            <button
              type="button"
              aria-label={
                showCropped
                  ? '編集モードに切り替え'
                  : '切り抜きプレビューに切り替え'
              }
              data-testid="toggle-crop-preview-btn"
              onClick={() => setIsCroppedPreview((prev) => !prev)}
              className="absolute top-3 right-3 z-30 px-2.5 py-1 text-xs font-medium rounded bg-black/75 hover:bg-black/90 text-white/90 border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-1.5 shadow"
            >
              <span>{showCropped ? '編集モード' : '切り抜きプレビュー'}</span>
            </button>
          )}

          {/* 編集モード時: 外側半透明暗転マスク & 境界線枠操作オーバーレイ */}
          {isBoundaryActive && !showCropped && boundaryBox && (
            <PreviewBoundaryOverlay
              boundaryBox={boundaryBox}
              containerRef={containerRef}
              onCommit={updateActiveSlideBoundaryBox}
            />
          )}
        </div>
      </div>
    </div>
  );
}
