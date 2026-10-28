import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BasePlayer } from '@/types';
import { FlatPlayerBadges, PlayerBadgeGroup } from '../PlayerBadgeGroup';

const mockPlayers: BasePlayer[] = [
  { playerId: 1, name: 'Saka', position: 'FW', isFirstEleven: true },
  { playerId: 2, name: 'Odegaard', position: 'MC', isFirstEleven: true },
  { playerId: 3, name: 'Saliba', position: 'DC', isFirstEleven: true },
  { playerId: 4, name: 'Raya', position: 'GK', isFirstEleven: true },
];

describe('PlayerBadgeGroup', () => {
  it('renders players with PositionBadge and handles toggle click', () => {
    const onTogglePlayer = vi.fn();
    render(
      <PlayerBadgeGroup
        teamName="Arsenal"
        players={mockPlayers}
        colorClass="text-red-500"
        selectedPlayers={new Set([1])}
        onTogglePlayer={onTogglePlayer}
      />,
    );

    expect(screen.getByText('Arsenal')).toBeDefined();
    expect(screen.getByText('Saka')).toBeDefined();
    expect(screen.getByText('Odegaard')).toBeDefined();

    // クリックトグル
    fireEvent.click(screen.getByText('Saka'));
    expect(onTogglePlayer).toHaveBeenCalledWith(1);
  });

  it('renders flat badges with PositionBadge in FlatPlayerBadges', () => {
    const onTogglePlayer = vi.fn();
    render(
      <FlatPlayerBadges
        players={mockPlayers}
        selectedPlayers={new Set([2])}
        onTogglePlayer={onTogglePlayer}
      />,
    );

    expect(screen.getByText('Odegaard')).toBeDefined();
    fireEvent.click(screen.getByText('Odegaard'));
    expect(onTogglePlayer).toHaveBeenCalledWith(2);
  });
});
