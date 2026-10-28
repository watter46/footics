import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as useNationalDashboardModule from '../../hooks/use-national-dashboard';
import NationalDashboard from '../NationalDashboard';

vi.mock('../../hooks/use-national-dashboard', () => ({
  useNationalDashboard: vi.fn(),
}));

vi.mock('@/features/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/features/analysis', () => ({
  EventTimeline: () => <div data-testid="timeline">Timeline</div>,
}));

describe('NationalDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with teams and score and no slate/zinc tokens', () => {
    vi.mocked(useNationalDashboardModule.useNationalDashboard).mockReturnValue({
      metadata: {
        id: 'nat-1',
        score: '2 - 1',
        teams: {
          home: { name: 'Japan' },
          away: { name: 'Spain' },
        },
      },
      filters: {
        selectedTeam: 'all',
        selectedPlayers: new Set<number>(),
        outcomeFilter: 'all',
        activeStrategies: new Set<string>(),
        activeStrategyParams: {},
        timelineSource: 'all',
      },
      events: [],
      handleTeamChange: vi.fn(),
      handlePlayerToggle: vi.fn(),
      handlePlayersClear: vi.fn(),
      handleOutcomeChange: vi.fn(),
      handleStrategyToggle: vi.fn(),
      handleStrategyParamChange: vi.fn(),
      handleTimelineSourceChange: vi.fn(),
      handleEditCustomEvent: vi.fn(),
      handleDeleteCustomEvent: vi.fn(),
    } as any);

    const { container } = render(
      <NationalDashboard
        matchId="nat-1"
        defaultHome="Japan"
        defaultAway="Spain"
        defaultScore="2 - 1"
      />,
    );

    expect(screen.getByText('Japan')).toBeDefined();
    expect(screen.getByText('Spain')).toBeDefined();
    expect(screen.getByText('2 - 1')).toBeDefined();

    expect(container.innerHTML).not.toMatch(/\bslate-[a-z0-9]/);
    expect(container.innerHTML).not.toMatch(/\bzinc-[a-z0-9]/);
  });
});
