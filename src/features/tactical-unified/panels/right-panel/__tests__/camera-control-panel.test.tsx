import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toMilliseconds } from '@/lib/types/tactical/branded';
import { CameraControlPanel } from '../camera-control-panel';

function renderCameraPanel(options?: {
  workspaceMode?: 'board' | 'director';
  timeMs?: number;
}) {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const stores = {
    documentStore: createDocumentStore(project),
    sessionStore: createSessionStore({
      workspaceMode: options?.workspaceMode ?? 'board',
      activePhaseId: p0.id,
      activeSlideId: p0.slides[0]?.id ?? '',
    }),
    playbackStore: createPlaybackStore(toMilliseconds(options?.timeMs ?? 0)),
  };
  return {
    stores,
    phaseId: p0.id,
    slideId: p0.slides[0]?.id ?? '',
    ...render(
      <TacticalStoreProvider stores={stores}>
        <CameraControlPanel />
      </TacticalStoreProvider>,
    ),
  };
}

describe('CameraControlPanel (Phase 1)', () => {
  it('1. workspaceMode: "director", timeMs: 1500 のとき、Tiltスライダーを 30 に変更すると globalKeyframes に timeMs: 1500, tilt: 30 が登録されること', () => {
    const { stores } = renderCameraPanel({
      workspaceMode: 'director',
      timeMs: 1500,
    });

    const tiltSlider = screen.getByLabelText('Tilt', {
      selector: 'input[type="range"]',
    });
    fireEvent.change(tiltSlider, { target: { value: '30' } });

    const keyframes =
      stores.documentStore.getState().project.phases[0]?.directorCamera
        ?.globalKeyframes ?? [];
    expect(keyframes).toContainEqual(
      expect.objectContaining({ timeMs: 1500, tilt: 30 }),
    );
  });

  it('2. workspaceMode: "director", timeMs: 2000 のとき、Zoomスライダーを 2.0 に変更すると actionCues に startTimeMs: 2000, zoom: 2 が登録されること', () => {
    const { stores } = renderCameraPanel({
      workspaceMode: 'director',
      timeMs: 2000,
    });

    const zoomSlider = screen.getByLabelText('Zoom', {
      selector: 'input[type="range"]',
    });
    fireEvent.change(zoomSlider, { target: { value: '2' } });

    const cues =
      stores.documentStore.getState().project.phases[0]?.directorCamera
        ?.actionCues ?? [];
    expect(cues).toContainEqual(
      expect.objectContaining({ startTimeMs: 2000, zoom: 2 }),
    );
  });

  it('3. workspaceMode: "director" でプリセットボタンをクリックしたとき、globalKeyframes に現在シーク時刻で登録されること', () => {
    const { stores } = renderCameraPanel({
      workspaceMode: 'director',
      timeMs: 800,
    });

    const presetBtn = screen.getByRole('button', {
      name: /トップダウン/i,
    });
    fireEvent.click(presetBtn);

    const keyframes =
      stores.documentStore.getState().project.phases[0]?.directorCamera
        ?.globalKeyframes ?? [];
    expect(keyframes).toContainEqual(
      expect.objectContaining({ timeMs: 800, tilt: 0, yaw: 90 }),
    );
  });

  it('4. workspaceMode: "board" のときはアクティブスライドの pitchTransform.tilt が更新されること', () => {
    const { stores, phaseId, slideId } = renderCameraPanel({
      workspaceMode: 'board',
    });

    const tiltSlider = screen.getByLabelText('Tilt', {
      selector: 'input[type="range"]',
    });
    fireEvent.change(tiltSlider, { target: { value: '45' } });

    const slide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(slide?.pitchTransform?.tilt).toBe(45);
  });

  it('5. workspaceMode: "director" で現在シーク時刻にアクションCueが存在する場合、インスペクターが表示されチップ・トグル・削除が動作すること', () => {
    const { stores, phaseId } = renderCameraPanel({
      workspaceMode: 'director',
      timeMs: 1000,
    });

    act(() => {
      stores.documentStore.getState().dispatch({
        type: 'UPSERT_ACTION_CAMERA_CUE',
        phaseId,
        startTimeMs: 1000,
        patch: {
          durationMs: 1000,
          zoom: 1.5,
          autoReturn: false,
        },
      });
    });

    const cue =
      stores.documentStore.getState().project.phases[0]?.directorCamera
        ?.actionCues?.[0];
    expect(cue).toBeDefined();

    // Inspector section should be visible
    expect(screen.getByTestId('director-cue-inspector')).toBeDefined();

    // Duration chip 2.0s (2000ms)
    const chip2000 = screen.getByTestId('action-duration-chip-2000');
    fireEvent.click(chip2000);

    let currentCue = stores.documentStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === cue!.id,
      );
    expect(currentCue?.durationMs).toBe(2000);

    // Auto-return toggle
    const autoReturnToggle = screen.getByTestId('action-auto-return-toggle');
    fireEvent.click(autoReturnToggle);

    currentCue = stores.documentStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === cue!.id,
      );
    expect(currentCue?.autoReturn).toBe(true);

    // Delete cue button
    const deleteBtn = screen.getByTestId('delete-action-cue-btn');
    fireEvent.click(deleteBtn);

    const cuesAfter =
      stores.documentStore.getState().project.phases[0]?.directorCamera
        ?.actionCues ?? [];
    expect(cuesAfter.some((c) => c.id === cue!.id)).toBe(false);
  });

  it('6. DirectorCueInspector の秒数手入力フィールドに 1.5 を入力すると、durationMs: 1500 に更新されること', () => {
    const { stores, phaseId } = renderCameraPanel({
      workspaceMode: 'director',
      timeMs: 1000,
    });

    act(() => {
      stores.documentStore.getState().dispatch({
        type: 'UPSERT_ACTION_CAMERA_CUE',
        phaseId,
        startTimeMs: 1000,
        patch: {
          durationMs: 1000,
          zoom: 1.5,
        },
      });
    });

    const cue =
      stores.documentStore.getState().project.phases[0]?.directorCamera
        ?.actionCues?.[0];
    expect(cue).toBeDefined();

    const durationInput = screen.getByTestId('action-duration-input');
    expect(durationInput).toBeDefined();
    expect((durationInput as HTMLInputElement).value).toBe('1.0');

    fireEvent.change(durationInput, { target: { value: '1.5' } });

    const updatedCue = stores.documentStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === cue!.id,
      );
    expect(updatedCue?.durationMs).toBe(1500);
  });

  it('7. activeCue が存在するとき、Zoomスライダー操作で activeCue.zoom が更新され、初期値も activeCue.zoom が表示されること', () => {
    const { stores, phaseId } = renderCameraPanel({
      workspaceMode: 'director',
      timeMs: 1200,
    });

    act(() => {
      stores.documentStore.getState().dispatch({
        type: 'UPSERT_ACTION_CAMERA_CUE',
        phaseId,
        startTimeMs: 1000,
        patch: {
          durationMs: 2000,
          zoom: 2.2,
        },
      });
    });

    const cue =
      stores.documentStore.getState().project.phases[0]?.directorCamera
        ?.actionCues?.[0];
    expect(cue).toBeDefined();

    const zoomSlider = screen.getByLabelText('Zoom', {
      selector: 'input[type="range"]',
    });
    expect((zoomSlider as HTMLInputElement).value).toBe('2.2');

    fireEvent.change(zoomSlider, { target: { value: '2.5' } });

    const updatedCue = stores.documentStore
      .getState()
      .project.phases[0]?.directorCamera?.actionCues?.find(
        (c) => c.id === cue!.id,
      );
    expect(updatedCue?.zoom).toBe(2.5);
  });

  it('8. Zoomスライダーの midLabel (1.0x (標準)) をクリックすると 1.0 にリセットされること', () => {
    const { stores, phaseId, slideId } = renderCameraPanel({
      workspaceMode: 'board',
    });

    const zoomSlider = screen.getByLabelText('Zoom', {
      selector: 'input[type="range"]',
    });
    fireEvent.change(zoomSlider, { target: { value: '2.0' } });

    const midLabel = screen.getByText('1.0x (標準)');
    fireEvent.click(midLabel);

    const slide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(slide?.pitchTransform?.zoom).toBe(1);
  });
});
