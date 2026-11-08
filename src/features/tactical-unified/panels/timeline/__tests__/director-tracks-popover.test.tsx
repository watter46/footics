import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  ActionCameraCue,
  GlobalCameraKeyframe,
} from '@/lib/types/tactical-unified';
import { DirectorActionTrack } from '../director-action-track';
import { DirectorGlobalTrack } from '../director-global-track';

describe('Director Tracks Popover and Deletion', () => {
  it('GlobalTrack: ピンクリックでPopoverが表示され、削除ボタン（text-red-500, cursor-pointer）押下で onDeleteKeyframe が呼ばれること', () => {
    const onDeleteKeyframe = vi.fn();
    const onSelectKeyframe = vi.fn();
    const keyframes: GlobalCameraKeyframe[] = [
      { id: 'kf-1', timeMs: 1000, tilt: 20, yaw: 30 },
    ];

    render(
      <DirectorGlobalTrack
        globalKeyframes={keyframes}
        selectedGlobalId={null}
        totalDurationMs={5000}
        currentTimeMs={0}
        onSelectKeyframe={onSelectKeyframe}
        onDeleteKeyframe={onDeleteKeyframe}
      />,
    );

    const pin = screen.getByTestId('global-kf-pin-kf-1');
    fireEvent.click(pin);

    const popover = screen.getByTestId('global-pin-popover-kf-1');
    expect(popover).toBeDefined();

    const deleteBtn = screen.getByTestId('delete-global-pin-btn-kf-1');
    expect(deleteBtn.className).toContain('text-red-500');
    expect(deleteBtn.className).toContain('cursor-pointer');

    // ピンラッパー要素がバックドロップ(z-30)より前面(z-40等)にあること
    const pinWrapper = pin.parentElement;
    expect(pinWrapper?.className).toContain('z-40');

    fireEvent.click(deleteBtn);
    expect(onDeleteKeyframe).toHaveBeenCalledWith('kf-1');
  });

  it('ActionTrack: Cue親ブロックからtruncateが除去され、Popover削除ボタン（text-red-500, cursor-pointer）押下で onDeleteCue が呼ばれること', () => {
    const onDeleteCue = vi.fn();
    const onSelectCue = vi.fn();
    const actionCues: ActionCameraCue[] = [
      {
        id: 'cue-1',
        startTimeMs: 1000,
        durationMs: 2000,
        zoom: 2.0,
        panX: 10,
        panY: 0,
        autoReturn: false,
      },
    ];

    render(
      <DirectorActionTrack
        actionCues={actionCues}
        selectedCueId={null}
        totalDurationMs={5000}
        currentTimeMs={0}
        onSelectCue={onSelectCue}
        onDeleteCue={onDeleteCue}
      />,
    );

    const cueBlock = screen.getByTestId('action-cue-block-cue-1');
    // Cue親ブロックから truncate が除去されていること
    expect(cueBlock.className).not.toContain('truncate');

    // CueクリックでPopover表示
    fireEvent.click(cueBlock);

    const popover = screen.getByTestId('action-cue-popover-cue-1');
    expect(popover).toBeDefined();

    // Popover表示時、Cueブロックがバックドロップ(z-30)より前面(z-40)にあること
    expect(cueBlock.className).toContain('z-40');

    const deleteBtn = screen.getByTestId('delete-action-cue-popover-btn-cue-1');
    expect(deleteBtn.className).toContain('text-red-500');
    expect(deleteBtn.className).toContain('cursor-pointer');

    fireEvent.click(deleteBtn);
    expect(onDeleteCue).toHaveBeenCalledWith('cue-1');
  });
});
