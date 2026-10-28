import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as useMatchDetailModule from '@/features/match/hooks/use-match-detail';
import { MatchViewWrapper } from '../match-view-wrapper';

vi.mock('@/features/match/hooks/use-match-detail', () => ({
  useMatchDetail: vi.fn(),
}));

vi.mock('@/features/dashboard/components/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>,
}));

vi.mock('@/features/national-dashboard/components/NationalDashboard', () => ({
  default: () => <div data-testid="national-dashboard">NationalDashboard</div>,
}));

describe('MatchViewWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PageLoading when isLoading is true', () => {
    vi.mocked(useMatchDetailModule.useMatchDetail).mockReturnValue({
      match: null,
      isLoading: true,
      recordRecentMatch: vi.fn(),
    } as any);

    const { container } = render(<MatchViewWrapper matchId="match-123" />);
    expect(
      screen.getByText('Loading match data from IndexedDB...'),
    ).toBeDefined();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');
  });

  it('renders ErrorState when matchData is null and not loading', () => {
    vi.mocked(useMatchDetailModule.useMatchDetail).mockReturnValue({
      match: null,
      isLoading: false,
      recordRecentMatch: vi.fn(),
    } as any);

    const { container } = render(<MatchViewWrapper matchId="match-123" />);
    expect(screen.getByText('Data Not Found')).toBeDefined();
    expect(screen.getByText('Back to Match List')).toBeDefined();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');
  });
});
