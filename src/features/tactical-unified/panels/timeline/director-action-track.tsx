'use client';

import type { ActionCameraCue } from '@/lib/types/tactical-unified';

export function layoutActionCuesIntoLanes(
  cues: ActionCameraCue[],
): ActionCameraCue[][] {
  const sorted = [...cues].sort((a, b) => a.startTimeMs - b.startTimeMs);
  const lanes: ActionCameraCue[][] = [];

  for (const cue of sorted) {
    let placed = false;
    const cueEnd = cue.startTimeMs + (cue.durationMs ?? 1000);
    for (let i = 0; i < lanes.length; i++) {
      const lastCue = lanes[i][lanes[i].length - 1];
      const lastEnd = lastCue.startTimeMs + (lastCue.durationMs ?? 1000);
      if (cue.startTimeMs >= lastEnd) {
        lanes[i].push(cue);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([cue]);
    }
  }
  return lanes;
}

export interface DirectorActionTrackProps {
  actionCues: ActionCameraCue[];
  selectedCueId: string | null;
  totalDurationMs: number;
  currentTimeMs: number;
  onSelectCue: (id: string, startTimeMs: number) => void;
  onUpdateDuration?: (cue: ActionCameraCue, durationMs: number) => void;
  onToggleAutoReturn?: (cue: ActionCameraCue) => void;
  onDeleteCue?: (id: string) => void;
}

export function DirectorActionTrack({
  actionCues,
  selectedCueId,
  totalDurationMs,
  currentTimeMs,
  onSelectCue,
}: DirectorActionTrackProps) {
  const lanes = layoutActionCuesIntoLanes(actionCues);
  const displayedLanes = lanes.length > 0 ? lanes : [[]];

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-[#FF8100]/80 shrink-0 w-14 text-right">
        アクション
      </span>
      <div
        data-testid="action-camera-track"
        style={
          displayedLanes.length > 1
            ? { height: `calc(1.5rem * ${displayedLanes.length})` }
            : undefined
        }
        className={`relative flex-1 ${
          displayedLanes.length > 1 ? '' : 'h-6'
        } bg-[#0D0D0E] rounded border border-white/[0.07] overflow-hidden flex flex-col justify-center`}
      >
        {/* 現在再生ヘッドインジケータ */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none z-0"
          style={{ left: `${(currentTimeMs / totalDurationMs) * 100}%` }}
        />

        {displayedLanes.map((lane, laneIdx) => (
          <div
            key={laneIdx}
            data-testid={`action-sublane-${laneIdx}`}
            data-lane-index={laneIdx}
            className="relative w-full h-5 flex items-center"
          >
            {lane.map((cue) => {
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
                  data-lane-index={laneIdx}
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
        ))}
      </div>
    </div>
  );
}
