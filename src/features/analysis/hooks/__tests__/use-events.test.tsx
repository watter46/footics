import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as db from '@/lib/db';
import { eventKeys } from '@/lib/query-keys';
import type { EventRow, FilterState } from '@/types';
import { useEvents } from '../use-events';

vi.mock('@/lib/db', () => ({
  getEventsByMatch: vi.fn(),
  getCustomEventsByMatch: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

const dummyFilters: FilterState = {
  selectedTeam: 'all',
  selectedPlayers: new Set<number>(),
  outcomeFilter: 'all',
  activeStrategies: new Set<string>(),
  activeStrategyParams: {},
  timelineSource: 'all',
};

const mockEvent = (id: number | string, teamId: number): EventRow => ({
  id,
  match_id: 'match-123',
  event_id: Number(id),
  team_id: teamId,
  player_id: null,
  period: 1,
  minute: 10,
  second: 0,
  expanded_minute: 10,
  x: 50,
  y: 50,
  end_x: null,
  end_y: null,
  type_value: 1,
  type_name: 'Pass',
  outcome: true,
  is_touch: true,
  is_shot: false,
  is_goal: false,
  qualifiers: [],
  source: 'whoscored',
});

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getEventsByMatch).mockResolvedValue([
      mockEvent(1, 10),
      mockEvent(2, 20),
    ]);
    vi.mocked(db.getCustomEventsByMatch).mockResolvedValue([]);
  });

  it('uses eventKeys.byMatch(matchId)', async () => {
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useEvents('match-123', dummyFilters), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isQuerying).toBe(false));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(keys).toContainEqual(eventKeys.byMatch('match-123'));
  });

  it('does not re-fetch from Dexie when filters change', async () => {
    const { Wrapper } = createWrapper();

    const { result, rerender } = renderHook(
      ({ filters }) => useEvents('match-123', filters),
      {
        wrapper: Wrapper,
        initialProps: { filters: dummyFilters },
      },
    );

    await waitFor(() => expect(result.current.isQuerying).toBe(false));
    expect(result.current.events).toHaveLength(2);
    expect(db.getEventsByMatch).toHaveBeenCalledTimes(1);

    // フィルタ変更 (teamId: 10のみに絞り込み)
    const newFilters: FilterState = {
      ...dummyFilters,
      selectedTeam: '10',
    };

    rerender({ filters: newFilters });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].team_id).toBe(10);
    // Dexie 再フェッチが発生しないこと
    expect(db.getEventsByMatch).toHaveBeenCalledTimes(1);
  });
});
