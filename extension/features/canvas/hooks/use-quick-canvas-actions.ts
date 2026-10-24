import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  type CanvasCoreHandle,
  useCanvasToast,
} from '@/features/tactical-unified/core';
import {
  type CapturedScreenshot,
  toggleFavorite,
  updateScreenshot,
} from '../../capture/db/screenshot-db';

export interface UseQuickCanvasActionsOptions {
  screenshot: CapturedScreenshot | null;
  canvasRef: React.RefObject<CanvasCoreHandle | null>;
}

export interface UseQuickCanvasActionsReturn {
  isFavorite: boolean;
  toastMessage: string | null;
  handleAutoSave: (json: string) => Promise<void>;
  handleToggleFavorite: () => Promise<void>;
  handleCopyClipboard: () => Promise<void>;
  handleDownload: () => Promise<void>;
  handleShareX: () => Promise<void>;
  handleOpenDashboard: () => void;
}

export function useQuickCanvasActions({
  screenshot,
  canvasRef,
}: UseQuickCanvasActionsOptions): UseQuickCanvasActionsReturn {
  const [isFavorite, setIsFavorite] = useState(screenshot?.isFavorite ?? false);
  const { toastMessage, showToast } = useCanvasToast();

  useEffect(() => {
    if (screenshot) {
      setIsFavorite(screenshot.isFavorite ?? false);
    }
  }, [screenshot?.isFavorite]);

  const handleAutoSave = useCallback(
    async (json: string) => {
      if (!screenshot?.id) return;
      try {
        await updateScreenshot(screenshot.id, { canvasAnnotations: json });
      } catch (err) {
        console.warn('[QuickTacticalCanvas] Auto-save failed:', err);
      }
    },
    [screenshot?.id],
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!screenshot) return;
    try {
      const nextFav = await toggleFavorite(screenshot.id);
      setIsFavorite(nextFav);
      showToast(
        nextFav ? '⭐ お気に入りに追加しました' : 'お気に入りを解除しました',
      );
    } catch (err) {
      console.warn('Favorite toggle error:', err);
    }
  }, [screenshot, showToast]);

  const handleCopyClipboard = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      await canvasRef.current.copyToClipboard({ crop: true });
      showToast('📋 画像をクリップボードにコピーしました！');
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  }, [canvasRef, showToast]);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await canvasRef.current.exportPng({
        crop: true,
        scale: 2,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${screenshot?.videoTitle || 'tactics'}-${Date.now()}.png`;
      a.click();
      showToast('💾 画像を保存しました');
    } catch (err) {
      console.warn('Download failed:', err);
    }
  }, [canvasRef, screenshot?.videoTitle, showToast]);

  const handleShareX = useCallback(async () => {
    await handleCopyClipboard();
    const title = screenshot?.videoTitle || 'Footics Tactics Note';
    const text = encodeURIComponent(
      `⚽ 戦術分析メモ [${title}] #Footics #Tactics`,
    );
    const xUrl = `https://twitter.com/intent/tweet?text=${text}`;
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: xUrl, active: true });
    } else {
      window.open(xUrl, '_blank');
    }
    showToast(
      '🚀 Xを開きました！クリップボードの画像を Ctrl+V で貼り付けてください',
    );
  }, [handleCopyClipboard, screenshot?.videoTitle, showToast]);

  const handleOpenDashboard = useCallback(() => {
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime?.getURL &&
      chrome.tabs?.create
    ) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('/dashboard.html'),
        active: true,
      });
    } else {
      window.location.href = 'dashboard.html';
    }
  }, []);

  return {
    isFavorite,
    toastMessage,
    handleAutoSave,
    handleToggleFavorite,
    handleCopyClipboard,
    handleDownload,
    handleShareX,
    handleOpenDashboard,
  };
}
