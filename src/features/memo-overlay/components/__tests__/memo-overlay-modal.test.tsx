import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbQueries from '@/lib/db/extension-db-queries';
import { useMemoOverlayStore } from '../../stores/memo-overlay-store';
import { MemoOverlayModal } from '../MemoOverlayModal';

// Mock DB queries
vi.mock('@/lib/db/extension-db-queries', () => ({
  saveCustomEvent: vi.fn().mockResolvedValue(undefined),
  putMatchMemo: vi.fn().mockResolvedValue(undefined),
}));

describe('MemoOverlayModal', () => {
  let queryClient: QueryClient;

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    useMemoOverlayStore.getState().reset('EVENT');
    useMemoOverlayStore.getState().setModalOpen(false);
    vi.clearAllMocks();
  });

  it('isModalOpen が false の場合は何も描画されないこと', () => {
    const { container } = renderWithClient(
      <MemoOverlayModal matchId="test-match" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('isModalOpen が true の場合にモーダルが描画されること', () => {
    useMemoOverlayStore.getState().setModalOpen(true);
    renderWithClient(<MemoOverlayModal matchId="test-match" />);

    expect(
      screen.getByRole('dialog', { hidden: true }) ||
        screen.getByText('イベント記録'),
    ).toBeDefined();
  });

  it('escape キー押下時に window.dispatchEvent を介さず直接 handleClose が実行されること', () => {
    useMemoOverlayStore.getState().setModalOpen(true);
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    renderWithClient(<MemoOverlayModal matchId="test-match" />);

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });

    // window.dispatchEvent は呼び出されないこと
    expect(dispatchSpy).not.toHaveBeenCalled();

    // モーダルが閉じられ、reset されていること
    expect(useMemoOverlayStore.getState().isModalOpen).toBe(false);

    dispatchSpy.mockRestore();
  });

  it('ctrl+enter キー押下時に window.dispatchEvent を介さず直接 handleSave が実行されること', async () => {
    useMemoOverlayStore.getState().setModalOpen(true);
    useMemoOverlayStore.getState().setTimeStr('10:00');
    useMemoOverlayStore.getState().forceSetPhase(1);
    useMemoOverlayStore.getState().addLabel('Shot');
    useMemoOverlayStore.getState().forceSetPhase(2);

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    renderWithClient(<MemoOverlayModal matchId="test-match" />);

    await act(async () => {
      fireEvent.keyDown(document, {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: true,
      });
    });

    // window.dispatchEvent は呼び出されないこと
    expect(dispatchSpy).not.toHaveBeenCalled();

    // saveCustomEvent が直接呼ばれていること
    expect(dbQueries.saveCustomEvent).toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });

  it('command+enter キー押下時にも直接 handleSave が実行されること', async () => {
    useMemoOverlayStore.getState().setModalOpen(true);
    useMemoOverlayStore.getState().setTimeStr('10:00');
    useMemoOverlayStore.getState().forceSetPhase(1);
    useMemoOverlayStore.getState().addLabel('Pass');
    useMemoOverlayStore.getState().forceSetPhase(2);

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    renderWithClient(<MemoOverlayModal matchId="test-match" />);

    await act(async () => {
      fireEvent.keyDown(document, {
        key: 'Enter',
        code: 'Enter',
        metaKey: true,
      });
    });

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(dbQueries.saveCustomEvent).toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });

  it('背景オーバーレイのクリックで handleClose が実行されること', () => {
    useMemoOverlayStore.getState().setModalOpen(true);
    const { container } = renderWithClient(
      <MemoOverlayModal matchId="test-match" />,
    );

    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(useMemoOverlayStore.getState().isModalOpen).toBe(false);
    }
  });

  it('initialMemo が渡された場合に MemoOverlayView に初期値が渡されること', () => {
    useMemoOverlayStore.getState().reset('MATCH');
    useMemoOverlayStore.getState().setModalOpen(true);

    renderWithClient(
      <MemoOverlayModal
        matchId="test-match"
        mode="MATCH"
        initialMemo="Initial match memo text"
      />,
    );

    expect(screen.getByDisplayValue('Initial match memo text')).toBeDefined();
  });

  it('グローバルストアの最新状態（timeStr, labels, memo等）が引き継がれ、入力値が正しく保存されること', async () => {
    // グローバルストアにイベント情報を事前に設定（例: ショートカット等で開いた場合）
    useMemoOverlayStore.getState().reset('EVENT');
    useMemoOverlayStore.getState().setTimeStr('25:10');
    useMemoOverlayStore.getState().setSelectedLabels(['Tackle']);
    useMemoOverlayStore.getState().setMemo('Initial note');
    useMemoOverlayStore.getState().setModalOpen(true);

    renderWithClient(<MemoOverlayModal matchId="test-match-2" />);

    // 画面上でメモを編集
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'Updated note from modal' },
    });

    // 保存を実行（Ctrl+Enter）
    await act(async () => {
      fireEvent.keyDown(document, {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: true,
      });
    });

    expect(dbQueries.saveCustomEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        match_id: 'test-match-2',
        minute: 25,
        second: 10,
        labels: ['Tackle'],
        memo: 'Updated note from modal',
      }),
    );
  });
});
