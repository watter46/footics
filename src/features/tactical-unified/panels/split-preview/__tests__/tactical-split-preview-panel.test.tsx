import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { SPLIT_TILT_PRESETS } from '../split-preview-camera-bar';
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

  it('renders camera bar with tilt presets, tilt slider, zoom badge, reset button', () => {
    const { getByLabelText, getByText, getByRole } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    // Header & Close
    expect(getByText('3D Camera Preview')).toBeDefined();
    expect(getByLabelText('Close 3D Split Preview')).toBeDefined();

    // Tilt Presets
    for (const preset of SPLIT_TILT_PRESETS) {
      expect(getByRole('button', { name: `${preset}°` })).toBeDefined();
    }

    // Slider
    const slider = getByLabelText('3D Tilt Angle Slider');
    expect(slider).toBeDefined();

    // Zoom badge
    expect(getByText('1.0x')).toBeDefined();

    // Reset button
    expect(getByLabelText('Reset 3D Camera')).toBeDefined();

    // Controls
    expect(getByLabelText('Play preview')).toBeDefined();
  });

  it('updates slide tilt when clicking a tilt preset button', () => {
    const { getByRole } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const preset25Btn = getByRole('button', { name: '25°' });
    fireEvent.click(preset25Btn);

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(25);
  });

  it('updates slide tilt when changing the tilt slider', () => {
    const { getByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const slider = getByLabelText('3D Tilt Angle Slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '30' } });

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(30);
  });

  it('updates panX and panY on canvas pointer drag', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeDefined();
    if (!canvas) throw new Error('Canvas not found');

    // Pointer drag
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 130 });
    fireEvent.pointerUp(canvas);

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.panX).toBe(50);
    expect(activeSlide.pitchTransform?.panY).toBe(30);
  });

  it('updates zoom on canvas wheel event within 0.5 to 2.5 bounds', () => {
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

    // Reset camera button
    const resetBtn = getByLabelText('Reset 3D Camera');
    fireEvent.click(resetBtn);

    activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.zoom).toBe(1);
    expect(activeSlide.pitchTransform?.panX).toBe(0);
    expect(activeSlide.pitchTransform?.panY).toBe(0);
    expect(activeSlide.pitchTransform?.tilt).toBe(0);
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
});
