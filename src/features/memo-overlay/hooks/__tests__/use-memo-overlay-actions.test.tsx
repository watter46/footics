import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbQueries from '@/lib/db/extension-db-queries';
import type { CustomEvent, MatchMemo } from '@/lib/db/schema';
import { customEventKeys, eventKeys, matchKeys } from '@/lib/query-keys';
import { useMemoOverlayActions } from '../use-memo-overlay-actions';

vi.mock('@/lib/db/extension-db-queries', () => ({
  saveCustomEvent: vi.fn().mockResolvedValue(undefined),
  putMatchMemo: vi.fn().mockResolvedValue(undefined),
}));

describe('useMemoOverlayActions', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('saveEvent', () => {
    it('saveCustomEvent を呼び出し、関連クエリを invalidate すること', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useMemoOverlayActions('match-123'), {
        wrapper: createWrapper(),
      });

      const eventPayload: CustomEvent = {
        id: 'evt-1',
        match_id: 'match-123',
        period: 1,
        minute: 10,
        second: 20,
        labels: ['Shot'],
        memo: 'Nice shot',
        created_at: 1000,
      };

      await result.current.saveEvent(eventPayload);

      expect(dbQueries.saveCustomEvent).toHaveBeenCalledWith(eventPayload);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customEventKeys.byMatch('match-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: eventKeys.all,
      });
    });

    it('event に match_id が未指定の場合は hook の引数 matchId を使用して invalidate すること', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(
        () => useMemoOverlayActions('hook-match-id'),
        {
          wrapper: createWrapper(),
        },
      );

      const eventPayload = {
        id: 'evt-2',
        period: 2,
        minute: 5,
        second: 0,
        labels: ['Goal'],
        created_at: 2000,
      } as CustomEvent;

      await result.current.saveEvent(eventPayload);

      expect(dbQueries.saveCustomEvent).toHaveBeenCalledWith(eventPayload);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customEventKeys.byMatch('hook-match-id'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: eventKeys.all,
      });
    });
  });

  describe('saveMemo', () => {
    it('putMatchMemo を呼び出し、matchKeys.memo を invalidate すること', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useMemoOverlayActions('match-123'), {
        wrapper: createWrapper(),
      });

      const memoPayload: MatchMemo = {
        matchId: 'match-123',
        memo: 'Half-time analysis',
        updatedAt: 3000,
      };

      await result.current.saveMemo(memoPayload);

      expect(dbQueries.putMatchMemo).toHaveBeenCalledWith(memoPayload);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: matchKeys.memo('match-123'),
      });
    });

    it('memo に matchId が未指定の場合は hook の引数 matchId を使用して invalidate すること', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(
        () => useMemoOverlayActions('hook-match-id'),
        {
          wrapper: createWrapper(),
        },
      );

      const memoPayload = {
        memo: 'General note',
        updatedAt: 4000,
      } as MatchMemo;

      await result.current.saveMemo(memoPayload);

      expect(dbQueries.putMatchMemo).toHaveBeenCalledWith(memoPayload);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: matchKeys.memo('hook-match-id'),
      });
    });
  });
});
