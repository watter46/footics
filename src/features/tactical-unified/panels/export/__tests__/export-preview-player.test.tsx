import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { SlideSchema } from '@/lib/types/tactical-unified';
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
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    );
  });

  it('toggles playback when Space key is pressed on window', async () => {
    render(
      <TacticalUnifiedStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalUnifiedStoreProvider>,
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
      <TacticalUnifiedStoreProvider>
        <div>
          <input data-testid="test-input" type="text" />
          <textarea data-testid="test-textarea" />
          <ExportPreviewPlayer
            slides={[mockSlide]}
            aspectRatio="16:9"
            boundaryBox={null}
          />
        </div>
      </TacticalUnifiedStoreProvider>,
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
      <TacticalUnifiedStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalUnifiedStoreProvider>,
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
      <TacticalUnifiedStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={boundaryBox}
        />
      </TacticalUnifiedStoreProvider>,
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
});
