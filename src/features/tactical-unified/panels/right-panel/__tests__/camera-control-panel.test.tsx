import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { CameraControlPanel } from '../camera-control-panel';

describe('CameraControlPanel (Phase 1)', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().stopPlayback();
    useTacticalUnifiedStore.setState({
      workspaceMode: 'board',
      playbackSeekTimeMs: 0,
    });
  });

  it('1. workspaceMode: "director", playbackSeekTimeMs: 1500 のとき、Tiltスライダーを 30 に変更すると upsertGlobalCameraKeyframe(1500, { tilt: 30 }) が呼ばれること', () => {
    const upsertSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'upsertGlobalCameraKeyframe',
    );
    useTacticalUnifiedStore.setState({
      workspaceMode: 'director',
      playbackSeekTimeMs: 1500,
    });

    render(<CameraControlPanel />);

    const tiltSlider = screen.getByLabelText('Tilt', {
      selector: 'input[type="range"]',
    });
    fireEvent.change(tiltSlider, { target: { value: '30' } });

    expect(upsertSpy).toHaveBeenCalledWith(1500, { tilt: 30 });
    upsertSpy.mockRestore();
  });

  it('2. workspaceMode: "director", playbackSeekTimeMs: 2000 のとき、Zoomスライダーを 2.0 に変更すると upsertActionCameraCue(2000, expect.objectContaining({ zoom: 2.0 })) が呼ばれること', () => {
    const upsertActionSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'upsertActionCameraCue',
    );
    useTacticalUnifiedStore.setState({
      workspaceMode: 'director',
      playbackSeekTimeMs: 2000,
    });

    render(<CameraControlPanel />);

    const zoomSlider = screen.getByLabelText('Zoom', {
      selector: 'input[type="range"]',
    });
    fireEvent.change(zoomSlider, { target: { value: '2' } });

    expect(upsertActionSpy).toHaveBeenCalledWith(
      2000,
      expect.objectContaining({ zoom: 2 }),
    );
    upsertActionSpy.mockRestore();
  });

  it('3. workspaceMode: "director" でプリセットボタンをクリックしたとき、upsertGlobalCameraKeyframe が現在シーク時刻で呼ばれること', () => {
    const upsertSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'upsertGlobalCameraKeyframe',
    );
    useTacticalUnifiedStore.setState({
      workspaceMode: 'director',
      playbackSeekTimeMs: 800,
    });

    render(<CameraControlPanel />);

    // Click "トップダウン（完全平面・縦向き）" preset (tilt: 0, yaw: 90)
    const presetBtn = screen.getByRole('button', {
      name: /トップダウン/i,
    });
    fireEvent.click(presetBtn);

    expect(upsertSpy).toHaveBeenCalledWith(800, { tilt: 0, yaw: 90 });
    upsertSpy.mockRestore();
  });

  it('4. workspaceMode: "board" のときは従来通り updatePitchTransform が呼ばれること', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updatePitchTransform',
    );
    useTacticalUnifiedStore.setState({
      workspaceMode: 'board',
    });

    render(<CameraControlPanel />);

    const tiltSlider = screen.getByLabelText('Tilt', {
      selector: 'input[type="range"]',
    });
    fireEvent.change(tiltSlider, { target: { value: '45' } });

    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    expect(updateSpy).toHaveBeenCalledWith(activeSlideId, { tilt: 45 });
    updateSpy.mockRestore();
  });

  it('5. workspaceMode: "director" で現在シーク時刻にアクションCueが存在する場合、インスペクターが表示されチップ・トグル・削除が動作すること', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setWorkspaceMode('director');
    store.seekTo(1000);
    // Add an action cue at 1000ms
    store.upsertActionCameraCue(1000, {
      durationMs: 1000,
      zoom: 1.5,
      autoReturn: false,
    });

    const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
    const cue = activePhase?.directorCamera?.actionCues?.[0];
    expect(cue).toBeDefined();

    render(<CameraControlPanel />);

    // Inspector section should be visible
    expect(screen.getByTestId('director-cue-inspector')).toBeDefined();

    // Duration chip 2.0s (2000ms)
    const chip2000 = screen.getByTestId('action-duration-chip-2000');
    fireEvent.click(chip2000);

    let currentCue = useTacticalUnifiedStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === cue!.id,
      );
    expect(currentCue?.durationMs).toBe(2000);

    // Auto-return toggle
    const autoReturnToggle = screen.getByTestId('action-auto-return-toggle');
    fireEvent.click(autoReturnToggle);

    currentCue = useTacticalUnifiedStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === cue!.id,
      );
    expect(currentCue?.autoReturn).toBe(true);

    // Delete cue button
    const deleteBtn = screen.getByTestId('delete-action-cue-btn');
    fireEvent.click(deleteBtn);

    const cuesAfter =
      useTacticalUnifiedStore.getState().project.phases[0]?.directorCamera
        ?.actionCues ?? [];
    expect(cuesAfter.some((c) => c.id === cue!.id)).toBe(false);
  });

  it('6. DirectorCueInspector の秒数手入力フィールドに 1.5 を入力すると、upsertActionCameraCue が durationMs: 1500 で呼ばれること', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setWorkspaceMode('director');
    store.seekTo(1000);
    store.upsertActionCameraCue(1000, {
      durationMs: 1000,
      zoom: 1.5,
    });

    const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
    const cue = activePhase?.directorCamera?.actionCues?.[0];
    expect(cue).toBeDefined();

    const upsertActionSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'upsertActionCameraCue',
    );

    render(<CameraControlPanel />);

    const durationInput = screen.getByTestId('action-duration-input');
    expect(durationInput).toBeDefined();
    expect((durationInput as HTMLInputElement).value).toBe('1.0');

    fireEvent.change(durationInput, { target: { value: '1.5' } });

    expect(upsertActionSpy).toHaveBeenCalledWith(
      cue!.startTimeMs,
      expect.objectContaining({ durationMs: 1500 }),
      cue!.id,
    );
    upsertActionSpy.mockRestore();
  });

  it('7. activeCue が存在するとき、Zoomスライダー操作で activeCue.id を含む upsertActionCameraCue が呼ばれ、activeCue.zoom が表示されること', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setWorkspaceMode('director');
    store.seekTo(1200);
    store.upsertActionCameraCue(1000, {
      durationMs: 2000,
      zoom: 2.2,
    });

    const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
    const cue = activePhase?.directorCamera?.actionCues?.[0];
    expect(cue).toBeDefined();

    const upsertActionSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'upsertActionCameraCue',
    );

    render(<CameraControlPanel />);

    const zoomSlider = screen.getByLabelText('Zoom', {
      selector: 'input[type="range"]',
    });
    expect((zoomSlider as HTMLInputElement).value).toBe('2.2');

    fireEvent.change(zoomSlider, { target: { value: '2.5' } });

    expect(upsertActionSpy).toHaveBeenCalledWith(
      1200,
      expect.objectContaining({ zoom: 2.5 }),
      cue!.id,
    );
    upsertActionSpy.mockRestore();
  });

  it('8. Zoomスライダーの midLabel (1.0x (標準)) をクリックすると 1.0 にリセットされること', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setWorkspaceMode('board');

    render(<CameraControlPanel />);

    const midLabel = screen.getByText('1.0x (標準)');
    fireEvent.click(midLabel);

    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updatePitchTransform',
    );
    fireEvent.click(midLabel);

    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    expect(updateSpy).toHaveBeenCalledWith(activeSlideId, { zoom: 1 });
    updateSpy.mockRestore();
  });
});
