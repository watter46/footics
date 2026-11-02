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
    expect(
      screen.queryByText(/Director Mode \(3D Camera Preview\)/),
    ).toBeNull();

    // 左右パネルが表示されている
    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByText('Formation')).toBeDefined();

    // TopBarCenter に「作図」と「演出」のセグメントコントロールが存在すること
    expect(screen.getByRole('radio', { name: /作図/ })).toBeDefined();
    expect(screen.getByRole('radio', { name: /演出/ })).toBeDefined();
    expect(
      screen.getByRole('radio', { name: /作図/ }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('TopBarCenter の「演出」をクリックすると Director モードに切り替わり、全画面演出ビューが表示され左右パネルが非表示になること', async () => {
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

    // 「演出」をクリック
    const directorRadio = screen.getByRole('radio', { name: /演出/ });
    fireEvent.click(directorRadio);

    // 演出ビューが全画面で表示される
    expect(
      await screen.findByText(/Director Mode \(3D Camera Preview\)/),
    ).toBeDefined();

    // 作図キャンバスは非表示になる
    expect(screen.queryByTestId('full-tactical-canvas')).toBeNull();

    // 左右パネルが非表示になる
    expect(screen.queryByLabelText('Tactical Phases')).toBeNull();
    expect(screen.queryByText('Formation')).toBeNull();
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

    // 「演出」をクリックして Director モードへ移行
    fireEvent.click(screen.getByRole('radio', { name: /演出/ }));
    expect(
      await screen.findByText(/Director Mode \(3D Camera Preview\)/),
    ).toBeDefined();

    // 演出ビューの閉じるボタンをクリック
    const closeBtn = screen.getByRole('button', {
      name: /Close.*Director|Close.*Preview/i,
    });
    fireEvent.click(closeBtn);

    // board モードに復帰し、キャンバスが再表示される
    expect(await screen.findByTestId('full-tactical-canvas')).toBeDefined();
    expect(
      screen.queryByText(/Director Mode \(3D Camera Preview\)/),
    ).toBeNull();

    // 左右パネルの状態が復元される
    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByText('Formation')).toBeDefined();

    // セグメントコントロールも「作図」が選択されている
    expect(
      screen.getByRole('radio', { name: /作図/ }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('TopBar の Director トグルボタンをクリックしてモード切り替えができること', async () => {
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

    // TopBar の Director ボタンを取得
    const directorToggleBtn = screen.getByRole('button', {
      name: /Toggle Director Mode/i,
    });
    expect(directorToggleBtn).toBeDefined();

    // クリックして Director モードへ
    fireEvent.click(directorToggleBtn);
    expect(
      await screen.findByText(/Director Mode \(3D Camera Preview\)/),
    ).toBeDefined();

    // 再度クリックして board モードへ
    fireEvent.click(directorToggleBtn);
    expect(await screen.findByTestId('full-tactical-canvas')).toBeDefined();
  });
});
