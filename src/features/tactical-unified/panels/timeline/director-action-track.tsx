'use client';

import { Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ActionCameraCue } from '@/lib/types/tactical/project';

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
  onSeek?: (timeMs: number) => void;
}

export function DirectorActionTrack({
  actionCues,
  selectedCueId,
  totalDurationMs,
  currentTimeMs,
  onSelectCue,
  onUpdateDuration,
  onDeleteCue,
  onSeek,
}: DirectorActionTrackProps) {
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // アンマウント時の RAII クリーンアップ
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const handleResizeStart = (cue: ActionCameraCue, e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialDurationMs = cue.durationMs ?? 1000;
    const trackEl = trackRef.current;
    const trackWidth = trackEl?.getBoundingClientRect().width || 1000;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaMs = (deltaX / Math.max(1, trackWidth)) * totalDurationMs;
      const newDurationMs = Math.max(
        200,
        Math.round((initialDurationMs + deltaMs) / 50) * 50,
      );
      onUpdateDuration?.(cue, newDurationMs);
      onSeek?.(cue.startTimeMs + newDurationMs);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cleanupRef.current = null;
    };

    if (cleanupRef.current) {
      cleanupRef.current();
    }
    cleanupRef.current = onPointerUp;

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const lanes = layoutActionCuesIntoLanes(actionCues);
  const displayedLanes = lanes.length > 0 ? lanes : [[]];

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-[#FF8100]/80 shrink-0 w-14 text-right">
        アクション
      </span>
      <div
        ref={trackRef}
        data-testid="action-camera-track"
        style={
          displayedLanes.length > 1
            ? { height: `calc(1.5rem * ${displayedLanes.length})` }
            : undefined
        }
        className={`relative flex-1 ${
          displayedLanes.length > 1 ? '' : 'h-6'
        } bg-[#0D0D0E] rounded border border-white/[0.07] flex flex-col justify-center`}
      >
        {/* ポップオーバー表示中の外側クリック検知用バックドロップ */}
        {activePopoverId && (
          <div
            className="fixed inset-0 z-30 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setActivePopoverId(null);
            }}
          />
        )}

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
              const isPopoverOpen = activePopoverId === cue.id;

              return (
                <div
                  key={cue.id}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute h-4.5 rounded px-1 flex items-center justify-between text-[9px] font-mono cursor-pointer transition-colors border ${
                    isPopoverOpen
                      ? 'bg-[#FF8100]/40 border-[#FF8100] text-white z-40 shadow-sm'
                      : isSelected
                        ? 'bg-[#FF8100]/40 border-[#FF8100] text-white z-20 shadow-sm'
                        : 'bg-[#FF8100]/20 border-[#FF8100]/40 text-white/90 hover:bg-[#FF8100]/30 z-10'
                  }`}
                  data-testid={`action-cue-block-${cue.id}`}
                  data-lane-index={laneIdx}
                  onClick={() => {
                    onSelectCue(cue.id, cue.startTimeMs);
                    setActivePopoverId((prev) =>
                      prev === cue.id ? null : cue.id,
                    );
                  }}
                  title={`アクションCue: ${(cue.startTimeMs / 1000).toFixed(1)}s (${(cue.durationMs / 1000).toFixed(1)}s), Zoom ${cue.zoom.toFixed(1)}x${cue.autoReturn ? ' (復帰)' : ''}`}
                >
                  <span className="truncate">{cue.zoom.toFixed(1)}x</span>
                  {cue.autoReturn && (
                    <span className="text-[8px] text-amber-300 ml-0.5">↩</span>
                  )}

                  {/* 右端リサイズドラッグハンドル */}
                  <div
                    data-testid={`action-cue-resize-handle-${cue.id}`}
                    onPointerDown={(e) => handleResizeStart(cue, e)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/40 transition-colors z-20"
                    title="ドラッグで秒数リサイズ"
                  />

                  {/* 削除ポップオーバー */}
                  {isPopoverOpen && (
                    <div
                      data-testid={`action-cue-popover-${cue.id}`}
                      className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-40 bg-[#18181B] border border-white/20 rounded px-2 py-1 shadow-lg flex items-center gap-2 whitespace-nowrap text-[10px] text-white"
                    >
                      <span className="font-mono text-white/70">
                        {((cue.durationMs ?? 1000) / 1000).toFixed(1)}s
                      </span>
                      <span className="text-white/50">|</span>
                      <span className="text-white/90">
                        Zoom {cue.zoom.toFixed(1)}x
                      </span>
                      <button
                        type="button"
                        data-testid={`delete-action-cue-popover-btn-${cue.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCue?.(cue.id);
                          setActivePopoverId(null);
                        }}
                        className="ml-1 p-0.5 rounded text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Cueを削除"
                        aria-label="Cueを削除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
