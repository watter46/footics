import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
import { SquadDialogs } from '../squad-dialogs';

// Mock dialog components to avoid deeply nested radix-ui modals in this test
vi.mock('../AddPlayerDialog', () => ({
  AddPlayerDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-player-dialog">AddPlayerDialog</div> : null,
}));

vi.mock('../EditPlayerDialog', () => ({
  EditPlayerDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? (
      <div data-testid="edit-player-dialog">EditPlayerDialog</div>
    ) : null,
}));

vi.mock('../CopySeasonPlayersDialog', () => ({
  CopySeasonPlayersDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? (
      <div data-testid="copy-season-dialog">CopySeasonPlayersDialog</div>
    ) : null,
}));

const mockTeamConfig: SupportedTeam = {
  id: 'chelsea',
  name: 'Chelsea FC',
  shortName: 'Chelsea',
  league: 'Premier League',
  accentColor: '#034694',
};

describe('SquadDialogs', () => {
  it('renders dialogs only when their open flags are true', () => {
    const { rerender } = render(
      <SquadDialogs
        teamConfig={mockTeamConfig}
        selectedSeason="25-26"
        availableSeasons={['25-26', '24-25']}
        isAddPlayerOpen={false}
        onCloseAddPlayer={vi.fn()}
        isCopySeasonOpen={false}
        onCloseCopySeason={vi.fn()}
        editingPlayer={null}
        onCloseEditPlayer={vi.fn()}
        availableOfficialPlayers={[]}
        currentSeasonPlayerIds={new Set()}
        refetchSquad={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('add-player-dialog')).toBeNull();
    expect(screen.queryByTestId('edit-player-dialog')).toBeNull();
    expect(screen.queryByTestId('copy-season-dialog')).toBeNull();

    rerender(
      <SquadDialogs
        teamConfig={mockTeamConfig}
        selectedSeason="25-26"
        availableSeasons={['25-26', '24-25']}
        isAddPlayerOpen={true}
        onCloseAddPlayer={vi.fn()}
        isCopySeasonOpen={true}
        onCloseCopySeason={vi.fn()}
        editingPlayer={{
          playerId: 10,
          name: 'Cole Palmer',
          shirtNo: 20,
          position: 'MID',
          season: '25-26',
          teamName: 'Chelsea',
        }}
        onCloseEditPlayer={vi.fn()}
        availableOfficialPlayers={[]}
        currentSeasonPlayerIds={new Set()}
        refetchSquad={vi.fn()}
      />,
    );

    expect(screen.getByTestId('add-player-dialog')).toBeDefined();
    expect(screen.getByTestId('edit-player-dialog')).toBeDefined();
    expect(screen.getByTestId('copy-season-dialog')).toBeDefined();
  });
});
