import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalUnifiedPage } from '../tactical-unified-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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

// FullTacticalCanvas のモック
vi.mock('../views/FullTacticalCanvas', () => {
  return {
    FullTacticalCanvas: ({ ref }: { ref?: unknown }) => (
      <div data-testid="full-tactical-canvas" data-has-ref={Boolean(ref)} />
    ),
  };
});

describe('tactical-unified-page modes (Board <-> Director)', () => {
  it('初期状態（board モード）で作図キャンバスと左右パネルが表示され、演出ビューは非表示であること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          workspaceMode: 'board',
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: true,
            splitPreviewOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    // 作図キャンバスが表示されている
    expect(await screen.findByTestId('full-tactical-canvas')).toBeDefined();

    // 演出ビューは非表示
    expect(screen.queryByText(/Layout Mode/)).toBeNull();

    // 左右パネルが表示されている
    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByText('Formation')).toBeDefined();

    // TopBarCenter に「Toggle Layout Mode」ボタンが存在すること
    expect(
      screen.getByRole('button', { name: 'Toggle Layout Mode' }),
    ).toBeDefined();
  });

  it('TopBarCenter の「Toggle Layout Mode」をクリックすると Director モードに切り替わり、演出ビューと右パネルが表示され左パネルが非表示になること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          workspaceMode: 'board',
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: true,
            splitPreviewOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    // 「Toggle Layout Mode」をクリック
    const layoutModeBtn = screen.getByRole('button', {
      name: 'Toggle Layout Mode',
    });
    fireEvent.click(layoutModeBtn);

    // 演出ビューが表示される
    expect(await screen.findByText(/Layout Mode/)).toBeDefined();

    // 作図キャンバスは非表示になる
    expect(screen.queryByTestId('full-tactical-canvas')).toBeNull();

    // 左パネルは非表示になるが、右パネルは表示維持される
    expect(screen.queryByLabelText('Tactical Phases')).toBeNull();
    expect(screen.getByText('Camera')).toBeDefined();
  });

  it('Director モード時に閉じるボタン（X）をクリックすると board モードに復帰し、左右パネルの状態が復元されること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          workspaceMode: 'board',
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: true,
            splitPreviewOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    // 「Toggle Layout Mode」をクリックして Director モードへ移行
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Layout Mode' }));
    expect(await screen.findByText(/Layout Mode/)).toBeDefined();

    // 演出ビューの閉じるボタンをクリック
    const closeBtn = screen.getByRole('button', {
      name: /Close.*Layout|Close.*Preview/i,
    });
    fireEvent.click(closeBtn);

    // board モードに復帰し、キャンバスが再表示される
    expect(await screen.findByTestId('full-tactical-canvas')).toBeDefined();
    expect(screen.queryByText(/Layout Mode/)).toBeNull();

    // 左右パネルの状態が復元される
    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByText('Formation')).toBeDefined();
  });

  it('TopBarCenter の Layout トグルボタンを連続クリックしてモード切り替えができること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          workspaceMode: 'board',
          panels: {
            sidebarOpen: false,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
            splitPreviewOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    // TopBarCenter の Toggle Layout Mode ボタンを取得
    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle Layout Mode',
    });
    expect(toggleBtn).toBeDefined();

    // クリックして Director モードへ
    fireEvent.click(toggleBtn);
    expect(await screen.findByText(/Layout Mode/)).toBeDefined();

    // 再度クリックして board モードへ
    fireEvent.click(toggleBtn);
    expect(await screen.findByTestId('full-tactical-canvas')).toBeDefined();
  });
});
