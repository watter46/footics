import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { generatePlayerMasterId } from '@/lib/db/queries';
import { db } from '@/lib/db/schema';
import {
  usePlayerMaster,
  usePlayerMasterMutations,
  usePlayersMasterBatch,
  useSeasonPlayers,
} from '../use-player-master';

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

describe('usePlayerMaster & usePlayersMasterBatch & useSeasonPlayers', () => {
  beforeEach(async () => {
    await db.players.clear();
    await db.player_photos.clear();
  });

  it('fetches player master and saves photo via mutation', async () => {
    await db.players.put({
      id: generatePlayerMasterId('26-27', 100),
      playerId: 100,
      season: '26-27',
      name: 'Kaoru Mitoma',
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlayerMaster(100, '26-27'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.player).toBeDefined();
    expect(result.current.player?.name).toBe('Kaoru Mitoma');
    expect(result.current.player?.photoBlob).toBeUndefined();

    // Save photo
    const mockBlob = new Blob(['photo-100'], { type: 'image/png' });
    await result.current.savePhoto({ blob: mockBlob, name: 'Kaoru Mitoma' });

    await waitFor(() => {
      expect(result.current.player?.photoBlob).toBeDefined();
    });

    // Delete photo
    await result.current.deletePhoto();

    await waitFor(() => {
      expect(result.current.player?.photoBlob).toBeUndefined();
    });
  });

  it('fetches batch players master with season', async () => {
    const mockBlob1 = new Blob(['p1'], { type: 'image/png' });
    const mockBlob2 = new Blob(['p2'], { type: 'image/png' });

    await db.players.bulkPut([
      {
        id: generatePlayerMasterId('26-27', 201),
        playerId: 201,
        season: '26-27',
        name: 'Player 201',
        updatedAt: Date.now(),
      },
      {
        id: generatePlayerMasterId('26-27', 202),
        playerId: 202,
        season: '26-27',
        name: 'Player 202',
        updatedAt: Date.now(),
      },
    ]);
    await db.player_photos.bulkPut([
      {
        playerId: 201,
        photoBlob: mockBlob1,
        mimeType: 'image/png',
        updatedAt: Date.now(),
      },
      {
        playerId: 202,
        photoBlob: mockBlob2,
        mimeType: 'image/png',
        updatedAt: Date.now(),
      },
    ]);

    const { result } = renderHook(
      () => usePlayersMasterBatch([201, 202, 303], '26-27'),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.size).toBe(2);
    expect(result.current.data?.get(201)?.name).toBe('Player 201');
    expect(result.current.data?.get(201)?.photoBlob).toBeDefined();
    expect(result.current.data?.get(202)?.name).toBe('Player 202');
    expect(result.current.data?.get(202)?.photoBlob).toBeDefined();
    expect(result.current.data?.get(303)).toBeUndefined();
  });

  it('fetches and mutates players for a specific season using useSeasonPlayers', async () => {
    const { result } = renderHook(() => useSeasonPlayers('26-27', 'Chelsea'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.players.length).toBe(0);

    // Save a player
    await result.current.savePlayer({
      playerId: 301,
      name: 'Enzo Fernandez',
      defaultShirtNo: 8,
      position: 'MC',
    });

    await waitFor(() => {
      expect(result.current.players.length).toBe(1);
    });

    expect(result.current.players[0].name).toBe('Enzo Fernandez');
    expect(result.current.players[0].defaultShirtNo).toBe(8);

    // Delete player
    await result.current.deletePlayer(301);

    await waitFor(() => {
      expect(result.current.players.length).toBe(0);
    });
  });

  describe('usePlayerMasterMutations', () => {
    it('works without QueryClientProvider and executes savePlayer, updatePlayer, mergePlayer', async () => {
      const { result } = renderHook(() => usePlayerMasterMutations());

      await result.current.savePlayer({
        playerId: 999,
        name: 'Test Player',
        season: '26-27',
      });

      const player = await db.players.get(generatePlayerMasterId('26-27', 999));
      expect(player).toBeDefined();
      expect(player?.name).toBe('Test Player');

      await result.current.updatePlayer({
        playerId: 999,
        name: 'Updated Player',
        season: '26-27',
      });

      const updated = await db.players.get(
        generatePlayerMasterId('26-27', 999),
      );
      expect(updated?.name).toBe('Updated Player');

      await result.current.mergePlayer(999, 1000, '26-27', 'Chelsea');
      const mergedOld = await db.players.get(
        generatePlayerMasterId('26-27', 999),
      );
      expect(mergedOld).toBeUndefined();
      const mergedNew = await db.players.get(
        generatePlayerMasterId('26-27', 1000),
      );
      expect(mergedNew?.name).toBe('Updated Player');
    });
  });
});
