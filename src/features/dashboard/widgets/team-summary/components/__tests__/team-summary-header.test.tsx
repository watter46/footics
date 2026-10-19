import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Match } from '@/types';
import { TeamSummaryHeader } from '../team-summary-header';

const mockMetadata: Match = {
  id: 'match-123',
  date: '2026-10-19',
  score: '2 - 1',
  matchType: 'club',
  homeTeam: { id: 1, name: 'Arsenal' },
  awayTeam: { id: 2, name: 'Chelsea' },
  playerIdNameDictionary: {},
  teams: {
    home: {
      teamId: 1,
      name: 'Arsenal',
      players: [],
    },
    away: {
      teamId: 2,
      name: 'Chelsea',
      players: [],
    },
  },
};

describe('TeamSummaryHeader', () => {
  it('renders match metadata with team names and score', () => {
    render(
      <TeamSummaryHeader
        metadata={mockMetadata}
        activeFilterCount={0}
        onOpenSidebar={vi.fn()}
        onAddEvent={vi.fn()}
      />,
    );

    expect(screen.getByText('Arsenal')).toBeDefined();
    expect(screen.getByText('Chelsea')).toBeDefined();
    expect(screen.getByText('2 - 1')).toBeDefined();
  });

  it('handles sidebar open and add event button clicks', () => {
    const onOpenSidebar = vi.fn();
    const onAddEvent = vi.fn();

    render(
      <TeamSummaryHeader
        metadata={mockMetadata}
        activeFilterCount={0}
        onOpenSidebar={onOpenSidebar}
        onAddEvent={onAddEvent}
      />,
    );

    const filterButton = screen.getByRole('button', { name: /open filters/i });
    fireEvent.click(filterButton);
    expect(onOpenSidebar).toHaveBeenCalledTimes(1);

    const addEventButton = screen.getByRole('button', { name: /add event/i });
    fireEvent.click(addEventButton);
    expect(onAddEvent).toHaveBeenCalledTimes(1);
  });

  it('renders active filter count badge when filter count is greater than 0', () => {
    render(
      <TeamSummaryHeader
        metadata={mockMetadata}
        activeFilterCount={3}
        onOpenSidebar={vi.fn()}
        onAddEvent={vi.fn()}
      />,
    );

    expect(screen.getByText('3')).toBeDefined();
  });

  it('renders actionSlot when provided', () => {
    render(
      <TeamSummaryHeader
        metadata={mockMetadata}
        activeFilterCount={0}
        onOpenSidebar={vi.fn()}
        onAddEvent={vi.fn()}
        actionSlot={<button type="button">Custom Action Slot</button>}
      />,
    );

    expect(
      screen.getByRole('button', { name: /custom action slot/i }),
    ).toBeDefined();
  });
});
