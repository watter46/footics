import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MergedSquadPlayer } from '../../components/squad-player-card';
import { useTeamSquadClient } from '../use-team-squad-client';

// mock router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('useTeamSquadClient', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('initializes with default values and returns expected shape', () => {
    const { result } = renderHook(
      () => useTeamSquadClient({ teamId: 'chelsea' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.teamConfig.id).toBe('chelsea');
    expect(result.current.selectedSeason).toBeDefined();
    expect(result.current.idFilter).toBe('all');
    expect(result.current.isAddPlayerOpen).toBe(false);
    expect(result.current.isCopySeasonOpen).toBe(false);
    expect(result.current.editingPlayer).toBeNull();
    expect(typeof result.current.handleSyncSquad).toBe('function');
    expect(typeof result.current.handleDeletePlayer).toBe('function');
    expect(typeof result.current.handleEditPlayer).toBe('function');
    expect(typeof result.current.handleOpenTacticalCanvas).toBe('function');
    expect(typeof result.current.handlePhotoUpload).toBe('function');
    expect(typeof result.current.handlePhotoDelete).toBe('function');
  });

  it('handles edit player state', () => {
    const { result } = renderHook(
      () => useTeamSquadClient({ teamId: 'chelsea' }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleEditPlayer({
        playerId: 101,
        name: 'Cole Palmer',
        shirtNo: 20,
        position: 'MID',
      } as unknown as MergedSquadPlayer);
    });

    expect(result.current.editingPlayer).toEqual({
      playerId: 101,
      name: 'Cole Palmer',
      shirtNo: 20,
      position: 'MID',
      season: result.current.selectedSeason,
      teamName: result.current.teamConfig.shortName,
    });

    act(() => {
      result.current.setEditingPlayer(null);
    });
    expect(result.current.editingPlayer).toBeNull();
  });

  it('updates idFilter and dialog open states', () => {
    const { result } = renderHook(
      () => useTeamSquadClient({ teamId: 'chelsea' }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setIdFilter('official');
      result.current.setIsAddPlayerOpen(true);
      result.current.setIsCopySeasonOpen(true);
    });

    expect(result.current.idFilter).toBe('official');
    expect(result.current.isAddPlayerOpen).toBe(true);
    expect(result.current.isCopySeasonOpen).toBe(true);
  });

  it('opens tactical canvas and navigates to /tactical', async () => {
    const { result } = renderHook(
      () => useTeamSquadClient({ teamId: 'chelsea' }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleOpenTacticalCanvas();
    });

    expect(pushMock).toHaveBeenCalledWith('/tactical');
  });
});
