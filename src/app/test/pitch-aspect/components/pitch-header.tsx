'use client';

import { Compass, Copy, Layers } from 'lucide-react';

interface PitchHeaderProps {
  onCopyPng: () => void;
  isExporting: boolean;
  copied: boolean;
  tilt: number;
}

export function PitchHeader({
  onCopyPng,
  isExporting,
  copied,
  tilt,
}: PitchHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            X 最適化エクスポート基準
          </span>
          <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 text-white">
            <Compass className="size-6 text-cyan-400" />
            境界線基準ピッチ検証 & PNGエクスポート
          </h1>
        </div>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          境界線を基準（16:9 / 9:16 / 4:5 /
          1:1）として画面いっぱいに表示し、上下左右5%余白・厳密真円でPNGコピー検証
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCopyPng}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
        >
          <Copy className="size-3.5" />
          <span>{copied ? 'コピー完了！' : 'PNGをコピー'}</span>
        </button>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
          <Layers className="size-3.5 text-cyan-400" />
          <span>2.5Dチルト: {tilt}°</span>
        </div>
      </div>
    </header>
  );
}
