'use client';

import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  DEFAULT_PITCH_APPEARANCE,
  type PitchAppearanceConfig,
} from '@/lib/types/tactical-unified';

const OVERLAY_COLOR_PRESETS = [
  '#0B303E',
  '#0A192F',
  '#162521',
  '#25161E',
  '#1A1A24',
];

const LINE_COLOR_PRESETS = ['#ffffff', '#E2B48D', '#60A5FA', '#FBBF24'];

export interface PitchAppearancePanelProps {
  pitchAppearance?: PitchAppearanceConfig;
  onUpdatePitchAppearance?: (patch: Partial<PitchAppearanceConfig>) => void;
}

export function PitchAppearancePanel({
  pitchAppearance = DEFAULT_PITCH_APPEARANCE,
  onUpdatePitchAppearance,
}: PitchAppearancePanelProps) {
  const handleUpdate = (patch: Partial<PitchAppearanceConfig>) => {
    onUpdatePitchAppearance?.(patch);
  };

  const handleReset = () => {
    onUpdatePitchAppearance?.(DEFAULT_PITCH_APPEARANCE);
  };

  return (
    <div className="flex flex-col h-full bg-[#121214] text-white text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] shrink-0 bg-[#18181B]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-[#60A5FA]" />
          <span className="font-semibold text-white/90">Pitch Appearance</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
          title="Reset to default pitch appearance"
        >
          <RotateCcw size={10} />
          <span>Reset</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar p-3 space-y-4">
        {/* Background Type */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-white/70">
            Background Surface
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-black/40 rounded border border-white/[0.08]">
            <button
              type="button"
              onClick={() => handleUpdate({ pitchBackgroundType: 'solid' })}
              className={`py-1.5 px-2 rounded text-center text-[11px] font-medium transition-colors cursor-pointer ${
                pitchAppearance.pitchBackgroundType === 'solid'
                  ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 shadow-[0_0_10px_rgba(255,129,0,0.3)]'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
            >
              Solid Black
            </button>
            <button
              type="button"
              onClick={() => handleUpdate({ pitchBackgroundType: 'marble' })}
              className={`py-1.5 px-2 rounded text-center text-[11px] font-medium transition-colors cursor-pointer ${
                pitchAppearance.pitchBackgroundType === 'marble'
                  ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 shadow-[0_0_10px_rgba(255,129,0,0.3)]'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
            >
              Marble Texture
            </button>
          </div>
        </div>

        {/* Marble Overlay Controls */}
        {pitchAppearance.pitchBackgroundType === 'marble' && (
          <div className="pt-3 space-y-3">
            <div className="text-[11px] font-semibold text-white/70">
              Marble Overlay Settings
            </div>

            {/* Overlay Color */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-white/50">
                <span>Overlay Color</span>
                <span className="font-mono text-white/70">
                  {pitchAppearance.overlayColor}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={pitchAppearance.overlayColor}
                  onChange={(e) =>
                    handleUpdate({ overlayColor: e.target.value })
                  }
                  className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer shrink-0"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {OVERLAY_COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleUpdate({ overlayColor: color })}
                      style={{ backgroundColor: color }}
                      className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                        pitchAppearance.overlayColor === color
                          ? 'border-[#FFA336] scale-110 shadow-[0_0_6px_rgba(255,163,54,0.6)]'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Overlay Opacity Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-white/50">
                <span>Overlay Opacity</span>
                <span className="font-mono text-white/70">
                  {Math.round(pitchAppearance.overlayOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={pitchAppearance.overlayOpacity}
                onChange={(e) =>
                  handleUpdate({
                    overlayOpacity: Number.parseFloat(e.target.value),
                  })
                }
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFA336]"
              />
            </div>
          </div>
        )}

        {/* Pitch Lines Controls */}
        <div className="pt-3 space-y-3">
          <div className="text-[11px] font-semibold text-white/70">
            Pitch Markings
          </div>

          {/* Line Color */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>Line Color</span>
              <span className="font-mono text-white/70">
                {pitchAppearance.lineColor}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={pitchAppearance.lineColor}
                onChange={(e) => handleUpdate({ lineColor: e.target.value })}
                className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer shrink-0"
              />
              <div className="flex items-center gap-1">
                {LINE_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleUpdate({ lineColor: color })}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      pitchAppearance.lineColor === color
                        ? 'border-[#FFA336] scale-110 shadow-[0_0_6px_rgba(255,163,54,0.6)]'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Line Width Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>Line Width</span>
              <span className="font-mono text-white/70">
                {pitchAppearance.lineWidth.toFixed(1)}px
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="0.5"
              value={pitchAppearance.lineWidth}
              onChange={(e) =>
                handleUpdate({ lineWidth: Number.parseFloat(e.target.value) })
              }
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFA336]"
            />
          </div>

          {/* Line Opacity Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>Line Opacity</span>
              <span className="font-mono text-white/70">
                {Math.round(pitchAppearance.lineOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pitchAppearance.lineOpacity}
              onChange={(e) =>
                handleUpdate({
                  lineOpacity: Number.parseFloat(e.target.value),
                })
              }
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFA336]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
