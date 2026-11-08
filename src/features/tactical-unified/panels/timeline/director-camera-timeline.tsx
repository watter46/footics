'use client';

import { Camera, Trash2, Video } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
  selectActivePhase,
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  calculateUnifiedTotalDuration,
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
import type { ActionCameraCue } from '@/lib/types/tactical-unified';
import { DirectorActionTrack } from './director-action-track';
import { DirectorGlobalTrack } from './director-global-track';

export function DirectorCameraTimeline() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo);
  const upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext(
    (s) => s.upsertGlobalCameraKeyframe,
  );
  const deleteGlobalCameraKeyframe = useTacticalUnifiedStoreContext(
    (s) => s.deleteGlobalCameraKeyframe,
  );
  const upsertActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.upsertActionCameraCue,
  );
  const deleteActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.deleteActionCameraCue,
  );

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

  const selectedKf = globalKeyframes.find((kf) => kf.id === selectedGlobalId);

  const handleAddGlobalKeyframe = useCallback(() => {
    let tilt = 0;
    let yaw = 90;
    if (hasActiveDirectorCameraTrack(directorCamera)) {
      const resolved = resolveSyntheticDirectorCamera(
        directorCamera,
        currentTimeMs,
      );
      tilt = resolved.tilt;
      yaw = resolved.yaw;
    } else if (activeSlide?.pitchTransform) {
      tilt = activeSlide.pitchTransform.tilt ?? 0;
      yaw = activeSlide.pitchTransform.yaw ?? 90;
    }
    upsertGlobalCameraKeyframe(currentTimeMs, { tilt, yaw });
  }, [
    directorCamera,
    currentTimeMs,
    activeSlide?.pitchTransform,
    upsertGlobalCameraKeyframe,
  ]);

  const handleAddActionCue = useCallback(() => {
    upsertActionCameraCue(currentTimeMs, {
      durationMs: 1000,
      zoom: 1.5,
      panX: 0,
      panY: 0,
      autoReturn: false,
    });
  }, [currentTimeMs, upsertActionCameraCue]);

  const handleSelectKeyframe = useCallback(
    (id: string, timeMs: number) => {
      setSelectedGlobalId(id);
      seekTo(timeMs);
    },
    [seekTo],
  );

  const handleDeleteSelectedKeyframe = useCallback(() => {
    if (selectedKf) {
      deleteGlobalCameraKeyframe(selectedKf.id);
      setSelectedGlobalId(null);
    }
  }, [selectedKf, deleteGlobalCameraKeyframe]);

  const handleSelectCue = useCallback(
    (id: string, startTimeMs: number) => {
      setSelectedCueId(id);
      seekTo(startTimeMs);
    },
    [seekTo],
  );

  const handleUpdateDuration = useCallback(
    (cue: ActionCameraCue, durationMs: number) => {
      upsertActionCameraCue(cue.startTimeMs, { durationMs }, cue.id);
    },
    [upsertActionCameraCue],
  );

  const handleToggleAutoReturn = useCallback(
    (cue: ActionCameraCue) => {
      upsertActionCameraCue(
        cue.startTimeMs,
        { autoReturn: !cue.autoReturn },
        cue.id,
      );
    },
    [upsertActionCameraCue],
  );

  const handleDeleteCue = useCallback(
    (id: string) => {
      deleteActionCameraCue(id);
      setSelectedCueId(null);
    },
    [deleteActionCameraCue],
  );

  return (
    <div
      data-testid="director-camera-timeline"
      className="flex flex-col gap-1.5 flex-1 min-w-0 py-1 px-2 select-none justify-center"
    >
      {/* 上段: シークバー & コントロール */}
      <div className="flex items-center gap-2 text-[10px]">
        {/* 現在時刻表示 */}
        <span
          data-testid="director-scrubber-time"
          className="font-mono text-[#A1A1AA] shrink-0 min-w-[70px]"
        >
          {(currentTimeMs / 1000).toFixed(1)}s /{' '}
          {(totalDurationMs / 1000).toFixed(1)}s
        </span>

        {/* シークバー */}
        <input
          type="range"
          data-testid="director-scrubber-input"
          min={0}
          max={totalDurationMs}
          step={50}
          value={Math.round(currentTimeMs)}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF8100]"
        />

        {/* クイック追加ボタン群 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="add-global-keyframe-btn"
            onClick={handleAddGlobalKeyframe}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[#60A5FA] border border-[#60A5FA]/30 transition-colors cursor-pointer text-[10px]"
            title="現在のシーク位置に全体カメラピンを追加"
          >
            <Camera size={11} />
            <span>＋全体ピン追加</span>
          </button>

          <button
            type="button"
            data-testid="add-action-cue-btn"
            onClick={handleAddActionCue}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[#FF8100] border border-[#FF8100]/30 transition-colors cursor-pointer text-[10px]"
            title="現在のシーク位置にアクションカメラCueを追加"
          >
            <Video size={11} />
            <span>＋アクション追加</span>
          </button>

          {selectedKf && (
            <button
              type="button"
              data-testid="delete-global-keyframe-btn"
              onClick={handleDeleteSelectedKeyframe}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 transition-colors cursor-pointer text-[10px]"
              title="選択中の全体ピンを削除"
            >
              <Trash2 size={11} />
              <span>ピン削除</span>
            </button>
          )}
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
        onUpdateDuration={handleUpdateDuration}
        onToggleAutoReturn={handleToggleAutoReturn}
        onDeleteCue={handleDeleteCue}
      />
    </div>
  );
}
