import type React from 'react';
import { useCallback, useEffect } from 'react';
import {
  useDocumentStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';

function handleImageFile(
  file: File,
  setImageBackground: (url: string) => void,
) {
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string;
    if (dataUrl) {
      setImageBackground(dataUrl);
    }
  };
  reader.readAsDataURL(file);
}

function handleBenchDrop(
  rawJson: string,
  e: React.DragEvent,
  activeSlideId: string,
  movePlayerToPitch: (
    slideId: string,
    playerId: string,
    x: number,
    y: number,
  ) => void,
) {
  try {
    const data = JSON.parse(rawJson);
    if (data.type !== 'bench-player' || !data.playerId) return;

    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const nx = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
    );
    const ny = Math.max(
      0,
      Math.min(100, ((e.clientY - rect.top) / rect.height) * 100),
    );
    movePlayerToPitch(activeSlideId, data.playerId, nx, ny);
  } catch {}
}

export function useTacticalDropPaste() {
  const { documentStore } = useTacticalStoresContext();
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);

  const setImageBackground = useCallback(
    (url: string) => {
      const targetPhaseId =
        activePhaseId || documentStore.getState().project.phases[0]?.id || '';
      const targetSlideId =
        activeSlideId ||
        documentStore.getState().project.phases[0]?.slides[0]?.id ||
        '';
      if (!targetPhaseId || !targetSlideId) return;

      const newSlideId = crypto.randomUUID();
      documentStore.getState().dispatch({
        type: 'APPLY_IMAGE_BACKGROUND',
        phaseId: targetPhaseId,
        slideId: targetSlideId,
        url,
        newSlideId,
      });
      const updatedPhase = documentStore
        .getState()
        .project.phases.find((p) => p.id === targetPhaseId);
      if (updatedPhase?.slides.some((s) => s.id === newSlideId)) {
        setActiveSlideId(newSlideId);
      }
    },
    [activePhaseId, activeSlideId, documentStore, setActiveSlideId],
  );

  const movePlayerToPitch = useCallback(
    (slideId: string, playerId: string, x: number, y: number) => {
      const targetPhaseId =
        activePhaseId || documentStore.getState().project.phases[0]?.id || '';
      if (!targetPhaseId || !slideId) return;
      dispatchSlide(targetPhaseId, slideId, {
        type: 'MOVE_PLAYER_TO_PITCH',
        id: playerId,
        x: clampToScreenNorm(x),
        y: clampToScreenNorm(y),
      });
    },
    [activePhaseId, dispatchSlide, documentStore],
  );

  // 📋 クリップボード画像貼り付け (Ctrl+V / Paste)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file, setImageBackground);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setImageBackground]);

  // 📂 ファイルドラッグ＆ドロップ対応 & サブ選手ピッチ投入対応
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleImageFile(files[0], setImageBackground);
        return;
      }

      const rawJson = e.dataTransfer.getData('application/json');
      if (rawJson) {
        handleBenchDrop(rawJson, e, activeSlideId, movePlayerToPitch);
      }
    },
    [setImageBackground, movePlayerToPitch, activeSlideId],
  );

  return { handleDragOver, handleDrop };
}
