'use client';

import { Scaling } from 'lucide-react';
import type React from 'react';

interface MarkerSizeControlProps {
  value: number; // 0.6 〜 1.6
  onChange: (value: number) => void;
  title?: string;
}

const PRESET_SCALES = [
  { label: '小', value: 0.8 },
  { label: '標準', value: 1.0 },
  { label: '大', value: 1.2 },
  { label: '特大', value: 1.4 },
];

export const MarkerSizeControl: React.FC<MarkerSizeControlProps> = ({
  value,
  onChange,
  title = 'マーカーサイズ',
}) => {
  const currentScale = value || 1.0;
  const percentText = `${Math.round(currentScale * 100)}%`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Scaling className="w-3.5 h-3.5 text-slate-400" />
          <span>{title}</span>
        </div>
        <span className="font-mono text-xs font-semibold text-blue-400">
          {percentText}
        </span>
      </div>

      {/* クイックプリセットボタン */}
      <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
        {PRESET_SCALES.map((p) => {
          const isSelected = Math.abs(currentScale - p.value) < 0.05;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value)}
              className={`py-1 rounded text-center text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label} ({Math.round(p.value * 100)}%)
            </button>
          );
        })}
      </div>

      {/* スライダー */}
      <input
        type="range"
        min={0.6}
        max={1.6}
        step={0.05}
        value={currentScale}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
};
