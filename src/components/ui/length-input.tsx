'use client';

import { useCallback, useState } from 'react';

interface LengthValue {
  presets?: string[];
  min?: string;
  max?: string;
}

interface LengthInputProps {
  value: LengthValue;
  onChange: (value: LengthValue) => void;
}

const PRESETS = [
  { id: 'short', label: 'Short', description: '<15m' },
  { id: 'middle', label: 'Middle', description: '15-32m' },
  { id: 'long', label: 'Long', description: '>32m' },
] as const;

export function LengthInput({ value, onChange }: LengthInputProps) {
  const [showDetail, setShowDetail] = useState(false);

  const handlePresetToggle = useCallback(
    (presetId: string) => {
      const current = value.presets || [];
      const next = current.includes(presetId)
        ? current.filter((p) => p !== presetId)
        : [...current, presetId];
      onChange({ ...value, presets: next, min: undefined, max: undefined });
    },
    [value, onChange],
  );

  const handleMinChange = useCallback(
    (newMin: string) => {
      onChange({ ...value, min: newMin, presets: [] });
    },
    [value, onChange],
  );

  const handleMaxChange = useCallback(
    (newMax: string) => {
      onChange({ ...value, max: newMax, presets: [] });
    },
    [value, onChange],
  );

  const activePresets = value.presets || [];

  return (
    <div className="space-y-2">
      {/* クイック選択ボタン（複数選択可能） */}
      <div className="flex gap-1.5">
        {PRESETS.map((preset) => {
          const isActive = activePresets.includes(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetToggle(preset.id)}
              className={`
                flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium
                transition-all duration-200 border
                ${
                  isActive
                    ? 'bg-fuchsia-600/30 border-fuchsia-500/60 text-fuchsia-300 shadow-[0_0_8px_rgba(192,38,211,0.2)]'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                }
              `}
            >
              <div className="font-semibold">{preset.label}</div>
              <div
                className={`text-[9px] ${isActive ? 'text-fuchsia-400/80' : 'text-slate-500'}`}
              >
                {preset.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* 選択数表示 */}
      {activePresets.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-fuchsia-400">
            {activePresets.length} range{activePresets.length !== 1 ? 's' : ''}{' '}
            selected
          </span>
          <button
            type="button"
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => onChange({ ...value, presets: [] })}
          >
            Clear
          </button>
        </div>
      )}

      {/* アコーディオン展開ボタン */}
      <button
        type="button"
        onClick={() => setShowDetail(!showDetail)}
        className={`
          w-full flex items-center justify-center gap-1 py-1 rounded
          text-[10px] transition-all duration-200
          ${
            showDetail
              ? 'text-fuchsia-400 bg-fuchsia-950/30'
              : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/50'
          }
        `}
      >
        <span
          className={`inline-block transition-transform duration-200 ${
            showDetail ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
        <span>詳細設定</span>
      </button>

      {/* 詳細入力フィールド */}
      {showDetail && (
        <div className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-200">
          <div className="flex-1">
            <label className="text-[9px] text-slate-500 block mb-0.5">
              Min (m)
            </label>
            <input
              type="number"
              value={value.min ?? ''}
              onChange={(e) => handleMinChange(e.target.value)}
              placeholder="0"
              min={0}
              className="
                w-full h-7 px-2 rounded-md text-xs
                bg-slate-900 border border-slate-700 text-slate-200
                placeholder:text-slate-600
                focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50
                transition-all
              "
            />
          </div>
          <span className="text-slate-600 text-xs mt-3">–</span>
          <div className="flex-1">
            <label className="text-[9px] text-slate-500 block mb-0.5">
              Max (m)
            </label>
            <input
              type="number"
              value={value.max ?? ''}
              onChange={(e) => handleMaxChange(e.target.value)}
              placeholder="∞"
              min={0}
              className="
                w-full h-7 px-2 rounded-md text-xs
                bg-slate-900 border border-slate-700 text-slate-200
                placeholder:text-slate-600
                focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50
                transition-all
              "
            />
          </div>
        </div>
      )}
    </div>
  );
}
