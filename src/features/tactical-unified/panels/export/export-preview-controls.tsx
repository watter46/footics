'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import type React from 'react';

export interface ExportPreviewControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  sliderRef: React.RefObject<HTMLInputElement | null>;
  totalDurationMs: number;
}

export function ExportPreviewControls({
  isPlaying,
  onTogglePlay,
  onReset,
  onSeek,
  sliderRef,
  totalDurationMs,
}: ExportPreviewControlsProps) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        type="button"
        onClick={onTogglePlay}
        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
        aria-label="Reset preview"
      >
        <RotateCcw size={14} />
      </button>

      <input
        ref={sliderRef}
        type="range"
        min={0}
        max={totalDurationMs}
        step={10}
        defaultValue={0}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}
