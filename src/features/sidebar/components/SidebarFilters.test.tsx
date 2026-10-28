import '@testing-library/jest-dom/vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FilterState, Match } from '@/types';
import { Sidebar } from './MainSidebar';
import { OutcomeFilter } from './OutcomeFilter';
import { StrategyFilter } from './StrategyFilter';
import { TeamFilter } from './TeamFilter';
import { TimelineSourceFilter } from './TimelineSourceFilter';

const mockMetadata: Match = {
  id: 'match-1',
  date: '2026-10-28',
  score: '2-1',
  matchType: 'club',
  homeTeam: { id: 1, name: 'Arsenal' },
  awayTeam: { id: 2, name: 'Chelsea' },
  playerIdNameDictionary: { '101': 'Saka', '201': 'Palmer' },
  teams: {
    home: {
      teamId: 1,
      name: 'Arsenal',
      players: [
        { playerId: 101, name: 'Saka', position: 'FW', isFirstEleven: true },
      ],
    },
    away: {
      teamId: 2,
      name: 'Chelsea',
      players: [
        { playerId: 201, name: 'Palmer', position: 'MF', isFirstEleven: true },
      ],
    },
  },
};

const mockFilters: FilterState = {
  selectedTeam: 'all',
  selectedPlayers: new Set<number>(),
  outcomeFilter: 'all',
  activeStrategies: new Set<string>(['progressive-pass']),
  activeStrategyParams: {},
  timelineSource: 'all',
};

describe('Sidebar Design System Migration', () => {
  it('renders Sidebar with updated styling tokens and no slate/zinc classes', () => {
    const onClose = vi.fn();
    render(
      <Sidebar
        metadata={mockMetadata}
        filters={mockFilters}
        onTeamChange={vi.fn()}
        onPlayerToggle={vi.fn()}
        onPlayersClear={vi.fn()}
        onOutcomeChange={vi.fn()}
        onStrategyToggle={vi.fn()}
        onStrategyParamChange={vi.fn()}
        onTimelineSourceChange={vi.fn()}
        isOpenOnMobile={true}
        onClose={onClose}
      />,
    );

    // Verify close button triggers onClose
    const closeBtns = screen.getAllByRole('button', { name: /Close Filters/i });
    expect(closeBtns.length).toBeGreaterThan(0);
    fireEvent.click(closeBtns[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders TimelineSourceFilter with SegmentedControl', () => {
    const onChange = vi.fn();
    render(<TimelineSourceFilter timelineSource="all" onChange={onChange} />);

    // Should have 3 options
    expect(screen.getByText('All Events')).toBeInTheDocument();
    expect(screen.getByText('My Memos')).toBeInTheDocument();
    expect(screen.getByText('WhoScored')).toBeInTheDocument();

    fireEvent.click(screen.getByText('My Memos'));
    expect(onChange).toHaveBeenCalledWith('custom');
  });

  it('renders OutcomeFilter with FilterPills', () => {
    const onChange = vi.fn();
    render(<OutcomeFilter outcomeFilter="all" onChange={onChange} />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Fail')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Success'));
    expect(onChange).toHaveBeenCalledWith('success');
  });

  it('has zero occurrences of slate-* and zinc-* in sidebar component files', () => {
    const componentFiles = [
      'MainSidebar.tsx',
      'TeamFilter.tsx',
      'TimelineSourceFilter.tsx',
      'OutcomeFilter.tsx',
      'StrategyFilter.tsx',
    ];

    const currentDir = path.resolve(__dirname);
    for (const file of componentFiles) {
      const content = fs.readFileSync(path.join(currentDir, file), 'utf-8');
      const slateMatches = content.match(/slate-[a-z0-9/-]+/g) || [];
      const zincMatches = content.match(/zinc-[a-z0-9/-]+/g) || [];
      expect(
        slateMatches,
        `File ${file} contains slate classes: ${slateMatches.join(', ')}`,
      ).toEqual([]);
      expect(
        zincMatches,
        `File ${file} contains zinc classes: ${zincMatches.join(', ')}`,
      ).toEqual([]);
    }
  });
});
