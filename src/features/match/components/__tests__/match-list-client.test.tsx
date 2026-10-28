import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as useMatchListModule from '@/features/match/hooks/use-match-list';
import { MatchListClient } from '../match-list-client';

vi.mock('@/features/match/hooks/use-match-list', () => ({
  useMatchList: vi.fn(),
}));

describe('MatchListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders EmptyState with reset button when no matches match filters', () => {
    const setActiveTeam = vi.fn();
    vi.mocked(useMatchListModule.useMatchList).mockReturnValue({
      activeType: 'all',
      setActiveType: vi.fn(),
      activeTeam: 'Arsenal',
      setActiveTeam,
      idbMatches: [],
      sortedAndFiltered: [],
    } as any);

    const { container } = render(<MatchListClient matches={[]} />);
    expect(screen.getByText('No matches found matching filters')).toBeDefined();
    const resetBtn = screen.getByRole('button', { name: /Reset Filters/i });
    expect(resetBtn).toBeDefined();
    fireEvent.click(resetBtn);
    expect(setActiveTeam).toHaveBeenCalledWith(null);

    expect(container.innerHTML).not.toMatch(/\bslate-[a-z0-9]/);
    expect(container.innerHTML).not.toMatch(/\bzinc-[a-z0-9]/);
  });
});
