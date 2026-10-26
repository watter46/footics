'use client';

import { LayoutDashboard } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type CanvasCoreHandle,
  CanvasToast,
} from '@/features/tactical-unified/core';
import {
  type CapturedScreenshot,
  getScreenshotById,
} from '~/features/capture/db/screenshot-db';
import { useQuickCanvasActions } from '../hooks/use-quick-canvas-actions';
import { useQuickCanvasShortcuts } from '../hooks/use-quick-canvas-shortcuts';
import { QuickAnnotationCanvas } from './QuickAnnotationCanvas';
import { QuickCanvasTopBar } from './QuickCanvasTopBar';

export interface QuickTacticalCanvasProps {
  screenshotId?: string;
}

export function QuickTacticalCanvas({
  screenshotId,
}: QuickTacticalCanvasProps = {}): React.ReactElement {
  const canvasRef = useRef<CanvasCoreHandle | null>(null);
  const [screenshot, setScreenshot] = useState<CapturedScreenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id =
      screenshotId ?? new URLSearchParams(window.location.search).get('id');
    if (!id) {
      setError('スクリーンショットIDが指定されていません');
      setLoading(false);
      return;
    }
    getScreenshotById(id)
      .then((data) => {
        if (!data) {
          setError('スクリーンショットが見つかりませんでした');
        } else {
          setScreenshot(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(
          `データ取得エラー: ${err instanceof Error ? err.message : String(err)}`,
        );
        setLoading(false);
      });
  }, [screenshotId]);

  useQuickCanvasShortcuts(canvasRef);

  const {
    isFavorite,
    toastMessage,
    handleAutoSave,
    handleToggleFavorite,
    handleCopyClipboard,
    handleDownload,
    handleShareX,
    handleOpenDashboard,
  } = useQuickCanvasActions({ screenshot, canvasRef });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3" />
        <span>キャンバスを読み込み中...</span>
      </div>
    );
  }

  if (error || !screenshot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-300 p-6">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl max-w-md text-center">
          <p className="font-semibold text-lg mb-2">エラー</p>
          <p className="text-sm">
            {error ?? 'スクリーンショットが見つかりませんでした'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenDashboard}
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm flex items-center gap-2 cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          ダッシュボードへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      <QuickCanvasTopBar
        screenshot={screenshot}
        canvasRef={canvasRef}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onCopyClipboard={handleCopyClipboard}
        onDownload={handleDownload}
        onShareX={handleShareX}
        onOpenDashboard={handleOpenDashboard}
      />
      <main className="relative flex-1 w-full h-[calc(100vh-2.75rem)] overflow-hidden">
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={screenshot}
          onAutoSave={handleAutoSave}
        />
      </main>
      <CanvasToast message={toastMessage} />
    </div>
  );
}
