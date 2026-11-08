import { describe, expect, it } from 'vitest';
import type { DirectorCameraTrack } from '@/lib/types/tactical-unified';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '../interpolation-director';

describe('resolveSyntheticDirectorCamera', () => {
  const baseConfig: DirectorCameraTrack = {
    enabled: true,
    globalKeyframes: [
      { id: 'kf-1', timeMs: 0, tilt: 10, yaw: 45 },
      { id: 'kf-2', timeMs: 4000, tilt: 30, yaw: 135 },
    ],
    actionCues: [
      {
        id: 'cue-1',
        startTimeMs: 2000,
        durationMs: 3000,
        transitionInMs: 500,
        zoom: 2.5,
        panX: 15,
        panY: -10,
        autoReturn: true,
        holdMs: 1000,
        returnDurationMs: 800,
      },
    ],
  };

  it('hasActiveDirectorCameraTrack correctly identifies active tracks', () => {
    expect(hasActiveDirectorCameraTrack(baseConfig)).toBe(true);
    expect(
      hasActiveDirectorCameraTrack({
        enabled: false,
        globalKeyframes: [],
        actionCues: [],
      }),
    ).toBe(false);
    expect(hasActiveDirectorCameraTrack(null)).toBe(false);
  });

  it('再生中 (!isEditing): Cue開始時刻 (timeMs = 2000) ではアプローチ開始前 (zoom: 1.0, panX: 0, panY: 0)', () => {
    const res = resolveSyntheticDirectorCamera(baseConfig, 2000, {
      isEditing: false,
    });
    expect(res.zoom).toBeCloseTo(1.0, 5);
    expect(res.panX).toBeCloseTo(0, 5);
    expect(res.panY).toBeCloseTo(0, 5);
  });

  it('停止・編集中 (isEditing: true): Cue開始時刻 (timeMs = 2000) で Cue のターゲット値が100%即時反映される (zoom: 2.5, panX: 15, panY: -10)', () => {
    const res = resolveSyntheticDirectorCamera(baseConfig, 2000, {
      isEditing: true,
    });
    expect(res.zoom).toBeCloseTo(2.5, 5);
    expect(res.panX).toBeCloseTo(15, 5);
    expect(res.panY).toBeCloseTo(-10, 5);
  });

  it('停止・編集中 (isEditing: true): selectedCueId で指定された Cue のターゲット値が即時反映される', () => {
    // timeMs = 500 (Cue期間外) でも selectedCueId: 'cue-1' なら cue-1 の値が反映される
    const res = resolveSyntheticDirectorCamera(baseConfig, 500, {
      isEditing: true,
      selectedCueId: 'cue-1',
    });
    expect(res.zoom).toBeCloseTo(2.5, 5);
    expect(res.panX).toBeCloseTo(15, 5);
    expect(res.panY).toBeCloseTo(-10, 5);
  });

  it('再生中 (!isEditing): transitionIn 完了後は cue のターゲット値に到達する', () => {
    const res = resolveSyntheticDirectorCamera(baseConfig, 2500, {
      isEditing: false,
    });
    expect(res.zoom).toBeCloseTo(2.5, 5);
    expect(res.panX).toBeCloseTo(15, 5);
    expect(res.panY).toBeCloseTo(-10, 5);
  });
});
