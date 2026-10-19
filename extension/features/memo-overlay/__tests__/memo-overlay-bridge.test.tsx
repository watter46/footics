import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { MemoOverlayBridge } from '../memo-overlay-bridge';
import { useOverlayStore } from '../stores/use-overlay-store';

vi.mock('webext-bridge/content-script', () => ({
  sendMessage: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../hooks/use-match-memo-loader', () => ({
  useMatchMemoLoader: vi.fn(({ initialMemo }) => initialMemo ?? 'Loaded Memo'),
}));

vi.mock('../hooks/use-memo-save', () => ({
  useMemoSave: vi.fn(() => ({ handleSave: vi.fn() })),
}));

describe('MemoOverlayBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOverlayStore.getState().close();
    useMemoOverlayStore.getState().reset('EVENT');
  });

  it('isVisible が false の場合は何も描画されないこと', () => {
    const { container } = render(<MemoOverlayBridge />);
    expect(container.firstChild).toBeNull();
  });

  it('isVisible が true の場合に MemoOverlayStoreProvider と MemoOverlayView が描画されること', () => {
    useOverlayStore.getState().open({
      mode: 'EVENT',
      matchId: 'm1',
      initialData: {
        id: 'event-1',
        period: 2,
        minute: 15,
        second: 30,
        labels: ['Shot'],
        memo: 'Nice shot',
      },
    });

    render(<MemoOverlayBridge />);

    // MemoOverlayView が描画されていること
    expect(screen.getByText('Event')).toBeInTheDocument();
    // QuickTagBar が表示されること（mode === 'EVENT'）
    expect(screen.getByText('ビルドアップ')).toBeInTheDocument();
  });

  it('MATCH モードの初期メモが確定注入されること', () => {
    useOverlayStore.getState().open({
      mode: 'MATCH',
      matchId: 'm2',
      initialData: {
        memo: 'Tactical analysis note',
      },
    });

    render(<MemoOverlayBridge />);

    expect(
      screen.getByDisplayValue('Tactical analysis note'),
    ).toBeInTheDocument();
  });

  it('MemoOverlayStoreProvider によりシングルトン store を汚染せず初期化されること', () => {
    useMemoOverlayStore.getState().reset('MATCH');
    useMemoOverlayStore.getState().setMemo('Global Singleton Memo');

    useOverlayStore.getState().open({
      mode: 'MATCH',
      matchId: 'm3',
      initialData: {
        memo: 'Isolated Provider Memo',
      },
    });

    render(<MemoOverlayBridge />);

    expect(
      screen.getByDisplayValue('Isolated Provider Memo'),
    ).toBeInTheDocument();
    expect(useMemoOverlayStore.getState().memo).toBe('Global Singleton Memo');
  });
});
