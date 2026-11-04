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
    expect(containerDiv?.className).toContain('aspect-video');
    expect(containerDiv?.className).toContain('w-full');
    expect(containerDiv?.className).toContain('max-h-full');
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

  it('always passes boundaryBox as null to useExportPreviewAnimation', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
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

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        boundaryBox: null,
      }),
    );
  });

  it('updates tilt and yaw on normal left-drag (orbit mode)', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });
    fireEvent.pointerUp(canvas);

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(10);
    expect(activeSlide.pitchTransform?.yaw).toBe(110);
    expect(activeSlide.pitchTransform?.panX ?? 0).toBe(0);
    expect(activeSlide.pitchTransform?.panY ?? 0).toBe(0);
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

  it('toggles cropped preview mode on button click and passes boundaryBox to renderer', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
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

    const { getByTestId, queryByTestId } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(renderSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        boundaryBox: null,
      }),
    );

    const toggleBtn = getByTestId('toggle-crop-preview-btn');
    fireEvent.click(toggleBtn);

    expect(renderSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        boundaryBox: expect.objectContaining({
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          enabled: true,
        }),
      }),
    );

    expect(queryByTestId('boundary-mask-overlay')).toBeNull();
    expect(queryByTestId('boundary-box-overlay')).toBeNull();
  });

  it('automatically switches to cropped preview when playing', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
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

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    act(() => {
      useTacticalUnifiedStore.getState().togglePlayback();
    });

    expect(renderSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        boundaryBox: expect.objectContaining({
          enabled: true,
        }),
      }),
    );
  });

  it('updates active slide boundaryBox on overlay frame drag', () => {
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

    const dragHandle = getByTestId('boundary-box-drag-handle');
    fireEvent.pointerDown(dragHandle, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(dragHandle, {
      clientX: 200,
      clientY: 150,
      button: 0,
    });
    fireEvent.pointerUp(dragHandle);

    const updated =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0]
        .boundaryBox;
    expect(updated?.x).toBe(20);
    expect(updated?.y).toBe(15);
    expect(updated?.width).toBe(50);
    expect(updated?.height).toBe(50);
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
});
