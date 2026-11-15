import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as playerPhotoRegistryHook from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import * as sharePayload from '@/lib/tactical/export/share-payload';
import * as frameRenderer from '@/lib/tactical/export/tactical-phase-frame-renderer';
import type { PitchTransform } from '@/lib/types/tactical/slide';
import { TacticalSplitPreviewPanel } from '../tactical-split-preview-panel';

function createSplitPreviewHarness(options?: {
  aspectRatio?: '16:9' | '4:5' | '1:1' | '9:16';
  boundaryBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    enabled: boolean;
    visible?: boolean;
    fitTarget?: 'pitch' | 'canvas';
  };
  screenBackground?: {
    type: 'cinematic' | 'transparent' | 'solid';
    color?: string;
  };
  pitchTransform?: PitchTransform;
}) {
  const bundle = normalizeTacticalProject({
    id: 'proj-split-test',
    title: 'Split Test',
    ...(options?.screenBackground
      ? { screenBackground: options.screenBackground }
      : {}),
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1',
        aspectRatio: options?.aspectRatio ?? '16:9',
        ...(options?.boundaryBox ? { boundaryBox: options.boundaryBox } : {}),
        slides: [
          {
            id: 'slide-1',
            index: 0,
            ...(options?.pitchTransform
              ? { pitchTransform: options.pitchTransform }
              : {}),
          },
        ],
      },
    ],
  });
  const documentStore = createDocumentStore(bundle.project);
  const sessionStore = createSessionStore({
    activePhaseId: bundle.activePhaseId,
    activeSlideId: bundle.activeSlideId,
  });
  const playbackStore = createPlaybackStore();
  const renderPanel = () =>
    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <TacticalSplitPreviewPanel />
      </TacticalStoreProvider>,
    );
  return {
    documentStore,
    sessionStore,
    playbackStore,
    phaseId: bundle.activePhaseId,
    slideId: bundle.activeSlideId,
    renderPanel,
  };
}

