import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { DirectorCameraTimeline } from '../director-camera-timeline';

describe('DirectorCameraTimeline Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().stopPlayback();
    // シーンを複数追加して totalDurationMs を確保 (例: 3シーンで 1000 + 500 + 1000 + 500 = 3000ms等)
    const addSlide = useTacticalUnifiedStore.getState().addSlide;
    addSlide();
    addSlide();
  });

  it('シークバー（director-scrubber-input）を value: 2000 に変更したとき、Store の playbackSeekTimeMs が 2000 に更新され、2.0s / ... が表示されること', () => {
    render(<DirectorCameraTimeline />);

    const scrubberInput = screen.getByTestId('director-scrubber-input');
    fireEvent.change(scrubberInput, { target: { value: '2000' } });

    expect(useTacticalUnifiedStore.getState().playbackSeekTimeMs).toBe(2000);
    const timeDisplay = screen.getByTestId('director-scrubber-time');
    expect(timeDisplay.textContent).toMatch(/^2\.0s \//);
  });

  it('add-global-keyframe-btn をクリックすると全体カメラピンが追加され、ピンを選択して delete-global-keyframe-btn をクリックすると削除されること', () => {
    render(<DirectorCameraTimeline />);

    // シーク位置を 1000ms に移動
    const scrubberInput = screen.getByTestId('director-scrubber-input');
    fireEvent.change(scrubberInput, { target: { value: '1000' } });

    // 「＋全体ピン追加」ボタンをクリック
    const addGlobalBtn = screen.getByTestId('add-global-keyframe-btn');
    fireEvent.click(addGlobalBtn);

    const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
    const keyframes = activePhase?.directorCamera?.globalKeyframes ?? [];
    expect(keyframes.length).toBeGreaterThan(0);

    // ピン要素が存在することを確認
    const addedKf = keyframes[keyframes.length - 1];
    const pin = screen.getByTestId(`global-kf-pin-${addedKf.id}`);
    expect(pin).toBeDefined();

    // ピンをクリックして選択
    fireEvent.click(pin);

    // 削除ボタンをクリック
    const deleteBtn = screen.getByTestId('delete-global-keyframe-btn');
    fireEvent.click(deleteBtn);

    const keyframesAfter =
      useTacticalUnifiedStore.getState().project.phases[0]?.directorCamera
        ?.globalKeyframes ?? [];
    expect(keyframesAfter.some((kf) => kf.id === addedKf.id)).toBe(false);
  });

  it('add-action-cue-btn をクリックするとアクションカメラブロックが追加され、ブロックを選択して秒数チップ action-duration-chip-2000（2.0s）をクリックすると durationMs === 2000 に更新され、action-auto-return-toggle をクリックすると autoReturn === true に切り替わること', () => {
    render(<DirectorCameraTimeline />);

    // シーク位置を 500ms に移動
    const scrubberInput = screen.getByTestId('director-scrubber-input');
    fireEvent.change(scrubberInput, { target: { value: '500' } });

    // 「＋アクション追加」ボタンをクリック
    const addActionBtn = screen.getByTestId('add-action-cue-btn');
    fireEvent.click(addActionBtn);

    const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
    const cues = activePhase?.directorCamera?.actionCues ?? [];
    expect(cues.length).toBeGreaterThan(0);

    const addedCue = cues[cues.length - 1];
    const cueBlock = screen.getByTestId(`action-cue-block-${addedCue.id}`);
    expect(cueBlock).toBeDefined();

    // ブロックをクリックして選択
    fireEvent.click(cueBlock);

    // 秒数チップ 2000 (2.0s) をクリック
    const chip2000 = screen.getByTestId('action-duration-chip-2000');
    fireEvent.click(chip2000);

    let currentCue = useTacticalUnifiedStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === addedCue.id,
      );
    expect(currentCue?.durationMs).toBe(2000);

    // autoReturn トグルをクリック
    const autoReturnToggle = screen.getByTestId('action-auto-return-toggle');
    fireEvent.click(autoReturnToggle);

    currentCue = useTacticalUnifiedStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === addedCue.id,
      );
    expect(currentCue?.autoReturn).toBe(true);

    // 削除ボタンのテストも念のため確認
    const deleteCueBtn = screen.getByTestId('delete-action-cue-btn');
    fireEvent.click(deleteCueBtn);

    const cuesAfter =
      useTacticalUnifiedStore.getState().project.phases[0]?.directorCamera
        ?.actionCues ?? [];
    expect(cuesAfter.some((c) => c.id === addedCue.id)).toBe(false);
  });
});
