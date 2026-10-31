import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import * as sharePayload from '@/lib/tactical/export/share-payload';
import * as frameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import { SPLIT_CAMERA_PRESETS } from '../split-preview-camera-bar';
import { TacticalSplitPreviewPanel } from '../tactical-split-preview-panel';

describe('TacticalSplitPreviewPanel & SplitPreviewCameraBar', () => {
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

  it('renders camera bar with 6 camera presets, zoom badge, reset button', () => {
    const { getByLabelText, getByText, getByRole } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    // Header & Close
    expect(getByText('3D Camera Preview')).toBeDefined();
    expect(getByLabelText('Close 3D Split Preview')).toBeDefined();

    // 6 Camera Presets
    for (const preset of SPLIT_CAMERA_PRESETS) {
      expect(
        getByRole('button', {
          name: new RegExp(`${preset.tilt}°/${preset.yaw}°`),
        }),
      ).toBeDefined();
    }

    // Zoom badge
    expect(getByText('1.0x')).toBeDefined();

    // Reset button
    expect(getByLabelText('Reset 3D Camera')).toBeDefined();

    // Controls
    expect(getByLabelText('Play preview')).toBeDefined();
  });

  it('updates slide tilt and yaw when clicking a camera preset button', () => {
    const { getByRole } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    // Click '15°/75°' preset (shallow-right)
    const presetBtn = getByRole('button', { name: /15°\/75°/ });
    fireEvent.click(presetBtn);

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(15);
    expect(activeSlide.pitchTransform?.yaw).toBe(75);
  });

  it('updates tilt and yaw on normal left-drag (orbit mode)', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    // Drag up (-dy) and right (+dx): tilt should increase, yaw should increase
    // clientX: 100 -> 150 (dx = 50 -> yaw + 50*0.4 = 90 + 20 = 110)
    // clientY: 100 -> 60 (dy = -40 -> tilt + 40*0.25 = 0 + 10 = 10)
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });
    fireEvent.pointerUp(canvas);

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(10);
    expect(activeSlide.pitchTransform?.yaw).toBe(110);
    // pan should remain 0
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

    // Test yaw wrap-around (left drag huge amount to go negative)
    // current yaw is 90. left drag dx = -300 -> 90 + (-120) = -30 -> wrapped to 330
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

    // Shift + Pointer drag
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
    // tilt and yaw should remain untouched
    expect(activeSlide.pitchTransform?.tilt).toBe(0);
    expect(activeSlide.pitchTransform?.yaw).toBe(90);
  });

  it('updates zoom on canvas wheel event within 0.5 to 2.5 bounds and resets to default (tilt: 0, yaw: 90, zoom: 1, pan: 0,0)', () => {
    const { container, getByText, getByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    // Wheel zoom in (negative deltaY)
    fireEvent.wheel(canvas, { deltaY: -200 });

    let activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    // 1 - (-200 * 0.0015) = 1 + 0.3 = 1.3
    expect(activeSlide.pitchTransform?.zoom).toBe(1.3);
    expect(getByText('1.3x')).toBeDefined();

    // Also change tilt and yaw
    useTacticalUnifiedStore.getState().updatePitchTransform(activeSlide.id, {
      tilt: 35,
      yaw: 75,
      panX: 40,
      panY: 50,
    });

    // Reset camera button
    const resetBtn = getByLabelText('Reset 3D Camera');
    fireEvent.click(resetBtn);

    activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.zoom).toBe(1);
    expect(activeSlide.pitchTransform?.panX).toBe(0);
    expect(activeSlide.pitchTransform?.panY).toBe(0);
    expect(activeSlide.pitchTransform?.tilt).toBe(0);
    expect(activeSlide.pitchTransform?.yaw).toBe(90);
  });

  it('closes split preview when clicking close button in header', () => {
    useTacticalUnifiedStore.getState().setSplitPreviewOpen(true);
    expect(useTacticalUnifiedStore.getState().panels.splitPreviewOpen).toBe(
      true,
    );

    const { getByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const closeBtn = getByLabelText('Close 3D Split Preview');
    fireEvent.click(closeBtn);

    expect(useTacticalUnifiedStore.getState().panels.splitPreviewOpen).toBe(
      false,
    );
  });

  it('passes slide boundaryBox and uses split preview container classes (without modal max-h restriction)', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');

    const boundaryBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
    };
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox,
      aspectRatio: '4:5',
    });

    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');
    const containerDiv = canvas.parentElement;
    expect(containerDiv).toBeDefined();

    // Check full-size split container classes (aspect-[4/5] h-full max-h-full w-auto max-w-full)
    // and ensure modal max-h-[340px] is NOT present
    expect(containerDiv?.className).toContain('aspect-[4/5]');
    expect(containerDiv?.className).toContain('h-full');
    expect(containerDiv?.className).not.toContain('max-h-[340px]');

    // Check that boundaryBox and activeSlide's aspectRatio were passed to renderTacticalFrameToCanvas
    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        boundaryBox,
        aspectRatio: '4:5',
      }),
    );
  });

  it('renders canvas with Full HD resolution (1080x1350 for 4:5, 1920x1080 for 16:9)', () => {
    // 1. Default 4:5 Full HD (1080x1350)
    const { container, unmount } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1350);
    unmount();

    // 2. 16:9 Full HD (1920x1080)
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      aspectRatio: '16:9',
    });

    const { container: container169 } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas169 = container169.querySelector('canvas');
    if (!canvas169) throw new Error('Canvas not found');
    expect(canvas169.width).toBe(1920);
    expect(canvas169.height).toBe(1080);
  });

  it('passes mvpMatrix as null when camera is at default front angle (tilt: 0, yaw: 90, zoom: 1, pan: 0, 0)', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');

    const { getByRole } = render(
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

    // Now change tilt/yaw by preset
    const presetBtn = getByRole('button', { name: /15°\/75°/ });
    fireEvent.click(presetBtn);

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

    // Simulate multiple pointer drag moves (which trigger updatePitchTransform)
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 110, clientY: 90, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 80, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 130, clientY: 70, button: 0 });
    fireEvent.pointerUp(canvas);

    expect(preloadSpy).toHaveBeenCalledTimes(initialCallCount);
  });

  it('applies crop aspectRatio style to container when boundaryBox is active', () => {
    const boundaryBox = {
      x: 10,
      y: 10,
      width: 50,
      height: 80,
      enabled: true,
    };
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox,
      aspectRatio: '16:9',
    });

    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');
    const containerDiv = canvas.parentElement;

    // 1920 * 0.5 = 960, 1080 * 0.8 = 864 -> aspectRatio: '960 / 864'
    expect(containerDiv?.style.aspectRatio).toBe('960 / 864');
  });
});
