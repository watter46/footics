import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
import { SquadEmptyState } from '../squad-empty-state';

const mockTeamConfig: SupportedTeam = {
  id: 'chelsea',
  name: 'Chelsea FC',
  shortName: 'Chelsea',
  league: 'Premier League',
  accentColor: '#034694',
};

describe('SquadEmptyState', () => {
  it('renders appropriate message for different id filters', () => {
    const { rerender } = render(
      <SquadEmptyState
        idFilter="all"
        selectedSeason="25-26"
        teamConfig={mockTeamConfig}
        onSyncSquad={vi.fn()}
        onOpenCopySeason={vi.fn()}
        onOpenAddPlayer={vi.fn()}
      />,
    );
    expect(screen.getByText('No players found for Season 25-26')).toBeDefined();

    rerender(
      <SquadEmptyState
        idFilter="manual"
        selectedSeason="25-26"
        teamConfig={mockTeamConfig}
        onSyncSquad={vi.fn()}
        onOpenCopySeason={vi.fn()}
        onOpenAddPlayer={vi.fn()}
      />,
    );
    expect(screen.getByText('該当する選手がいません')).toBeDefined();
    expect(
      screen.getByText(/このシーズンにはID未登録（手動）の選手はいません/),
    ).toBeDefined();
  });

  it('triggers action buttons', () => {
    const handleSync = vi.fn();
    const handleCopy = vi.fn();
    const handleAdd = vi.fn();

    render(
      <SquadEmptyState
        idFilter="all"
        selectedSeason="25-26"
        teamConfig={mockTeamConfig}
        onSyncSquad={handleSync}
        onOpenCopySeason={handleCopy}
        onOpenAddPlayer={handleAdd}
      />,
    );

    fireEvent.click(screen.getByText('Sync Squad'));
    expect(handleSync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('他シーズンから引き継ぐ'));
    expect(handleCopy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Add Player'));
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
