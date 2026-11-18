'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/engine/director-camera';
import { DirectorActionTrack } from './director-action-track';
import { DirectorGlobalTrack } from './director-global-track';

export function DirectorCameraTimeline() {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activePhase = useDocumentStore((s) =>
    selectDomainActivePhase(s.project, activePhaseId),
  );
  const dispatch = useDocumentStore((s) => s.dispatch);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const { playbackStore } = useTacticalStoresContext();
  const slides = activePhase?.slides ?? [];

  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);

  const totalDurationMs = Math.max(1000, calculateUnifiedTotalDuration(slides));
  const initialTimeMs = Math.min(
    totalDurationMs,
    Math.max(0, Number(playbackStore.getState().timeMs)),
  );
  const directorCamera = activePhase?.directorCamera;
  const globalKeyframes = directorCamera?.globalKeyframes ?? [];
  const actionCues = directorCamera?.actionCues ?? [];

  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const globalPlayheadRef = useRef<HTMLDivElement>(null);
  const actionPlayheadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncDomToTime = (rawTimeMs: unknown) => {
      const clampedMs = Math.min(
        totalDurationMs,
        Math.max(0, Number(rawTimeMs)),
      );
      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = `${(clampedMs / 1000).toFixed(1)}s`;
      }
      if (sliderRef.current) {
        sliderRef.current.value = String(Math.round(clampedMs));
      }
      const pct = `${(clampedMs / totalDurationMs) * 100}%`;
      if (globalPlayheadRef.current) {
        globalPlayheadRef.current.style.left = pct;
      }
      if (actionPlayheadRef.current) {
        actionPlayheadRef.current.style.left = pct;
      }
    };

    syncDomToTime(playbackStore.getState().timeMs);

    return playbackStore.subscribe((state, prev) => {
      if (state.timeMs === prev.timeMs) return;
      syncDomToTime(state.timeMs);
    });
  }, [playbackStore, totalDurationMs]);

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
          ref={timeLabelRef}
          data-testid="director-scrubber-time"
          className="text-[9px] font-mono text-[#A1A1AA] shrink-0 w-14 text-right"
        >
          {(initialTimeMs / 1000).toFixed(1)}s
        </span>

        <div className="relative flex-1 h-5 flex items-center">
          <input
            ref={sliderRef}
            type="range"
            data-testid="director-scrubber-input"
            min={0}
            max={totalDurationMs}
            step={50}
            defaultValue={Math.round(initialTimeMs)}
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
        playheadRef={globalPlayheadRef}
        initialTimeMs={initialTimeMs}
        onSelectKeyframe={handleSelectKeyframe}
        onDeleteKeyframe={handleDeleteKeyframe}
      />

      {/* 下段: ② アクションカメラトラック */}
      <DirectorActionTrack
        actionCues={actionCues}
        selectedCueId={selectedCueId}
        totalDurationMs={totalDurationMs}
        playheadRef={actionPlayheadRef}
        initialTimeMs={initialTimeMs}
        onSelectCue={handleSelectCue}
        onUpdateDuration={handleUpdateCueDuration}
        onDeleteCue={handleDeleteCue}
        onSeek={seekTo}
      />
    </div>
  );
}
