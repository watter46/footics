import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMatch } from '@/lib/db';
import { useMatchMetadata } from '../use-match-metadata';

vi.mock('@/lib/db', () => ({
  getMatch: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useMatchMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('データフェッチ中は loading-data ステータスを返すこと', () => {
    vi.mocked(getMatch).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useMatchMetadata('match-123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe('loading-data');
    expect(result.current.metadata).toBeUndefined();
    expect(result.current.cacheMissing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('データ取得成功時に ready ステータスと metadata を返すこと', async () => {
    const mockMatch = {
      id: 'match-123',
      matchId: 'match-123',
      homeTeamName: 'Arsenal',
      awayTeamName: 'Chelsea',
    };
    vi.mocked(getMatch).mockResolvedValue(mockMatch as any);

    const { result } = renderHook(() => useMatchMetadata('match-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.status).toBe('ready');
    expect(result.current.metadata).toEqual(mockMatch);
    expect(result.current.cacheMissing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('メタデータが存在しない場合に error ステータスと cacheMissing: true を返すこと', async () => {
    vi.mocked(getMatch).mockResolvedValue(null);

    const { result } = renderHook(() => useMatchMetadata('missing-match'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.status).toBe('error');
    expect(result.current.metadata).toBeNull();
    expect(result.current.cacheMissing).toBe(true);
    expect(result.current.error).toBe('Metadata not found');
  });

  it('クエリエラー時に error ステータスとエラーメッセージを返すこと', async () => {
    vi.mocked(getMatch).mockRejectedValue(new Error('DB failure'));

    const { result } = renderHook(() => useMatchMetadata('err-match'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.status).toBe('error');
    expect(result.current.cacheMissing).toBe(true);
    expect(result.current.error).toBe('DB failure');
  });
});
