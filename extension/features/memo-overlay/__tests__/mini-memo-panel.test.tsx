import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendMessage } from 'webext-bridge/content-script';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { MiniMemoPanel } from '../components/mini-memo-panel';
import { useOverlayStore } from '../stores/use-overlay-store';

vi.mock('webext-bridge/content-script', () => ({
  sendMessage: vi.fn().mockResolvedValue({ success: true }),
}));

describe('MiniMemoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOverlayStore.getState().open({ mode: 'MATCH', matchId: 'm1' });
    useMemoOverlayStore.getState().reset('MATCH');
  });

  it('renders dashboard open button and sends OPEN_DASHBOARD on click', () => {
    render(<MiniMemoPanel />);

    const dashboardBtn = screen.getByTitle('Dashboard を開く');
    expect(dashboardBtn).toBeInTheDocument();

    fireEvent.click(dashboardBtn);

    expect(sendMessage).toHaveBeenCalledWith(
      'OPEN_DASHBOARD',
      {},
      'background',
    );
  });
});
