'use client';

import { useCallback, useState } from 'react';
import {
  selectActivePhase,
  selectActivePhaseSlides,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import { DirectorActionTrack } from './director-action-track';
import { DirectorGlobalTrack } from './director-global-track';

export function DirectorCameraTimeline() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo);

  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);

  const totalDurationMs = Math.max(1000, calculateUnifiedTotalDuration(slides));
  const currentTimeMs = Math.min(
    totalDurationMs,
    Math.max(0, playbackSeekTimeMs ?? 0),
  );
  const directorCamera = activePhase?.directorCamera;
  const globalKeyframes = directorCamera?.globalKeyframes ?? [];
  const actionCues = directorCamera?.actionCues ?? [];

  const handleSelectKeyframe = useCallback(
    (id: string, timeMs: number) => {
      setSelectedGlobalId(id);
      seekTo(timeMs);
    },
    [seekTo],
  );

  const handleSelectCue = useCallback(
    (id: string, startTimeMs: number) => {
      setSelectedCueId(id);
      seekTo(startTimeMs);
    },
    [seekTo],
  );

  return (
    <div
      data-testid="director-camera-timeline"
      className="flex flex-col gap-1.5 flex-1 min-w-0 py-1 select-none justify-center"
    >
      {/* 上段: シークバー */}
      <div className="flex items-center gap-2">
        <span
          data-testid="director-scrubber-time"
          className="text-[9px] font-mono text-[#A1A1AA] shrink-0 w-14 text-right"
        >
          {(currentTimeMs / 1000).toFixed(1)}s
        </span>

        <div className="relative flex-1 h-5 flex items-center">
          <input
            type="range"
            data-testid="director-scrubber-input"
            min={0}
            max={totalDurationMs}
            step={50}
            value={Math.round(currentTimeMs)}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF8100]"
          />
        </div>
      </div>

      {/* 中段: ① 全体カメラトラック */}
      <DirectorGlobalTrack
        globalKeyframes={globalKeyframes}
        selectedGlobalId={selectedGlobalId}
        totalDurationMs={totalDurationMs}
        currentTimeMs={currentTimeMs}
        onSelectKeyframe={handleSelectKeyframe}
      />

      {/* 下段: ② アクションカメラトラック */}
      <DirectorActionTrack
        actionCues={actionCues}
        selectedCueId={selectedCueId}
        totalDurationMs={totalDurationMs}
        currentTimeMs={currentTimeMs}
        onSelectCue={handleSelectCue}
      />
    </div>
  );
}
