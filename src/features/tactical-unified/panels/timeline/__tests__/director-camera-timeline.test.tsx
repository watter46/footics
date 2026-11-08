import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  DirectorActionTrack,
  layoutActionCuesIntoLanes,
} from '../director-action-track';
import { DirectorCameraTimeline } from '../director-camera-timeline';
import { TimelineBar } from '../timeline-bar';

describe('DirectorCameraTimeline Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().stopPlayback();
    useTacticalUnifiedStore.getState().setWorkspaceMode('director');
    // シーンを複数追加して totalDurationMs を確保 (例: 3シーンで 1000 + 500 + 1000 + 500 = 3000ms等)
    const addSlide = useTacticalUnifiedStore.getState().addSlide;
    addSlide();
    addSlide();
  });

  it('シークバー（director-scrubber-input）を value: 2000 に変更したとき、Store の playbackSeekTimeMs が 2000 に更新され、2.0s が表示されること', () => {
    render(<DirectorCameraTimeline />);

    const scrubberInput = screen.getByTestId('director-scrubber-input');
    fireEvent.change(scrubberInput, { target: { value: '2000' } });

    expect(useTacticalUnifiedStore.getState().playbackSeekTimeMs).toBe(2000);
    const timeDisplay = screen.getByTestId('director-scrubber-time');
    expect(timeDisplay.textContent).toBe('2.0s');
  });

  it('上段シークバー、中段全体トラック、下段アクショントラックのラベル幅がすべて w-14 で統一されていること', () => {
    render(<DirectorCameraTimeline />);

    const scrubberTime = screen.getByTestId('director-scrubber-time');
    expect(scrubberTime.className).toContain('w-14');

    const globalTrackLabel = screen.getByText('全体');
    expect(globalTrackLabel.className).toContain('w-14');

    const actionTrackLabel = screen.getByText('アクション');
    expect(actionTrackLabel.className).toContain('w-14');
  });

  it('重複する2つのアクションCueがあるとき、サブレーンが2段生成され、各ブロックが異なる縦位置にレンダリングされること', () => {
    const store = useTacticalUnifiedStore.getState();
    store.upsertActionCameraCue(
      1000,
      {
        durationMs: 2000,
        zoom: 1.5,
        panX: 0,
        panY: 0,
        autoReturn: false,
      },
      'cue-overlap-1',
    );
    store.upsertActionCameraCue(
      2000,
      {
        durationMs: 1000,
        zoom: 2.0,
        panX: 0,
        panY: 0,
        autoReturn: false,
      },
      'cue-overlap-2',
    );

    render(<DirectorCameraTimeline />);

    const sublane0 = screen.getByTestId('action-sublane-0');
    const sublane1 = screen.getByTestId('action-sublane-1');
    expect(sublane0).toBeDefined();
    expect(sublane1).toBeDefined();

    const cues =
      useTacticalUnifiedStore.getState().project.phases[0]?.directorCamera
        ?.actionCues ?? [];
    expect(cues.length).toBe(2);

    const block1 = screen.getByTestId(`action-cue-block-${cues[0].id}`);
    const block2 = screen.getByTestId(`action-cue-block-${cues[1].id}`);

    expect(sublane0.contains(block1)).toBe(true);
    expect(sublane1.contains(block2)).toBe(true);
  });

  it('workspaceMode === "director" のとき、右側の一括設定ボタンとショートカットヒントが非表示になっていること', () => {
    act(() => {
      useTacticalUnifiedStore.getState().setWorkspaceMode('director');
    });
    const { rerender } = render(<TimelineBar />);

    expect(screen.queryByRole('button', { name: '一括設定' })).toBeNull();
    expect(screen.queryByText('L-Click')).toBeNull();

    act(() => {
      useTacticalUnifiedStore.getState().setWorkspaceMode('board');
    });
    rerender(<TimelineBar />);

    expect(screen.getByRole('button', { name: '一括設定' })).toBeDefined();
    expect(screen.getByText('L-Click')).toBeDefined();
  });
});

describe('layoutActionCuesIntoLanes', () => {
  it('重複しないCueは同一レーンに配置されること', () => {
    const cues = [
      {
        id: '1',
        startTimeMs: 0,
        durationMs: 1000,
        zoom: 1,
        panX: 0,
        panY: 0,
        autoReturn: false,
      },
      {
        id: '2',
        startTimeMs: 1000,
        durationMs: 1000,
        zoom: 1,
        panX: 0,
        panY: 0,
        autoReturn: false,
      },
    ];
    const lanes = layoutActionCuesIntoLanes(cues);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]).toHaveLength(2);
  });

  it('重複するCueは別レーンに分割されること', () => {
    const cues = [
      {
        id: '1',
        startTimeMs: 1000,
        durationMs: 2000,
        zoom: 1,
        panX: 0,
        panY: 0,
        autoReturn: false,
      },
      {
        id: '2',
        startTimeMs: 2000,
        durationMs: 1000,
        zoom: 1,
        panX: 0,
        panY: 0,
        autoReturn: false,
      },
    ];
    const lanes = layoutActionCuesIntoLanes(cues);
    expect(lanes).toHaveLength(2);
    expect(lanes[0][0].id).toBe('1');
    expect(lanes[1][0].id).toBe('2');
  });
});
