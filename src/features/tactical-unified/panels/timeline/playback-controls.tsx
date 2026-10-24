'use client';

/**
 * playback-controls.tsx
 * Timeline Playback Controls — Play/Pause, Total Duration, Scene Progress
 */

import { Pause, Play } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export function PlaybackControls() {
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const isPlaying = useTacticalUnifiedStore((s) => s.isPlaying);
  const togglePlayback = useTacticalUnifiedStore((s) => s.togglePlayback);

  const activeIndex = slides.findIndex((sl) => sl.id === activeSlideId);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  // 計算: 合計再生時間 (Duration + Pause の総和)
  const totalDurationSec = slides.reduce((acc, sl) => {
    const dur = (sl.transitionDurationMs ?? 1000) / 1000;
    const pause = (sl.pauseMs ?? 500) / 1000;
    return acc + dur + pause;
  }, 0);

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Play / Pause Toggle Button */}
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          togglePlayback();
        }}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer focus:outline-none',
          isPlaying
            ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold ring-2 ring-amber-400/30'
            : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25',
        ].join(' ')}
        title={isPlaying ? 'Pause playback (Space)' : 'Play animation (Space)'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <>
            <Pause size={13} fill="currentColor" />
            <span>Pause</span>
          </>
        ) : (
          <>
            <Play size={13} fill="currentColor" />
            <span>Play</span>
          </>
        )}
      </button>

      {/* Playback Stats */}
      <div className="flex flex-col justify-center px-2 py-0.5 border-l border-white/10 min-w-[72px]">
        <div className="text-[11px] font-mono font-medium text-white/90 leading-tight">
          {currentIndex + 1} / {slides.length}{' '}
          <span className="text-[9px] text-white/40 uppercase">Scene</span>
        </div>
        <div className="text-[10px] font-mono text-white/50 leading-tight">
          Total {totalDurationSec.toFixed(1)}s
        </div>
      </div>
    </div>
  );
}
