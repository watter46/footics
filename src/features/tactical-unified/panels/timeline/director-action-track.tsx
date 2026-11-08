'use client';

import { RotateCcw, Trash2 } from 'lucide-react';
import type { ActionCameraCue } from '@/lib/types/tactical-unified';

const ACTION_DURATIONS = [
  { ms: 500, label: '0.5s' },
  { ms: 1000, label: '1.0s' },
  { ms: 2000, label: '2.0s' },
  { ms: 3000, label: '3.0s' },
] as const;

export interface DirectorActionTrackProps {
  actionCues: ActionCameraCue[];
  selectedCueId: string | null;
  totalDurationMs: number;
  currentTimeMs: number;
  onSelectCue: (id: string, startTimeMs: number) => void;
  onUpdateDuration: (cue: ActionCameraCue, durationMs: number) => void;
  onToggleAutoReturn: (cue: ActionCameraCue) => void;
  onDeleteCue: (id: string) => void;
}

export function DirectorActionTrack({
  actionCues,
  selectedCueId,
  totalDurationMs,
  currentTimeMs,
  onSelectCue,
  onUpdateDuration,
  onToggleAutoReturn,
  onDeleteCue,
}: DirectorActionTrackProps) {
  const selectedCue = actionCues.find((c) => c.id === selectedCueId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-[#FF8100]/80 shrink-0 w-12 text-right">
        アクション
      </span>
      <div
        data-testid="action-camera-track"
        className="relative flex-1 h-6 bg-[#0D0D0E] rounded border border-white/[0.07] overflow-hidden flex items-center"
      >
        {/* 現在再生ヘッドインジケータ */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none z-0"
          style={{ left: `${(currentTimeMs / totalDurationMs) * 100}%` }}
        />

        {actionCues.map((cue) => {
          const leftPct = Math.min(
            100,
            Math.max(0, (cue.startTimeMs / totalDurationMs) * 100),
          );
          const widthPct = Math.min(
            100 - leftPct,
            Math.max(4, (cue.durationMs / totalDurationMs) * 100),
          );
          const isSelected = cue.id === selectedCueId;
          return (
            <button
              key={cue.id}
              type="button"
              data-testid={`action-cue-block-${cue.id}`}
              onClick={() => onSelectCue(cue.id, cue.startTimeMs)}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              className={`absolute h-4.5 rounded px-1 flex items-center justify-between text-[9px] font-mono truncate cursor-pointer transition-colors border ${
                isSelected
                  ? 'bg-[#FF8100]/40 border-[#FF8100] text-white z-20 shadow-sm'
                  : 'bg-[#FF8100]/20 border-[#FF8100]/40 text-white/90 hover:bg-[#FF8100]/30 z-10'
              }`}
              title={`アクションCue: ${(cue.startTimeMs / 1000).toFixed(1)}s (${(cue.durationMs / 1000).toFixed(1)}s), Zoom ${cue.zoom.toFixed(1)}x${cue.autoReturn ? ' (復帰)' : ''}`}
            >
              <span className="truncate">{cue.zoom.toFixed(1)}x</span>
              {cue.autoReturn && (
                <span className="text-[8px] text-amber-300 ml-0.5">↩</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 選択中のアクションCue編集コントロール */}
      {selectedCue && (
        <div className="flex items-center gap-1.5 shrink-0 bg-[#18181B] px-2 py-0.5 rounded border border-white/[0.1] text-[10px]">
          {/* 秒数チップ */}
          <div className="flex items-center gap-0.5">
            {ACTION_DURATIONS.map(({ ms, label }) => {
              const isActive = selectedCue.durationMs === ms;
              return (
                <button
                  key={ms}
                  type="button"
                  data-testid={`action-duration-chip-${ms}`}
                  onClick={() => onUpdateDuration(selectedCue, ms)}
                  className={`px-1 py-0.5 rounded font-mono text-[9px] transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#FF8100] text-white font-medium'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#A1A1AA]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* autoReturn トグル */}
          <button
            type="button"
            data-testid="action-auto-return-toggle"
            onClick={() => onToggleAutoReturn(selectedCue)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-colors cursor-pointer border ${
              selectedCue.autoReturn
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/[0.06] border-white/[0.08] text-[#71717A] hover:text-[#A1A1AA]'
            }`}
            title="アクション終了後に通常カメラへ自動復帰するかどうか"
          >
            <RotateCcw size={10} />
            <span>自動で戻る</span>
          </button>

          {/* 削除ボタン */}
          <button
            type="button"
            data-testid="delete-action-cue-btn"
            onClick={() => onDeleteCue(selectedCue.id)}
            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
            title="選択中のアクションCueを削除"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
