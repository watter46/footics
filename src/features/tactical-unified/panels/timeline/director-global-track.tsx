'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { GlobalCameraKeyframe } from '@/lib/types/tactical/camera-config';

export interface DirectorGlobalTrackProps {
  globalKeyframes: GlobalCameraKeyframe[];
  selectedGlobalId: string | null;
  totalDurationMs: number;
  currentTimeMs: number;
  onSelectKeyframe: (id: string, timeMs: number) => void;
  onDeleteKeyframe?: (id: string) => void;
}

export function DirectorGlobalTrack({
  globalKeyframes,
  selectedGlobalId,
  totalDurationMs,
  currentTimeMs,
  onSelectKeyframe,
  onDeleteKeyframe,
}: DirectorGlobalTrackProps) {
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-[#60A5FA]/80 shrink-0 w-14 text-right">
        全体
      </span>
      <div
        data-testid="global-camera-track"
        className="relative flex-1 h-5 bg-[#0D0D0E] rounded border border-white/[0.07] flex items-center"
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

        {globalKeyframes.map((kf) => {
          const leftPct = Math.min(
            100,
            Math.max(0, (kf.timeMs / totalDurationMs) * 100),
          );
          const isSelected = kf.id === selectedGlobalId;
          const isPopoverOpen = activePopoverId === kf.id;

          return (
            <div
              key={kf.id}
              style={{ left: `${leftPct}%` }}
              className={`absolute -translate-x-1/2 flex items-center justify-center ${
                isPopoverOpen ? 'z-40' : isSelected ? 'z-20' : 'z-10'
              }`}
            >
              <button
                type="button"
                data-testid={`global-kf-pin-${kf.id}`}
                onClick={() => {
                  onSelectKeyframe(kf.id, kf.timeMs);
                  setActivePopoverId((prev) => (prev === kf.id ? null : kf.id));
                }}
                className={`w-4 h-4 flex items-center justify-center cursor-pointer transition-transform ${
                  isSelected
                    ? 'scale-125 z-20 text-[#60A5FA] font-bold drop-shadow-[0_0_4px_rgba(96,165,250,0.8)]'
                    : 'text-[#60A5FA]/70 hover:text-[#60A5FA] z-10'
                }`}
                title={`全体カメラ (${(kf.timeMs / 1000).toFixed(1)}s): Tilt ${Math.round(kf.tilt)}°, Yaw ${Math.round(kf.yaw)}°`}
              >
                ◆
              </button>

              {isPopoverOpen && (
                <div
                  data-testid={`global-pin-popover-${kf.id}`}
                  className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-40 bg-[#18181B] border border-white/20 rounded px-2 py-1 shadow-lg flex items-center gap-2 whitespace-nowrap text-[10px] text-white"
                >
                  <span className="font-mono text-white/70">
                    {(kf.timeMs / 1000).toFixed(1)}s
                  </span>
                  <span className="text-white/50">|</span>
                  <span className="text-white/90">
                    Tilt {Math.round(kf.tilt)}°, Yaw {Math.round(kf.yaw)}°
                  </span>
                  <button
                    type="button"
                    data-testid={`delete-global-pin-btn-${kf.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteKeyframe?.(kf.id);
                      setActivePopoverId(null);
                    }}
                    className="ml-1 p-0.5 rounded text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="ピンを削除"
                    aria-label="ピンを削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
