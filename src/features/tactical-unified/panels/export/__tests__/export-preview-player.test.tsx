import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import * as tacticalPhaseFrameRenderer from '@/lib/tactical/export/tactical-phase-frame-renderer';
import {
  createXBoundaryBox,
  type ScreenBackgroundConfig,
  SlideSchema,
} from '@/lib/types/tactical/slide';
import { ExportPreviewPlayer } from '../export-preview-player';

const mockSlide = SlideSchema.parse({
  id: 'slide-1',
  index: 0,
  transitionDurationMs: 1000,
  pauseMs: 500,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: 50, y: 50, visible: true },
});

describe('ExportPreviewPlayer Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      drawImage: vi.fn(),
      clip: vi.fn(),
      setLineDash: vi.fn(),
      getLineDash: vi.fn().mockReturnValue([]),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    );
  });

  it('toggles playback when Space key is pressed on window', async () => {
    render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalStoreProvider>,
    );

    const playBtn = screen.getByRole('button', { name: /play preview/i });
    expect(playBtn).toBeDefined();

    // Spaceキー押下 -> 再生開始 (Pauseボタンに変化)
    fireEvent.keyDown(window, { code: 'Space' });

    expect(
      screen.getByRole('button', { name: /pause preview/i }),
    ).toBeDefined();

    // 再度 Spaceキー押下 -> 一時停止 (Playボタンに変化)
    fireEvent.keyDown(window, { code: 'Space' });

    expect(screen.getByRole('button', { name: /play preview/i })).toBeDefined();
  });

  it('does not toggle playback when typing Space in input or textarea elements', async () => {
    render(
      <TacticalStoreProvider>
        <div>
          <input data-testid="test-input" type="text" />
          <textarea data-testid="test-textarea" />
          <ExportPreviewPlayer
            slides={[mockSlide]}
            aspectRatio="16:9"
            boundaryBox={null}
          />
        </div>
      </TacticalStoreProvider>,
    );

    const input = screen.getByTestId('test-input');
    const textarea = screen.getByTestId('test-textarea');

    // input 内でのスペースキー
    fireEvent.keyDown(input, { code: 'Space' });
    expect(screen.getByRole('button', { name: /play preview/i })).toBeDefined();

    // textarea 内でのスペースキー
    fireEvent.keyDown(textarea, { code: 'Space' });
    expect(screen.getByRole('button', { name: /play preview/i })).toBeDefined();
  });

  it('cleans up keydown event listener when unmounted', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalStoreProvider>,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
  });
});

describe('ExportPreviewPlayer Viewport & Boundary Crop Layout', () => {
  it('applies boundary aspect ratio and resolution to viewport and canvas', () => {
    const boundaryBox = {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
      visible: true,
      fitTarget: 'pitch' as const,
    };

    render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={boundaryBox}
        />
      </TacticalStoreProvider>,
    );

    const viewport = screen.getByTestId('export-preview-viewport');
    expect(viewport).toBeDefined();
    // 1920 * 0.5 = 960, 1080 * 0.5 = 540 -> 8px alignment gives 544
    expect(viewport.style.aspectRatio).toBe('960 / 544');

    const canvas = viewport.querySelector('canvas');
    expect(canvas).toBeDefined();
    expect(canvas?.width).toBe(960);
    expect(canvas?.height).toBe(544);
  });

  it('renders viewport with 4:5 aspect ratio (1080 / 1352) when 4:5 boundary preset is active', () => {
    const boundaryBox = createXBoundaryBox('4:5', '16:9');

    render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="4:5"
          boundaryBox={boundaryBox}
        />
      </TacticalStoreProvider>,
    );

    const viewport = screen.getByTestId('export-preview-viewport');
    expect(viewport).toBeDefined();
    expect(viewport.style.aspectRatio).toBe('1080 / 1352');

    const canvas = viewport.querySelector('canvas');
    expect(canvas).toBeDefined();
    expect(canvas?.width).toBe(1080);
    expect(canvas?.height).toBe(1352);
  });
});

describe('ExportPreviewPlayer ScreenBackground', () => {
  it('forwards screenBackground to renderTacticalPhaseFrameToCanvas', async () => {
    const renderSpy = vi.spyOn(
      tacticalPhaseFrameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );
    const screenBackground: ScreenBackgroundConfig = {
      type: 'cinematic',
    };

    await act(async () => {
      render(
        <TacticalStoreProvider>
          <ExportPreviewPlayer
            slides={[mockSlide]}
            aspectRatio="16:9"
            boundaryBox={null}
            screenBackground={screenBackground}
          />
        </TacticalStoreProvider>,
      );
    });

    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        screenBackground,
      }),
    );
  });
});
