'use client';

import { useCallback, useState } from 'react';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/engine/director-camera';
import { DirectorActionTrack } from './director-action-track';
import { DirectorGlobalTrack } from './director-global-track';

export function DirectorCameraTimeline() {
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const timeMs = usePlaybackStore((s) => s.timeMs);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const slides = activePhase?.slides ?? [];

  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);

  const totalDurationMs = Math.max(1000, calculateUnifiedTotalDuration(slides));
  const currentTimeMs = Math.min(totalDurationMs, Math.max(0, Number(timeMs)));
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

  const handleUpdateCueDuration = useCallback(
    (cue: (typeof actionCues)[number], durationMs: number) => {
      dispatch({
        type: 'UPSERT_ACTION_CAMERA_CUE',
        phaseId: activePhaseId,
        startTimeMs: cue.startTimeMs,
        patch: { durationMs },
        cueId: cue.id,
      });
    },
    [dispatch, activePhaseId],
  );

  const handleDeleteKeyframe = useCallback(
    (keyframeId: string) => {
      dispatch({
        type: 'DELETE_GLOBAL_CAMERA_KEYFRAME',
        phaseId: activePhaseId,
        keyframeId,
      });
    },
    [dispatch, activePhaseId],
  );

  const handleDeleteCue = useCallback(
    (cueId: string) => {
      dispatch({
        type: 'DELETE_ACTION_CAMERA_CUE',
        phaseId: activePhaseId,
        cueId,
      });
    },
    [dispatch, activePhaseId],
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
        onDeleteKeyframe={handleDeleteKeyframe}
      />

      {/* 下段: ② アクションカメラトラック */}
      <DirectorActionTrack
        actionCues={actionCues}
        selectedCueId={selectedCueId}
        totalDurationMs={totalDurationMs}
        currentTimeMs={currentTimeMs}
        onSelectCue={handleSelectCue}
        onUpdateDuration={handleUpdateCueDuration}
        onDeleteCue={handleDeleteCue}
        onSeek={seekTo}
      />
    </div>
  );
}
