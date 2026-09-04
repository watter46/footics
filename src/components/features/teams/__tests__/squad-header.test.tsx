import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SquadHeader } from '../squad-header';

describe('SquadHeader Component', () => {
  it('renders team name and league with default blue accent', () => {
    const onSelectSeason = vi.fn();
    const onSyncSquad = vi.fn();
    const onOpenCopySeason = vi.fn();
    const onOpenTacticalCanvas = vi.fn();
    const onOpenAddPlayer = vi.fn();

    render(
      <SquadHeader
        teamName="Chelsea FC"
        leagueName="Premier League"
        accentColor="blue"
        selectedSeason="26-27"
        availableSeasons={['26-27', '25-26']}
        onSelectSeason={onSelectSeason}
        onSyncSquad={onSyncSquad}
        onOpenCopySeason={onOpenCopySeason}
        onOpenTacticalCanvas={onOpenTacticalCanvas}
        onOpenAddPlayer={onOpenAddPlayer}
      />,
    );

    expect(screen.getByText('Chelsea FC')).toBeDefined();
    expect(screen.getByText('Premier League')).toBeDefined();
    expect(screen.getByText('Tactical Board')).toBeDefined();
  });

  it('renders Arsenal with red accent and triggers actions', () => {
    const onOpenTacticalCanvas = vi.fn();
    const onSyncSquad = vi.fn();
    const onOpenCopySeason = vi.fn();
    const onOpenAddPlayer = vi.fn();

    render(
      <SquadHeader
        teamName="Arsenal FC"
        leagueName="Premier League"
        accentColor="red"
        selectedSeason="25-26"
        availableSeasons={['25-26', '24-25']}
        onSelectSeason={vi.fn()}
        onSyncSquad={onSyncSquad}
        onOpenCopySeason={onOpenCopySeason}
        onOpenTacticalCanvas={onOpenTacticalCanvas}
        onOpenAddPlayer={onOpenAddPlayer}
      />,
    );

    expect(screen.getByText('Arsenal FC')).toBeDefined();

    // Click Tactical Board button
    const tacticalBtn = screen.getByRole('button', { name: /tactical board/i });
    fireEvent.click(tacticalBtn);
    expect(onOpenTacticalCanvas).toHaveBeenCalledTimes(1);

    // Click Sync Squad button
    const syncBtn = screen.getByRole('button', { name: /sync squad/i });
    fireEvent.click(syncBtn);
    expect(onSyncSquad).toHaveBeenCalledTimes(1);

    // Click Copy Season button
    const copyBtn = screen.getByRole('button', {
      name: /他シーズンから引き継ぐ/i,
    });
    fireEvent.click(copyBtn);
    expect(onOpenCopySeason).toHaveBeenCalledTimes(1);

    // Click Add Player button
    const addPlayerBtn = screen.getByRole('button', { name: /add player/i });
    fireEvent.click(addPlayerBtn);
    expect(onOpenAddPlayer).toHaveBeenCalledTimes(1);
  });
});
