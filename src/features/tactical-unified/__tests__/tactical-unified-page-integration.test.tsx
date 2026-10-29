import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalUnifiedPage } from '../tactical-unified-page';

// Konva & Canvas Mocks
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 800,
            height: 450,
            top: 0,
            left: 0,
            bottom: 450,
            right: 800,
            x: 0,
            y: 0,
            toJSON: () => {},
          },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  global.ResizeObserver = MockResizeObserver;

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
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

// FullTacticalCanvas の描画有無を判定するためスパイ/モック可能に確認
vi.mock('../views/FullTacticalCanvas', () => {
  return {
    FullTacticalCanvas: ({ ref }: { ref?: unknown }) => (
      <div data-testid="full-tactical-canvas" data-has-ref={Boolean(ref)} />
    ),
  };
});

describe('TacticalUnifiedPage Integration', () => {
  it('TacticalUnifiedPage がマウントされ、TopBar と FullTacticalCanvas が描画されること', async () => {
    render(<TacticalUnifiedPage />);

    expect(screen.getByRole('application')).toBeDefined();
    expect(screen.getByRole('button', { name: /Copy PNG/i })).toBeDefined();

    const canvasElement = await screen.findByTestId('full-tactical-canvas');
    expect(canvasElement).toBeDefined();
  });

  it('initialState で projectManagerModalOpen: true を確定注入した場合、モーダルが表示されること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: true,
          },
        }}
      />,
    );

    expect(screen.getByRole('application')).toBeDefined();
    // initialState の確定注入により projectManagerModal が開いていること
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('戦術プロジェクト管理')).toBeDefined();
  });
});
