'use client';

import {
  Copy,
  Download,
  LayoutDashboard,
  Redo2,
  Share2,
  Star,
  Undo2,
} from 'lucide-react';
import type React from 'react';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import type { CapturedScreenshot } from '../../capture/db/screenshot-db';
import { RatioPresetSelector } from './RatioPresetSelector';
import { VideoMetaInfo } from './VideoMetaInfo';

export interface QuickCanvasTopBarProps {
  screenshot: CapturedScreenshot | null;
  canvasRef?: React.RefObject<CanvasCoreHandle | null>;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onCopyClipboard?: () => void;
  onDownload?: () => void;
  onShareX?: () => void;
  onOpenDashboard?: () => void;
  currentRatio?: AspectRatio | 'full' | null;
  onSelectRatio?: (ratio: AspectRatio | 'full') => void;
}

export function QuickCanvasTopBar({
  screenshot,
  canvasRef,
  canUndo = true,
  canRedo = false,
  onUndo,
  onRedo,
  isFavorite = false,
  onToggleFavorite,
  onCopyClipboard,
  onDownload,
  onShareX,
  onOpenDashboard,
  currentRatio,
  onSelectRatio,
}: QuickCanvasTopBarProps): React.ReactElement {
  const handleUndo = () => (onUndo ? onUndo() : canvasRef?.current?.undo());
  const handleRedo = () => (onRedo ? onRedo() : canvasRef?.current?.redo());

  const handleCopy = async () => {
    if (onCopyClipboard) {
      onCopyClipboard();
    } else {
      await canvasRef?.current?.copyToClipboard({ crop: true });
    }
  };

  const handleDownloadClick = async () => {
    if (onDownload) {
      onDownload();
    } else if (canvasRef?.current) {
      const dataUrl = await canvasRef.current.exportPng({
        crop: true,
        scale: 2,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${screenshot?.videoTitle || 'tactics'}-${Date.now()}.png`;
      a.click();
    }
  };

  const handleRatioSelect = (ratio: AspectRatio | 'full') => {
    if (onSelectRatio) {
      onSelectRatio(ratio);
    } else if (canvasRef?.current && 'applyRatio' in canvasRef.current) {
      (
        canvasRef.current as CanvasCoreHandle & {
          applyRatio: (r: string) => void;
        }
      ).applyRatio(ratio);
    }
  };

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-[#111] border-b border-white/10 shrink-0 z-50 select-none text-white">
      {/* ── Left: Video Info & Undo/Redo ── */}
      <div className="flex items-center gap-2 min-w-0">
        <VideoMetaInfo screenshot={screenshot} />
        <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="元に戻す (Ctrl+Z)"
            aria-label="元に戻す"
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            title="やり直す (Ctrl+Y)"
            aria-label="やり直す"
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Center: Aspect Ratio & Boundary Box Selector ── */}
      <RatioPresetSelector
        currentRatio={currentRatio}
        onSelectRatio={handleRatioSelect}
      />

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleFavorite}
          title={isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
          aria-label="お気に入りトグル"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            isFavorite
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Star
            className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          title="画像をクリップボードにコピー"
          aria-label="画像コピー"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
        >
          <Copy size={13} />
          <span>コピー</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadClick}
          title="画像をダウンロード"
          aria-label="画像保存"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
        >
          <Download size={13} />
          <span>保存</span>
        </button>
        <button
          type="button"
          onClick={onShareX}
          title="Xで画像を共有"
          aria-label="X共有"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
        >
          <Share2 size={13} />
          <span>X共有</span>
        </button>
        <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />
        <button
          type="button"
          onClick={onOpenDashboard}
          title="動画別ダッシュボードへ戻る"
          aria-label="ダッシュボード一覧"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
        >
          <LayoutDashboard size={13} />
          <span>一覧</span>
        </button>
      </div>
    </header>
  );
}
