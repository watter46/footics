import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

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
  const setImageBackground = useTacticalUnifiedStore(
    (s) => s.setImageBackground,
  );
  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);

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
