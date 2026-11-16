'use client';

import { Trash2 } from 'lucide-react';
import type React from 'react';
import type { ActionCameraCue } from '@/lib/types/tactical/camera-config';

const DURATION_PRESETS = [
  { label: '0.5s', ms: 500 },
  { label: '1.0s', ms: 1000 },
  { label: '2.0s', ms: 2000 },
  { label: '3.0s', ms: 3000 },
] as const;

export function findActiveActionCue(
  cues: ActionCameraCue[],
  currentTimeMs: number,
): ActionCameraCue | null {
  let activeCue: ActionCameraCue | null = null;
  let minDiff = Infinity;
  for (const cue of cues) {
    const duration = cue.durationMs ?? 1000;
    const cueEnd =
      cue.startTimeMs +
      duration +
      (cue.autoReturn ? (cue.holdMs ?? 0) + (cue.returnDurationMs ?? 800) : 0);
    if (
      currentTimeMs >= cue.startTimeMs - 150 &&
      currentTimeMs <= cueEnd + 150
    ) {
      const diff = Math.abs(cue.startTimeMs - currentTimeMs);
      if (diff < minDiff) {
        minDiff = diff;
        activeCue = cue;
      }
    }
  }
  return activeCue;
}

export interface DirectorCueInspectorProps {
  cue: ActionCameraCue;
  onUpdateDuration: (cue: ActionCameraCue, durationMs: number) => void;
  onToggleAutoReturn: (cue: ActionCameraCue) => void;
  onDeleteCue: (cueId: string) => void;
}

export function DirectorCueInspector({
  cue,
  onUpdateDuration,
  onToggleAutoReturn,
  onDeleteCue,
}: DirectorCueInspectorProps): React.ReactElement {
  return (
    <div
      data-testid="director-cue-inspector"
      className="flex flex-col gap-2.5 p-3 rounded-lg bg-black/30 border border-[#FF8100]/40"
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF8100]" />
          <span className="text-[11px] font-semibold text-[#FFA336]">
            Action Cue Inspector
          </span>
        </div>
        <button
          type="button"
          data-testid="delete-action-cue-btn"
          onClick={() => onDeleteCue(cue.id)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-[10px] cursor-pointer"
          title="アクション削除"
        >
          <Trash2 className="w-3 h-3" />
          <span>削除</span>
        </button>
      </div>

      {/* Duration Control (Direct Input + Chips) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-white/60">演出秒数:</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              data-testid="action-duration-input"
              step="0.1"
              min="0.2"
              max="10.0"
              value={((cue.durationMs ?? 1000) / 1000).toFixed(1)}
              onChange={(e) => {
                const val = Number.parseFloat(e.target.value);
                if (!Number.isNaN(val) && val > 0)
                  onUpdateDuration(cue, Math.round(val * 1000));
              }}
              className="w-16 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60"
            />
            <span className="text-white/40 text-[10px]">秒</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {DURATION_PRESETS.map(({ label, ms }) => {
            const isChipActive = (cue.durationMs ?? 1000) === ms;
            return (
              <button
                key={ms}
                type="button"
                data-testid={`action-duration-chip-${ms}`}
                onClick={() => onUpdateDuration(cue, ms)}
                className={`py-1 rounded text-[10px] font-mono border text-center transition-colors cursor-pointer ${
                  isChipActive
                    ? 'bg-[#FF8100] text-black border-[#FF8100] font-semibold shadow-sm'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto Return Toggle */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-white/70">
          自動で戻る (Auto Return)
        </span>
        <button
          type="button"
          data-testid="action-auto-return-toggle"
          onClick={() => onToggleAutoReturn(cue)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
            cue.autoReturn
              ? 'bg-[#FF8100]/25 text-[#FFA336] border-[#FF8100]/60'
              : 'bg-white/5 text-white/40 border-white/10 hover:text-white/60'
          }`}
        >
          {cue.autoReturn ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
