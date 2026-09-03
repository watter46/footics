'use client';

import {
  Check,
  Copy,
  Download,
  Loader2,
  Maximize2,
  Move,
  RotateCcw,
  Sliders,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BOUNDARY_CONFIGS, type BoundaryAspectRatio } from '../pitch-constants';

interface PitchControlsProps {
  boundaryAspect: BoundaryAspectRatio;
  onSelectBoundaryAspect: (aspect: BoundaryAspectRatio) => void;
  marginPercent: number;
  onUpdateMargin: (margin: number) => void;
  onCopyPng: () => void;
  onDownloadPng: () => void;
  isExporting: boolean;
  copied: boolean;
  zoom: number;
  onUpdateZoom: (zoom: number) => void;
  tilt: number;
  onUpdateTilt: (tilt: number) => void;
  onResetView: () => void;
  showCircleRuler: boolean;
  onToggleCircleRuler: () => void;
  showSamplePlayers: boolean;
  onToggleSamplePlayers: () => void;
}

const BOUNDARY_TABS: BoundaryAspectRatio[] = ['16:9', '9:16', '4:5', '1:1'];

export function PitchControls({
  boundaryAspect,
  onSelectBoundaryAspect,
  marginPercent,
  onUpdateMargin,
  onCopyPng,
  onDownloadPng,
  isExporting,
  copied,
  zoom,
  onUpdateZoom,
  tilt,
  onUpdateTilt,
  onResetView,
  showCircleRuler,
  onToggleCircleRuler,
  showSamplePlayers,
  onToggleSamplePlayers,
}: PitchControlsProps) {
  const currentConfig = BOUNDARY_CONFIGS[boundaryAspect];

  return (
    <div className="flex flex-col gap-5 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
      {/* ─── 1. 境界線アスペクト比選択 (X最適化メディア基準) ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Maximize2 className="size-3.5 text-cyan-400" />
            境界線アスペクト比 (基準フレーム)
          </span>
          <span className="text-[11px] text-cyan-400 font-mono font-medium">
            {currentConfig.subLabel}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
          {BOUNDARY_TABS.map((ratio) => {
            const active = boundaryAspect === ratio;
            return (
              <button
                type="button"
                key={ratio}
                onClick={() => onSelectBoundaryAspect(ratio)}
                className={`py-2 px-1 text-xs font-medium rounded-lg transition-all duration-150 flex flex-col items-center gap-0.5 ${
                  active
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{ratio}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  {BOUNDARY_CONFIGS[ratio].orientation === 'horizontal'
                    ? '横'
                    : '縦'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. ピッチ余白スライダー (上下左右均等余白) ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="size-3.5 text-blue-400" />
            ピッチと境界線の余白 (上下左右)
          </span>
          <span className="text-xs font-mono font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50">
            {marginPercent.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 font-mono">0%</span>
          <input
            type="range"
            min="0"
            max="15"
            step="0.5"
            value={marginPercent}
            onChange={(e) => onUpdateMargin(Number(e.target.value))}
            className="flex-1 accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 font-mono">15%</span>
          <button
            type="button"
            onClick={() => onUpdateMargin(5.0)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title="標準5%に戻す"
          >
            5%
          </button>
        </div>
      </div>

      {/* ─── 3. PNGコピー & 保存 (Xエクスポート検証) ─── */}
      <div className="space-y-2 pt-1 border-t border-slate-800">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Copy className="size-3.5 text-emerald-400" />
          境界線基準 PNG エクスポート
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCopyPng}
            disabled={isExporting}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-[0.98]'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span>{copied ? 'コピー完了！' : 'PNGをコピー'}</span>
          </button>

          <button
            type="button"
            onClick={onDownloadPng}
            disabled={isExporting}
            className="py-2.5 px-3 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="size-4 text-cyan-400" />
            <span>PNG保存</span>
          </button>
        </div>
      </div>

      {/* ─── 4. 奥側チルト角度スライダー (0°〜35°) ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Move className="size-3.5 text-purple-400" />
            奥側チルト角度 (2.5D立体遠近感)
          </span>
          <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
            {tilt}°
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 font-mono">0°</span>
          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={tilt}
            onChange={(e) => onUpdateTilt(Number(e.target.value))}
            className="flex-1 accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] text-slate-500 font-mono">35°</span>
        </div>
      </div>

      {/* ─── 5. ズーム & リセット ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ZoomIn className="size-3.5 text-amber-400" />
            ズーム操作
          </span>
          <button
            type="button"
            onClick={onResetView}
            className="text-[11px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="size-3" />
            リセット
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateZoom(zoom - 0.2)}
            className="size-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700"
            title="縮小"
          >
            <ZoomOut className="size-4" />
          </button>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.05"
            value={zoom}
            onChange={(e) => onUpdateZoom(Number(e.target.value))}
            className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <button
            type="button"
            onClick={() => onUpdateZoom(zoom + 0.2)}
            className="size-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700"
            title="拡大"
          >
            <ZoomIn className="size-4" />
          </button>
          <span className="text-xs font-mono w-14 text-right text-amber-300">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* ─── 6. 検証トグル ─── */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
          <input
            type="checkbox"
            checked={showCircleRuler}
            onChange={onToggleCircleRuler}
            className="accent-blue-500 rounded"
          />
          <span>真円検証ルーラー (Ø18.3m)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
          <input
            type="checkbox"
            checked={showSamplePlayers}
            onChange={onToggleSamplePlayers}
            className="accent-cyan-500 rounded"
          />
          <span>フォーメーション配置</span>
        </label>
      </div>
    </div>
  );
}
