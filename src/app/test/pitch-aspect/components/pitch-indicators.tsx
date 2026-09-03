'use client';

import { Sparkles } from 'lucide-react';
import type { BoundaryConfig } from '../pitch-constants';

interface PitchIndicatorsProps {
  currentConfig: BoundaryConfig;
  marginPercent: number;
}

export function PitchIndicators({
  currentConfig,
  marginPercent,
}: PitchIndicatorsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
      <div>
        <span className="text-slate-500 block text-[10px] uppercase font-mono">
          境界線 (出力基準)
        </span>
        <span className="font-semibold text-cyan-400">
          {currentConfig.id} ({currentConfig.subLabel})
        </span>
      </div>
      <div>
        <span className="text-slate-500 block text-[10px] uppercase font-mono">
          上下左右 余白率
        </span>
        <span className="font-mono text-blue-300 font-bold">
          {marginPercent.toFixed(1)}% (均等四方余白)
        </span>
      </div>
      <div>
        <span className="text-slate-500 block text-[10px] uppercase font-mono">
          ピッチ実領域
        </span>
        <span className="font-mono text-cyan-300">
          {(100 - 2 * marginPercent).toFixed(1)}% ×{' '}
          {(100 - 2 * marginPercent).toFixed(1)}%
        </span>
      </div>
      <div>
        <span className="text-slate-500 block text-[10px] uppercase font-mono">
          センターサークル
        </span>
        <span className="font-semibold text-emerald-400 flex items-center gap-1">
          <Sparkles className="size-3" />
          厳密真円 (歪み0.0%)
        </span>
      </div>
    </div>
  );
}
