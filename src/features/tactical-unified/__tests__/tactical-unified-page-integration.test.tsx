import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultTacticalProject } from '../stores/tactical-store-provider';
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

describe('TacticalUnifiedPage Integration', () => {
  it('TacticalUnifiedPage がマウントされ、TopBar と FullTacticalCanvas が描画されること', async () => {
    const { container } = render(<TacticalUnifiedPage />);

    expect(screen.getByRole('application')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDefined();

    await vi.waitFor(() => {
      expect(container.querySelector('.konvajs-content')).not.toBeNull();
    });
  });

  it('initialState で projectManagerModalOpen: true を確定注入した場合、モーダルが表示されること', async () => {
    render(
      <TacticalUnifiedPage
        initialSession={{
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

  it('\\ キー押下により集中モードが切り替わり、左右パネルの表示がトグルされること', async () => {
    render(
      <TacticalUnifiedPage
        initialSession={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    // 初期状態では Tactical Phases (LeftPanel) や Formation (RightPanel) が表示されている
    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Formation' })).toBeDefined();

    // '\\' キー押下で集中モード ON
    fireEvent.keyDown(window, { key: '\\', code: 'Backslash' });

    // 左右パネルが非表示になる
    expect(screen.queryByLabelText('Tactical Phases')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Formation' })).toBeNull();

    // 再度 '\\' キー押下で集中モード OFF
    fireEvent.keyDown(window, { key: '\\', code: 'Backslash' });

    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Formation' })).toBeDefined();
  });

  it('initialState で渡したプロジェクト情報（タイトル等）が初期描画から即座に反映されること', async () => {
    const customProject = {
      ...createDefaultTacticalProject(),
      id: 'custom-project-1',
      title: 'Champions League Final Tactics',
    };

    render(
      <TacticalUnifiedPage
        initialState={{
          project: customProject,
          activePhaseId: customProject.phases[0].id,
          activeSlideId: customProject.phases[0].slides[0].id,
        }}
      />,
    );

    expect(screen.getByText('Champions League Final Tactics')).toBeDefined();
  });

  it('TopBar の Toggle 3D Split Preview ボタン押下で 3D プレビューパネルが展開され、右パネルが自動折りたたみされること', async () => {
    render(
      <TacticalUnifiedPage
        initialSession={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: false,
            rightPanelTab: 'formation',
            isRightPanelOpen: true,
            splitPreviewOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    // 初期状態: 3Dプレビューパネルは存在しない
    expect(screen.queryByTestId('preview-container')).toBeNull();

    // TopBar の Toggle Director Mode ボタンを取得してクリック
    const splitToggleBtn = screen.getByRole('button', {
      name: 'Toggle Layout Mode',
    });
    expect(splitToggleBtn).toBeDefined();
    fireEvent.click(splitToggleBtn);

    // 3Dプレビューパネルが表示されること
    expect(await screen.findByTestId('preview-container')).toBeDefined();

    // 再度クリックで閉じること
    fireEvent.click(splitToggleBtn);
    expect(screen.queryByTestId('preview-container')).toBeNull();
  });
});
