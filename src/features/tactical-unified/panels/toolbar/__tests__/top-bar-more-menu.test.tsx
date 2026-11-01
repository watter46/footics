import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import * as matchHelper from '@/lib/db/tactical-match-helper';
import * as matchBridge from '@/lib/tactical/match-to-tactical-bridge';
import * as tacticalStorage from '@/lib/tactical/tactical-storage';
import type { Match } from '@/types';
import { TopBarMoreMenu } from '../top-bar-more-menu';

const mockUseSearchParams = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

describe('TopBarMoreMenu component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(null);
    window.confirm = vi.fn(() => true);
  });

  it('toggles menu open and closed', () => {
    render(<TopBarMoreMenu />);

    const moreBtn = screen.getByRole('button', { name: 'More actions' });
    expect(screen.queryByText('Project')).toBeNull();

    fireEvent.click(moreBtn);
    expect(screen.getByText('Project')).toBeDefined();
    expect(screen.getByText('New Project')).toBeDefined();
    expect(screen.getByText('Import Background Image')).toBeDefined();
    expect(screen.getByText('Clear Background Image')).toBeDefined();
    expect(screen.getByText('Benchmark Presets')).toBeDefined();

    // Verify "Swap Sides" was removed as it moved to TopBarCenter
    expect(screen.queryByText('Swap Sides')).toBeNull();
  });

  it('URL に matchId がない場合、New Project 押下時は injectMatchToTactical を呼ばず resetProject と clearActiveProjectFromDb(null) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(''));
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const injectSpy = vi.spyOn(matchBridge, 'injectMatchToTactical');

    // プロジェクトに前回の matchId が残っている場合でも、URL に matchId がなければ単独リセット
    useTacticalUnifiedStore.getState().project.matchId = 'previous-match-id';

    render(<TopBarMoreMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith(null);
    });
    expect(injectSpy).not.toHaveBeenCalled();
    expect(useTacticalUnifiedStore.getState().project.matchId).toBeUndefined();
  });

  it('URL に matchId がある場合、New Project 押下時は当該試合の0分として injectMatchToTactical を呼び clearActiveProjectFromDb(matchId) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('matchId=10'));
    const mockMatch = {
      id: '10',
      homeTeam: { name: 'Home' },
      awayTeam: { name: 'Away' },
    } as unknown as Match;
    vi.spyOn(matchHelper, 'getMatchForTacticalProject').mockResolvedValue(
      mockMatch,
    );
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const injectSpy = vi.spyOn(matchBridge, 'injectMatchToTactical');

    render(<TopBarMoreMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith('10');
    });
    expect(injectSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        match: mockMatch,
        minute: 0,
        storeApi: expect.anything(),
      }),
    );
  });
});
