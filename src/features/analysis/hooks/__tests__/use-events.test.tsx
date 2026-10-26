import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { eventKeys } from '@/lib/query-keys';
import type { FilterState } from '@/types';
import { useEvents } from '../use-events';

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

describe('useEvents', () => {
  it('uses eventKeys.filtered with matchId and filters', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const dummyFilters: FilterState = {
      selectedTeam: 'all',
      selectedPlayers: new Set<number>(),
      outcomeFilter: 'all',
      activeStrategies: new Set<string>(),
      activeStrategyParams: {},
      timelineSource: 'all',
    };

    const { result } = renderHook(() => useEvents('match-123', dummyFilters), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isQuerying).toBe(false));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(keys).toContainEqual(
      eventKeys.filtered({ ...dummyFilters, matchId: 'match-123' }),
    );
  });
});
