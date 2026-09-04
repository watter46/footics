import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { savePlayerMaster } from '@/lib/db/queries';
import { db } from '@/lib/db/schema';
import { useTeamSquad } from '../use-team-squad';

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
  return Wrapper;
};

describe('useTeamSquad', () => {
  beforeEach(async () => {
    await db.players.clear();
    await db.matches.clear();
  });

  it('fetches team squad for chelsea and normalizes positions', async () => {
    const { result } = renderHook(
      () => useTeamSquad({ teamId: 'chelsea', season: '26-27' }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teamPlayers.length).toBeGreaterThan(0);

    const validPositions = new Set(['GK', 'DF', 'MID', 'FW', 'Other']);
    result.current.teamPlayers.forEach((p) => {
      expect(validPositions.has(p.position)).toBe(true);
    });
  });

  it('fetches empty or manual squad for other clubs like arsenal', async () => {
    // アーセナル選手を手動追加
    await savePlayerMaster({
      playerId: -101,
      name: 'Bukayo Saka',
      defaultShirtNo: 7,
      position: 'FW',
      season: '26-27',
      teamName: 'Arsenal',
      updatedAt: Date.now(),
    });

    const { result } = renderHook(
      () => useTeamSquad({ teamId: 'arsenal', season: '26-27' }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teamPlayers.length).toBe(1);
    expect(result.current.teamPlayers[0].name).toBe('Bukayo Saka');
    expect(result.current.teamConfig.name).toBe('Arsenal FC');
  });

  it('deduplicates players with the same name, prioritizing positive WhoScored IDs', async () => {
    await savePlayerMaster({
      playerId: -8888,
      name: 'Cole Palmer',
      defaultShirtNo: 20,
      position: 'MID',
      season: '26-27',
      teamName: 'Chelsea',
      updatedAt: Date.now(),
    });

    const { result } = renderHook(
      () => useTeamSquad({ teamId: 'chelsea', season: '26-27' }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const palmerList = result.current.teamPlayers.filter(
      (p) => p.name.trim().toLowerCase() === 'cole palmer',
    );

    expect(palmerList.length).toBe(1);
    expect(palmerList[0].playerId).toBeGreaterThan(0);
    expect(palmerList[0].playerId).toBe(345014);
  });
});
