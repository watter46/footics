'use client';

import type { GlobalCameraKeyframe } from '@/lib/types/tactical-unified';

export interface DirectorGlobalTrackProps {
  globalKeyframes: GlobalCameraKeyframe[];
  selectedGlobalId: string | null;
  totalDurationMs: number;
  currentTimeMs: number;
  onSelectKeyframe: (id: string, timeMs: number) => void;
}

export function DirectorGlobalTrack({
  globalKeyframes,
  selectedGlobalId,
  totalDurationMs,
  currentTimeMs,
  onSelectKeyframe,
}: DirectorGlobalTrackProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-[#60A5FA]/80 shrink-0 w-14 text-right">
        全体
      </span>
      <div
        data-testid="global-camera-track"
        className="relative flex-1 h-5 bg-[#0D0D0E] rounded border border-white/[0.07] overflow-hidden flex items-center"
      >
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
          return (
            <button
              key={kf.id}
              type="button"
              data-testid={`global-kf-pin-${kf.id}`}
              onClick={() => onSelectKeyframe(kf.id, kf.timeMs)}
              style={{ left: `${leftPct}%` }}
              className={`absolute -translate-x-1/2 w-4 h-4 flex items-center justify-center cursor-pointer transition-transform ${
                isSelected
                  ? 'scale-125 z-20 text-[#60A5FA] font-bold drop-shadow-[0_0_4px_rgba(96,165,250,0.8)]'
                  : 'text-[#60A5FA]/70 hover:text-[#60A5FA] z-10'
              }`}
              title={`全体カメラ (${(kf.timeMs / 1000).toFixed(1)}s): Tilt ${Math.round(kf.tilt)}°, Yaw ${Math.round(kf.yaw)}°`}
            >
              ◆
            </button>
          );
        })}
      </div>
    </div>
  );
}
