import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { db } from '@/lib/db';
import type { Match, Player, Team } from '@/types';
import { useTacticalMatchInit } from '../use-tactical-match-init';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => null),
}));

describe('useTacticalMatchInit', () => {
  const createMockTeam = (
    teamId: number,
    name: string,
    field: 'home' | 'away',
  ): Team => {
    const players: Player[] = Array.from({ length: 15 }, (_, i) => ({
      playerId: teamId * 100 + i + 1,
      name: `${name} Player ${i + 1}`,
      shirtNo: i + 1,
      position: 'MC',
      isFirstEleven: i < 11,
      field,
      stats: {},
      height: 180,
      weight: 75,
      age: 25,
      isManOfTheMatch: false,
    }));

    const starterIds = players.slice(0, 11).map((p) => p.playerId);

    return {
      teamId,
      name,
      countryName: 'England',
      managerName: 'Manager',
      field,
      averageAge: 25,
      players,
      formations: [
        {
          formationId: 1,
          formationName: '4-3-3',
          captainPlayerId: starterIds[0],
          startMinuteExpanded: 0,
          endMinuteExpanded: 90,
          playerIds: starterIds,
          jerseyNumbers: players.slice(0, 11).map((p) => p.shirtNo),
        },
      ],
      stats: {},
    };
  };

  const mockMatch: Match = {
    id: '999',
    date: '2026-09-01',
    score: '1-0',
    matchType: 'club',
    homeTeam: { id: 10, name: 'Home FC' },
    awayTeam: { id: 20, name: 'Away FC' },
    playerIdNameDictionary: {},
    teams: {
      home: createMockTeam(10, 'Home FC', 'home'),
      away: createMockTeam(20, 'Away FC', 'away'),
    },
  };

  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    vi.clearAllMocks();
  });

  it('does nothing when no matchId is provided', () => {
    const { result } = renderHook(() => useTacticalMatchInit());
    expect(result.current.hasMatchQuery).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches match from db and initializes tactical canvas with 22 players', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const { result } = renderHook(() =>
      useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const state = useTacticalUnifiedStore.getState();
    expect(state.project.matchId).toBe('999');
    expect(state.project.title).toContain("Home FC vs Away FC (25')");

    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });
});
