'use client';

/**
 * playback-controls.tsx
 * Timeline Playback Controls — Play/Pause, Total Duration, Scene Progress
 */

import { Pause, Play } from 'lucide-react';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';

export function PlaybackControls() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const togglePlayback = useTacticalUnifiedStoreContext(
    (s) => s.togglePlayback,
  );

  const activeIndex = slides.findIndex((sl) => sl.id === activeSlideId);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  // 計算: 合計再生時間 (単一の真実源 calculateUnifiedTotalDuration を参照)
  const totalDurationSec = calculateUnifiedTotalDuration(slides) / 1000;

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
          'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer focus:outline-none select-none active:scale-95',
          isPlaying
            ? 'bg-[#FF8100] hover:bg-[#FFA040] text-white shadow-[0_0_14px_rgba(255,129,0,0.4)] ring-1 ring-white/20'
            : 'bg-[#60A5FA] hover:bg-[#93C5FD] text-black font-black ring-2 ring-[#60A5FA]/40 shadow-[0_0_14px_rgba(96,165,250,0.4)]',
        ].join(' ')}
        title={isPlaying ? 'Pause playback (Space)' : 'Play animation (Space)'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <>
            <Pause size={13} fill="currentColor" strokeWidth={1.5} />
            <span>Pause</span>
          </>
        ) : (
          <>
            <Play size={13} fill="currentColor" strokeWidth={1.5} />
            <span>Play</span>
          </>
        )}
      </button>

      {/* Playback Stats */}
      <div className="flex flex-col justify-center px-2 py-0.5 border-l border-white/[0.07] min-w-[72px]">
        <div className="text-[11px] font-mono font-medium text-white/90 leading-tight">
          {currentIndex + 1} / {slides.length}{' '}
          <span className="text-[9px] text-[#71717A] uppercase font-sans">
            Scene
          </span>
        </div>
        <div className="text-[10px] font-mono text-[#A1A1AA] leading-tight">
          Total {totalDurationSec.toFixed(1)}s
        </div>
      </div>
    </div>
  );
}
