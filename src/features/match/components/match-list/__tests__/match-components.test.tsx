import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamsDropdown } from '@/components/layout/TeamsDropdown';
import type { Match } from '@/types';
import { FilterBar } from '../FilterBar';
import { MatchCard } from '../MatchCard';

const mockMatch: Match = {
  id: '12345',
  date: '2026-03-15T15:00:00Z',
  homeTeam: { id: 1, name: 'Arsenal' },
  awayTeam: { id: 2, name: 'Chelsea' },
  score: '2 : 1',
  matchType: 'club',
  playerIdNameDictionary: {},
  teams: {
    home: { teamId: 1, name: 'Arsenal', players: [] },
    away: { teamId: 2, name: 'Chelsea', players: [] },
  },
};

describe('Match Center Components (Phase 2)', () => {
  describe('MatchCard', () => {
    it('renders with L2 surface style and mono score', () => {
      render(<MatchCard match={mockMatch} isLatest />);

      // MatchCard container has L2 card class
      const card = screen.getByText('Arsenal').closest('a')?.firstElementChild;
      expect(card).toHaveClass('bg-[#18181B]');
      expect(card).toHaveClass('border-white/[0.07]');

      // Mono score font
      const score = screen.getByText('2 - 1');
      expect(score).toHaveClass('font-mono');

      // Full Time badge
      expect(screen.getByText('Full Time')).toBeInTheDocument();

      // Latest indicator
      expect(screen.getByText('Latest')).toBeInTheDocument();
    });
  });

  describe('FilterBar', () => {
    it('renders SearchInput and NativeSelect and handles interaction', () => {
      const handleTypeChange = vi.fn();
      const handleTeamChange = vi.fn();

      render(
        <FilterBar
          activeType="all"
          setActiveType={handleTypeChange}
          activeTeam={null}
          setActiveTeam={handleTeamChange}
          resultCount={10}
        />,
      );

      // NativeSelect for type
      const select = screen.getByRole('combobox', { name: /type/i });
      expect(select).toHaveClass('bg-[#18181B]');
      fireEvent.change(select, { target: { value: 'club' } });
      expect(handleTypeChange).toHaveBeenCalledWith('club');

      // SearchInput for team search
      const input = screen.getByPlaceholderText(/search team/i);
      expect(input).toHaveClass('bg-[#18181B]');
      fireEvent.change(input, { target: { value: 'Chelsea' } });
      expect(handleTeamChange).toHaveBeenCalledWith('Chelsea');

      // Quick filter button
      const chelseaBtn = screen.getByRole('button', { name: 'Chelsea' });
      fireEvent.click(chelseaBtn);
      expect(handleTeamChange).toHaveBeenCalledWith('Chelsea');
    });

    it('applies responsive width classes and flex-wrap to prevent horizontal overflow on small screens', () => {
      const { container } = render(
        <FilterBar
          activeType="all"
          setActiveType={vi.fn()}
          activeTeam={null}
          setActiveTeam={vi.fn()}
          resultCount={5}
        />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('flex-wrap');
      expect(root.className).toContain('min-w-0');
      const input = screen.getByPlaceholderText(/search team/i);
      const searchWrapper = input.parentElement?.parentElement;
      expect(searchWrapper?.className).toContain('min-w-0');
    });
  });

  describe('TeamsDropdown', () => {
    it('toggles dropdown and shows L3 surface popover', () => {
      render(<TeamsDropdown />);

      const button = screen.getByRole('button', { name: /teams/i });
      fireEvent.click(button);

      // Popover should be visible with L3 background
      const popover = screen
        .getByText('Club Teams')
        .closest('[class*="bg-[#222226]"]');
      expect(popover).toHaveClass('bg-[#222226]');
      expect(popover).toHaveClass('border-white/[0.08]');
    });
  });
});