describe('TacticalSplitPreviewPanel (Layout Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockCtx = new Proxy(
      {
        getImageData: () => ({ data: new Array(4) }),
        createImageData: () => [],
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        measureText: () => ({ width: 0 }),
        getLineDash: () => [],
        isPointInPath: () => true,
        createLinearGradient: () => ({ addColorStop: vi.fn() }),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
      } as Record<string, unknown>,
      {
        get: (target, prop: string) =>
          prop in target ? target[prop] : vi.fn(),
      },
    );
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
  });

  it('renders full-bleed layout canvas with border-white/10 without header or footer controls', () => {
    const { container, queryByText, queryByLabelText } =
      createSplitPreviewHarness().renderPanel();

    // Header & Close button should NOT be rendered
    expect(queryByText('🎬 Layout Mode')).toBeNull();
    expect(queryByLabelText('Close Layout Mode')).toBeNull();

    // ExportPreviewControls should NOT be rendered
    expect(queryByLabelText('Play preview')).toBeNull();

    // Canvas container should have border-white/10
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    const borderContainer = canvas?.parentElement;
    expect(borderContainer?.className).toContain('border');
    expect(borderContainer?.className).toContain('border-white/10');
  });

  it('renders canvas with 16:9 Full HD (1920x1080) even when project aspectRatio is 4:5', () => {
    const { container } = createSplitPreviewHarness({
      aspectRatio: '4:5',
    }).renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);

    const containerDiv = canvas.parentElement;
    expect(containerDiv?.style.aspectRatio).toBe('1920 / 1080');
  });

  it('passes screenBackground from store to renderTacticalPhaseFrameToCanvas', () => {
    const renderSpy = vi.spyOn(
      frameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );
    createSplitPreviewHarness({
      screenBackground: { type: 'cinematic' },
    }).renderPanel();

    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        screenBackground: {
          type: 'cinematic',
        },
      }),
    );
  });

  it('passes boundaryBox as null during stopped, and active boundaryBox during playback to useExportPreviewAnimation', () => {
    const renderSpy = vi.spyOn(
      frameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );
    const { playbackStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 80, enabled: true },
    });
    renderPanel();

    // 停止時は境界線オーバーレイで編集するため、レンダラーには boundaryBox: null (16:9 全体) を渡す
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({ boundaryBox: null }),
    );

    act(() => {
      playbackStore.getState().togglePlayback();
    });

    // 再生時は境界線内のみをクロップ再生するため、レンダラーに boundaryBox を渡す
    expect(renderSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        boundaryBox: expect.objectContaining({
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        }),
      }),
    );
  });

  it('updates tilt and yaw on normal left-drag only on pointer up (drag end)', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness();
    const { container } = renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });

    // ドラッグ途中ではストアの pitchTransform はまだ更新されない
    const midSlide = documentStore.getState().project.phases[0].slides[0];
    expect(midSlide.pitchTransform?.tilt ?? 0).toBe(0);
    expect(midSlide.pitchTransform?.yaw ?? 90).toBe(90);

    // pointerUp で初めてストアへコミットされる
    fireEvent.pointerUp(canvas);

    const endSlide = documentStore.getState().project.phases[0].slides[0];
    expect(endSlide.pitchTransform?.tilt).toBe(10);
    expect(endSlide.pitchTransform?.yaw).toBe(110);
    expect(endSlide.pitchTransform?.panX ?? 0).toBe(0);
    expect(endSlide.pitchTransform?.panY ?? 0).toBe(0);
  });

  it('clamps tilt between 0 and 70, and normalizes yaw between 0 and 360', () => {
    const { documentStore, phaseId, slideId, renderPanel } =
      createSplitPreviewHarness();
    const { container } = renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    // Drag down (+dy) to try reducing tilt below 0
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 200, button: 0 });
    fireEvent.pointerUp(canvas);

    let activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(0);

    // Drag up huge amount (-dy) to try exceeding 70
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: -300, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(70);

    // Test yaw wrap-around
    documentStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_SLIDE_META',
      patch: {
        pitchTransform: {
          tilt: 70,
          yaw: 90,
          zoom: 1,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
      },
    });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: -200, clientY: 100, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.yaw).toBe(330);
  });

  it('updates panX and panY on Shift + pointer drag (pan mode)', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness();
    const { container } = renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      shiftKey: true,
      button: 0,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 130,
      shiftKey: true,
      button: 0,
    });
    fireEvent.pointerUp(canvas);

    const activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.panX).toBe(50);
    expect(activeSlide.pitchTransform?.panY).toBe(30);
    expect(activeSlide.pitchTransform?.tilt).toBe(0);
    expect(activeSlide.pitchTransform?.yaw).toBe(90);
  });

  it('updates zoom on canvas wheel event within 0.5 to 2.5 bounds', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness();
    const { container } = renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    fireEvent.wheel(canvas, { deltaY: -200 });

    const activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.zoom).toBe(1.3);
  });

  it('passes default pitchTransform when camera is at default front angle, and updated pitchTransform on change', () => {
    const renderSpy = vi.spyOn(
      frameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );
    const { documentStore, phaseId, slideId, renderPanel } =
      createSplitPreviewHarness();

    renderPanel();

    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pitchTransform: null,
      }),
    );

    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_SLIDE_META',
        patch: {
          pitchTransform: {
            tilt: 15,
            yaw: 75,
            zoom: 1,
            panX: 0,
            panY: 0,
            isLocked: false,
          },
        },
      });
    });

    expect(renderSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pitchTransform: expect.objectContaining({
          tilt: 15,
          yaw: 75,
          zoom: 1,
          panX: 0,
          panY: 0,
        }),
      }),
    );
  });

  it('does not re-invoke preloadSlidePlayerPhotos during pointer dragging / camera updates', () => {
    const preloadSpy = vi
      .spyOn(sharePayload, 'preloadSlidePlayerPhotos')
      .mockResolvedValue({});

    const { container } = createSplitPreviewHarness().renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    const initialCallCount = preloadSpy.mock.calls.length;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 110, clientY: 90, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 80, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 130, clientY: 70, button: 0 });
    fireEvent.pointerUp(canvas);

    expect(preloadSpy).toHaveBeenCalledTimes(initialCallCount);
  });

  it('passes playerPhotos from usePlayerPhotoRegistry to renderTacticalPhaseFrameToCanvas', () => {
    const mockImage = {} as HTMLImageElement;
    vi.spyOn(playerPhotoRegistryHook, 'usePlayerPhotoRegistry').mockReturnValue(
      new Map([['p1', mockImage]]),
    );
    const renderSpy = vi.spyOn(
      frameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );
    createSplitPreviewHarness().renderPanel();

    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        playerPhotos: expect.objectContaining({ p1: mockImage }),
      }),
    );
  });

  it('renders boundary mask overlay and boundary box overlay handles when boundaryBox is enabled in edit mode', () => {
    const { queryByTestId } = createSplitPreviewHarness({
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
        visible: true,
      },
    }).renderPanel();

    expect(queryByTestId('boundary-mask-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-box-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-handle-tl')).not.toBeNull();
    expect(queryByTestId('boundary-handle-br')).not.toBeNull();
  });

  it('does not render toggle crop preview button even when boundaryBox is active', () => {
    const { queryByTestId } = createSplitPreviewHarness({
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
        visible: true,
      },
    }).renderPanel();

    expect(queryByTestId('toggle-crop-preview-btn')).toBeNull();
  });

  it('hides edit handles and boundary overlay during playback for cropped preview', () => {
    const { playbackStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
        visible: true,
      },
    });
    const { queryByTestId } = renderPanel();

    // 静止時: ハンドルとマスク両方存在
    expect(queryByTestId('boundary-box-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-mask-overlay')).not.toBeNull();

    act(() => {
      playbackStore.getState().togglePlayback();
    });

    // 再生時は境界線内のみがクロップ表示され、編集枠と暗転マスクは非表示
    expect(queryByTestId('boundary-box-overlay')).toBeNull();
    expect(queryByTestId('boundary-corner-tl')).toBeNull();
    expect(queryByTestId('boundary-mask-overlay')).toBeNull();
  });

  it('updates active phase boundaryBox on 4-edge bar drag', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        enabled: true,
        visible: true,
      },
    });
    const { getByTestId, container } = renderPanel();

    const containerEl = container.querySelector(
      '[data-testid="preview-container"]',
    );
    if (!containerEl) throw new Error('Container not found');
    vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const topEdge = getByTestId('boundary-edge-top');
    expect(getByTestId('boundary-box-frame').className).toContain(
      'pointer-events-none',
    );

    fireEvent.pointerDown(topEdge, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(topEdge, {
      clientX: 200,
      clientY: 150,
      button: 0,
    });
    fireEvent.pointerUp(topEdge);

    const updated = documentStore.getState().project.phases[0].boundaryBox;
    expect(updated.x).toBe(20);
    expect(updated.y).toBe(15);
    expect(updated.width).toBe(50);
    expect(updated.height).toBe(50);
  });

  it('allows pitch camera operation even when boundaryBox is active because boundary-box-frame is pointer-events-none', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
        visible: true,
      },
    });
    const { container } = renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    // Canvas上でドラッグ操作
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });
    fireEvent.pointerUp(canvas);

    const updatedSlide = documentStore.getState().project.phases[0].slides[0];
    expect(updatedSlide.pitchTransform?.tilt).toBe(10);
    expect(updatedSlide.pitchTransform?.yaw).toBe(110);
  });

  it('updates active phase boundaryBox width and height on corner handle drag', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        enabled: true,
        visible: true,
      },
    });
    const { getByTestId, container } = renderPanel();

    const containerEl = container.querySelector(
      '[data-testid="preview-container"]',
    );
    if (!containerEl) throw new Error('Container not found');
    vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const brCorner = getByTestId('boundary-handle-br');
    fireEvent.pointerDown(brCorner, { clientX: 600, clientY: 600, button: 0 });
    fireEvent.pointerMove(brCorner, { clientX: 700, clientY: 750, button: 0 });
    fireEvent.pointerUp(brCorner);

    const updated = documentStore.getState().project.phases[0].boundaryBox;
    expect(updated.x).toBe(10);
    expect(updated.y).toBe(10);
    expect(updated.width).toBe(60);
    expect(updated.height).toBe(65);
  });

  it('locks container aspect ratio to 16:9 when stopped and updates to boundaryBox aspect ratio during playback', () => {
    const { playbackStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 50, enabled: true },
    });
    const { getByTestId, container } = renderPanel();

    const canvas = container.querySelector('canvas');
    const previewContainer = getByTestId('preview-container');
    if (!canvas) throw new Error('Canvas not found');

    // 静止時: 16:9 full HD (1920x1080)
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(previewContainer.style.aspectRatio).toBe('1920 / 1080');

    act(() => {
      playbackStore.getState().togglePlayback();
    });

    // 再生時はクロップ再生となり、境界線比率の解像度とアスペクト比に更新される
    expect(previewContainer.style.aspectRatio).not.toBe('1920 / 1080');
  });

  describe('Director Camera Track Interaction', () => {
    it('upserts global camera keyframe on normal left-drag pointer up', () => {
      const { documentStore, renderPanel } = createSplitPreviewHarness();
      const { container } = renderPanel();

      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });
      fireEvent.pointerUp(canvas);

      const activePhase = documentStore.getState().project.phases[0];
      const globalKf = activePhase.directorCamera?.globalKeyframes;
      expect(globalKf).toBeDefined();
      expect(globalKf?.length).toBeGreaterThan(0);
      const latestKf = globalKf?.[globalKf.length - 1];
      expect(latestKf?.tilt).toBe(10);
      expect(latestKf?.yaw).toBe(110);
    });

    it('upserts action camera cue on Shift + pointer drag (pan mode)', () => {
      const { documentStore, renderPanel } = createSplitPreviewHarness();
      const { container } = renderPanel();

      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      fireEvent.pointerDown(canvas, {
        clientX: 100,
        clientY: 100,
        shiftKey: true,
        button: 0,
      });
      fireEvent.pointerMove(canvas, {
        clientX: 140,
        clientY: 80,
        shiftKey: true,
        button: 0,
      });
      fireEvent.pointerUp(canvas);

      const activePhase = documentStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
      expect(actionCues).toBeDefined();
      expect(actionCues?.length).toBeGreaterThan(0);
      const latestCue = actionCues?.[actionCues.length - 1];
      expect(latestCue?.panX).toBe(40);
      expect(latestCue?.panY).toBe(-20);
    });

    it('upserts action camera cue on canvas wheel event with updated zoom', () => {
      const { documentStore, renderPanel } = createSplitPreviewHarness();
      const { container } = renderPanel();

      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      fireEvent.wheel(canvas, { deltaY: -100 });

      const activePhase = documentStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
      expect(actionCues).toBeDefined();
      expect(actionCues?.length).toBeGreaterThan(0);
      const latestCue = actionCues?.[actionCues.length - 1];
      expect(latestCue?.zoom).toBe(1.15);
    });

    it('updates existing active cue on native container wheel event with preventDefault and activeCue.id', () => {
      const { documentStore, phaseId, renderPanel } =
        createSplitPreviewHarness();
      const { container } = renderPanel();

      act(() => {
        documentStore.getState().dispatch({
          type: 'UPSERT_ACTION_CAMERA_CUE',
          phaseId,
          startTimeMs: 0,
          patch: { zoom: 1.8, durationMs: 2000 },
          cueId: 'cue-test-1',
        });
      });

      const previewContainer = container.querySelector(
        '[data-testid="preview-container"]',
      );
      if (!previewContainer) throw new Error('Preview container not found');

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(wheelEvent, 'preventDefault');
      previewContainer.dispatchEvent(wheelEvent);

      expect(preventSpy).toHaveBeenCalled();

      const activePhase = documentStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
      const targetCue = actionCues?.find((c) => c.id === 'cue-test-1');
      expect(targetCue).toBeDefined();
      expect(targetCue?.zoom).toBe(1.95);
    });
  });
});
