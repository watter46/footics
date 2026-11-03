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
  });

  it('renders layout mode header, close button, and controls (without camera bar)', () => {
    const { getByLabelText, getByText, queryByText, queryByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    // Header & Close
    expect(getByText('🎬 Layout Mode')).toBeDefined();
    expect(getByLabelText('Close Layout Mode')).toBeDefined();

    // Camera Bar should NOT be rendered
    expect(queryByText('1.0x')).toBeNull();
    expect(queryByLabelText('Reset 3D Camera')).toBeNull();

    // Controls
    expect(getByLabelText('Play preview')).toBeDefined();
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

  it('syncs playing state with store isPlaying and togglePlayback', () => {
    const { getByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
    expect(getByLabelText('Play preview')).toBeDefined();

    // Clicking play button in preview controls triggers store's togglePlayback
    fireEvent.click(getByLabelText('Play preview'));
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    // When store isPlaying becomes true, controls show Pause button
    expect(getByLabelText('Pause preview')).toBeDefined();

    // Trigger togglePlayback again from store (e.g. Space key)
    useTacticalUnifiedStore.getState().togglePlayback();
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
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

  it('closes layout mode when clicking close button in header', () => {
    useTacticalUnifiedStore.getState().setWorkspaceMode('director');
    useTacticalUnifiedStore.getState().setSplitPreviewOpen(true);
    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');

    const { getByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const closeBtn = getByLabelText('Close Layout Mode');
    fireEvent.click(closeBtn);

    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');
    expect(useTacticalUnifiedStore.getState().panels.splitPreviewOpen).toBe(
      false,
    );
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
});
