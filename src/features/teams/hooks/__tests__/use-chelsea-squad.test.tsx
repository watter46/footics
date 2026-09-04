import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { savePlayerMaster } from '@/lib/db/queries';
import { db } from '@/lib/db/schema';
import { useChelseaSquad } from '../use-chelsea-squad';

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

describe('useChelseaSquad', () => {
  beforeEach(async () => {
    await db.players.clear();
    await db.matches.clear();
  });

  it('fetches chelsea squad and normalizes positions', async () => {
    const { result } = renderHook(() => useChelseaSquad('26-27'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.chelseaPlayers.length).toBeGreaterThan(0);

    // ポジションが GK, DF, MID, FW, Other のいずれかに正規化されていること
    const validPositions = new Set(['GK', 'DF', 'MID', 'FW', 'Other']);
    result.current.chelseaPlayers.forEach((p) => {
      expect(validPositions.has(p.position)).toBe(true);
    });
  });

  it('deduplicates players with the same name, prioritizing positive WhoScored IDs', async () => {
    // プリセットにある Cole Palmer に対し、手動で同名の仮ID選手を登録
    await savePlayerMaster({
      playerId: -8888,
      name: 'Cole Palmer',
      defaultShirtNo: 20,
      position: 'MID',
      season: '26-27',
      teamName: 'Chelsea',
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => useChelseaSquad('26-27'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const palmerList = result.current.chelseaPlayers.filter(
      (p) => p.name.trim().toLowerCase() === 'cole palmer',
    );

    // 重複せず1人のみ存在すること
    expect(palmerList.length).toBe(1);
    // 正のWhoScored IDが優先されていること
    expect(palmerList[0].playerId).toBeGreaterThan(0);
    expect(palmerList[0].playerId).toBe(345014);
  });

  it('excludes players marked with isExcluded=true', async () => {
    // Robert Sanchez (ID: 345001 / 367683) を除外
    await savePlayerMaster({
      playerId: 345001,
      name: 'Robert Sánchez',
      season: '26-27',
      teamName: 'Chelsea',
      isExcluded: true,
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => useChelseaSquad('26-27'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const sanchez = result.current.chelseaPlayers.find(
      (p) => p.playerId === 345001,
    );
    expect(sanchez).toBeUndefined();
  });
});
