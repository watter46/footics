'use client';

import {
  Clock,
  Copy,
  Download,
  Expand,
  ExternalLink,
  LayoutDashboard,
  LayoutTemplate,
  Redo2,
  Share2,
  Star,
  Undo2,
} from 'lucide-react';
import type React from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
import type { CapturedScreenshot } from '../../capture/db/screenshot-db';

export interface QuickCanvasTopBarProps {
  screenshot: CapturedScreenshot | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCopyClipboard: () => void;
  onDownload: () => void;
  onShareX: () => void;
  onOpenDashboard: () => void;
}

const RATIO_PRESETS: {
  ratio: AspectRatio;
  label: string;
  title: string;
}[] = [
  {
    ratio: '16:9',
    label: '16:9',
    title: '横長 (16:9) - YouTube / PC 標準',
  },
  {
    ratio: '9:16',
    label: '9:16',
    title: '縦長 (9:16) - スマホ全画面・Shorts / Reels',
  },
  {
    ratio: '4:5',
    label: '4:5',
    title: '縦長 (4:5) - X単体画像・タイムライン最大高さ',
  },
  {
    ratio: '1:1',
    label: '1:1',
    title: '正方形 (1:1) - スクエア・Instagram',
  },
];

function formatVideoTime(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const QuickCanvasTopBar: React.FC<QuickCanvasTopBarProps> = ({
  screenshot,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isFavorite,
  onToggleFavorite,
  onCopyClipboard,
  onDownload,
  onShareX,
  onOpenDashboard,
}) => {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const canvasAspect = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const setAspectRatio = useTacticalUnifiedStore((s) => s.setAspectRatio);
  const setBoundaryBox = useTacticalUnifiedStore((s) => s.setBoundaryBox);

  const box = activeSlide?.boundaryBox;

  // 現在の境界線比率の判定
  const matchedRatio = (() => {
    if (!box?.enabled || box.height === 0) return null;
    if (box.width >= 99 && box.height >= 99 && box.x <= 1 && box.y <= 1) {
      return 'full';
    }
    const stageAspect = ASPECT_RATIOS[canvasAspect] ?? 16 / 9;
    const currentAspect = (box.width / box.height) * stageAspect;

    for (const p of RATIO_PRESETS) {
      const target = ASPECT_RATIOS[p.ratio] ?? 1;
      if (Math.abs(currentAspect - target) < 0.05) {
        return p.ratio;
      }
    }
    return null;
  })();

  const handleApplyRatio = (targetRatio: AspectRatio) => {
    setAspectRatio(targetRatio);
    const newBox = createXBoundaryBox(targetRatio, canvasAspect);
    setBoundaryBox(activeSlideId, {
      ...newBox,
      enabled: true,
      visible: true,
    });
  };

  const handleApplyFull = () => {
    setBoundaryBox(activeSlideId, {
      ...DEFAULT_BOUNDARY_BOX_FULL,
      enabled: true,
      visible: true,
    });
  };

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-[#111] border-b border-white/10 shrink-0 z-50 select-none text-white">
      {/* ── Left: Video Info & Undo/Redo ── */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-xs font-semibold text-white/90 truncate max-w-[180px] md:max-w-xs"
            title={screenshot?.videoTitle || 'Footics Tactics Quick Canvas'}
          >
            {screenshot?.videoTitle || 'Footics Quick Canvas'}
          </span>
          {screenshot?.videoUrl && (
            <a
              href={screenshot.videoUrl}
              target="_blank"
              rel="noreferrer"
              title="元動画を開く"
              aria-label="元動画を開く"
              className="text-white/40 hover:text-white transition-colors shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {screenshot?.videoTime !== undefined && (
            <div className="flex items-center gap-1 text-[11px] text-white/40 font-mono shrink-0">
              <Clock className="w-3 h-3 text-white/30" />
              <span>{formatVideoTime(screenshot.videoTime)}</span>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="元に戻す (Ctrl+Z)"
            aria-label="元に戻す"
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="やり直す (Ctrl+Y)"
            aria-label="やり直す"
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Center: Aspect Ratio & Boundary Box Selector (Footics Style) ── */}
      <div
        className="flex items-center bg-white/5 rounded-md border border-white/10 p-0.5 text-xs font-mono"
        role="group"
        aria-label="境界線・アスペクト比選択"
      >
        <LayoutTemplate size={12} className="text-sky-400 mx-1.5 shrink-0" />
        {RATIO_PRESETS.map(({ ratio, label, title }) => {
          const isActive = matchedRatio === ratio;
          return (
            <button
              key={ratio}
              type="button"
              onClick={() => handleApplyRatio(ratio)}
              className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={title}
              aria-label={`境界線比率 ${label}`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleApplyFull}
          className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer flex items-center gap-1 ${
            matchedRatio === 'full'
              ? 'bg-sky-600 text-white font-semibold shadow-xs'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="全画面 (100% × 100%) - クロップなし"
          aria-label="全画面クロップなし"
        >
          <Expand size={11} />
          <span>全画面</span>
        </button>
      </div>

      {/* ── Right: Action Buttons (Favorite, Copy, Download, Share, Dashboard) ── */}
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
          onClick={onCopyClipboard}
          title="画像をクリップボードにコピー"
          aria-label="画像コピー"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
        >
          <Copy size={13} />
          <span>コピー</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
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
};
