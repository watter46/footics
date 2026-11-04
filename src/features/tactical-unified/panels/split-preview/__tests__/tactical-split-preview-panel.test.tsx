import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as playerPhotoRegistryHook from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import * as sharePayload from '@/lib/tactical/export/share-payload';
import * as frameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import { TacticalSplitPreviewPanel } from '../tactical-split-preview-panel';

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
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().stopPlayback();
  });

  it('renders full-bleed layout canvas with border-white/10 without header or footer controls', () => {
    const { container, queryByText, queryByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

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
    useTacticalUnifiedStore.getState().setAspectRatio('4:5');
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      aspectRatio: '4:5',
    });

    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);

    const containerDiv = canvas.parentElement;
    expect(containerDiv?.style.aspectRatio).toBe('1920 / 1080');
  });

  it('passes screenBackground from store to renderTacticalFrameToCanvas', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    useTacticalUnifiedStore.getState().updateScreenBackground({
      type: 'cinematic',
    });

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        screenBackground: {
          type: 'cinematic',
        },
      }),
    );
  });

  it('passes boundaryBox as null during stopped, and active boundaryBox during playback to useExportPreviewAnimation', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    const testBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
    };
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: testBox,
    });

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    // 停止時は境界線オーバーレイで編集するため、レンダラーには boundaryBox: null (16:9 全体) を渡す
    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        boundaryBox: null,
      }),
    );

    act(() => {
      useTacticalUnifiedStore.getState().togglePlayback();
    });

    // 再生時は境界線内のみをクロップ再生するため、レンダラーに boundaryBox を渡す
    expect(renderSpy).toHaveBeenLastCalledWith(
      expect.anything(),
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
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });

    // ドラッグ途中ではストアの pitchTransform はまだ更新されない
    const midSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(midSlide.pitchTransform?.tilt ?? 0).toBe(0);
    expect(midSlide.pitchTransform?.yaw ?? 90).toBe(90);

    // pointerUp で初めてストアへコミットされる
    fireEvent.pointerUp(canvas);

    const endSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(endSlide.pitchTransform?.tilt).toBe(10);
    expect(endSlide.pitchTransform?.yaw).toBe(110);
    expect(endSlide.pitchTransform?.panX ?? 0).toBe(0);
    expect(endSlide.pitchTransform?.panY ?? 0).toBe(0);
  });

  it('clamps tilt between 0 and 70, and normalizes yaw between 0 and 360', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    // Drag down (+dy) to try reducing tilt below 0
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 200, button: 0 });
    fireEvent.pointerUp(canvas);

    let activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(0);

    // Drag up huge amount (-dy) to try exceeding 70
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: -300, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(70);

    // Test yaw wrap-around
    useTacticalUnifiedStore
      .getState()
      .updatePitchTransform(activeSlide.id, { yaw: 90 });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: -200, clientY: 100, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.yaw).toBe(330);
  });

  it('updates panX and panY on Shift + pointer drag (pan mode)', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

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

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.panX).toBe(50);
    expect(activeSlide.pitchTransform?.panY).toBe(30);
    expect(activeSlide.pitchTransform?.tilt).toBe(0);
    expect(activeSlide.pitchTransform?.yaw).toBe(90);
  });

  it('updates zoom on canvas wheel event within 0.5 to 2.5 bounds', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    fireEvent.wheel(canvas, { deltaY: -200 });

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.zoom).toBe(1.3);
  });

  it('passes mvpMatrix as null when camera is at default front angle', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mvpMatrix: null,
      }),
    );

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    act(() => {
      useTacticalUnifiedStore.getState().updatePitchTransform(activeSlide.id, {
        tilt: 15,
        yaw: 75,
      });
    });

    expect(renderSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        mvpMatrix: expect.any(Float32Array),
      }),
    );
  });

  it('does not re-invoke preloadSlidePlayerPhotos during pointer dragging / camera updates', () => {
    const preloadSpy = vi
      .spyOn(sharePayload, 'preloadSlidePlayerPhotos')
      .mockResolvedValue({});

    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

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

  it('passes playerPhotos from usePlayerPhotoRegistry to renderTacticalFrameToCanvas', () => {
    const mockImage = {} as HTMLImageElement;
    vi.spyOn(playerPhotoRegistryHook, 'usePlayerPhotoRegistry').mockReturnValue(
      new Map([['p1', mockImage]]),
    );
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        playerPhotos: expect.objectContaining({ p1: mockImage }),
      }),
    );
  });

  it('renders boundary mask overlay and boundary box overlay handles when boundaryBox is enabled in edit mode', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { queryByTestId } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(queryByTestId('boundary-mask-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-box-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-corner-tl')).not.toBeNull();
    expect(queryByTestId('boundary-corner-br')).not.toBeNull();
  });

  it('does not render toggle crop preview button even when boundaryBox is active', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { queryByTestId } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(queryByTestId('toggle-crop-preview-btn')).toBeNull();
  });

  it('hides edit handles and boundary overlay during playback for cropped preview', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { queryByTestId } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    // 静止時: ハンドルとマスク両方存在
    expect(queryByTestId('boundary-box-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-mask-overlay')).not.toBeNull();

    act(() => {
      useTacticalUnifiedStore.getState().togglePlayback();
    });

    // 再生時は境界線内のみがクロップ表示され、編集枠と暗転マスクは非表示
    expect(queryByTestId('boundary-box-overlay')).toBeNull();
    expect(queryByTestId('boundary-corner-tl')).toBeNull();
    expect(queryByTestId('boundary-mask-overlay')).toBeNull();
  });

  it('updates active slide boundaryBox on 4-edge bar drag', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        enabled: true,
      },
    });

    const { getByTestId, container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

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

    const updated =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0]
        .boundaryBox;
    expect(updated?.x).toBe(20);
    expect(updated?.y).toBe(15);
    expect(updated?.width).toBe(50);
    expect(updated?.height).toBe(50);
  });

  it('allows pitch camera operation even when boundaryBox is active because boundary-box-frame is pointer-events-none', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    // Canvas上でドラッグ操作
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });
    fireEvent.pointerUp(canvas);

    const updatedSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(updatedSlide.pitchTransform?.tilt).toBe(10);
    expect(updatedSlide.pitchTransform?.yaw).toBe(110);
  });

  it('updates active slide boundaryBox width and height on corner handle drag', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        enabled: true,
      },
    });

    const { getByTestId, container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

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

    const brCorner = getByTestId('boundary-corner-br');
    fireEvent.pointerDown(brCorner, { clientX: 600, clientY: 600, button: 0 });
    fireEvent.pointerMove(brCorner, { clientX: 700, clientY: 750, button: 0 });
    fireEvent.pointerUp(brCorner);

    const updated =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0]
        .boundaryBox;
    expect(updated?.x).toBe(10);
    expect(updated?.y).toBe(10);
    expect(updated?.width).toBe(60);
    expect(updated?.height).toBe(65);
  });

  it('locks container aspect ratio to 16:9 when stopped and updates to boundaryBox aspect ratio during playback', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 50,
        enabled: true,
      },
    });

    const { getByTestId, container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    const previewContainer = getByTestId('preview-container');
    if (!canvas) throw new Error('Canvas not found');

    // 静止時: 16:9 full HD (1920x1080)
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(previewContainer.style.aspectRatio).toBe('1920 / 1080');

    act(() => {
      useTacticalUnifiedStore.getState().togglePlayback();
    });

    // 再生時はクロップ再生となり、境界線比率の解像度とアスペクト比に更新される
    expect(previewContainer.style.aspectRatio).not.toBe('1920 / 1080');
  });
});
