import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTacticalUnifiedStore,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { db } from '@/lib/db';
import type { Match, Player, Team } from '@/types';
import {
  resolveMatchInitialState,
  useTacticalMatchInit,
} from '../use-tactical-match-init';

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

  it('injects match into custom storeApi when provided by context', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const customStore = createTacticalUnifiedStore();
    const { result } = renderHook(
      () => useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
      {
        wrapper: ({ children }) =>
          React.createElement(TacticalUnifiedStoreProvider, {
            store: customStore,
            children,
          }),
      },
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Custom store must be populated
    expect(customStore.getState().project.matchId).toBe('999');
    expect(customStore.getState().project.title).toContain(
      "Home FC vs Away FC (25')",
    );

    // Default store must NOT be polluted
    expect(useTacticalUnifiedStore.getState().project.matchId).toBeUndefined();
  });

  it('injectToStore: false resolves initialState without modifying storeApi', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const { result } = renderHook(() =>
      useTacticalMatchInit({
        initialMatchId: '999',
        initialMinute: 25,
        injectToStore: false,
      }),
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // initialState must be resolved
    expect(result.current.initialState).toBeDefined();
    expect(result.current.initialState?.project?.matchId).toBe('999');
    const activeSlideId = result.current.initialState?.activeSlideId;
    const activeSlide = result.current.initialState?.project?.slides.find(
      (s) => s.id === activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);

    // Global store must remain empty/unmodified
    expect(useTacticalUnifiedStore.getState().project.matchId).toBeUndefined();
  });
});

describe('resolveMatchInitialState', () => {
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
    vi.clearAllMocks();
  });

  it('returns undefined if match is not found in db', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(undefined);
    const result = await resolveMatchInitialState('unknown', 0);
    expect(result).toBeUndefined();
  });

  it('resolves default initial state with 22 players if no saved project exists', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const result = await resolveMatchInitialState('999', 30);
    expect(result).toBeDefined();
    expect(result?.pitchFitPending).toBe(false);
    expect(result?.project?.matchId).toBe('999');
    expect(result?.project?.title).toContain("Home FC vs Away FC (30')");

    const activeSlide = result?.project?.slides.find(
      (s) => s.id === result.activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });

  it('ignores saved project in db and always generates fresh match initial state for given minute', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);
    vi.spyOn(db.keyval, 'get').mockResolvedValueOnce({
      key: 'footics_tactical_active_project_999',
      value: {
        id: 'saved-project-1',
        title: 'Saved Match Project',
        matchId: '999',
        phases: [{ id: 'phase-1', name: 'Phase 1', slides: [] }],
        slides: [],
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      },
    } as any);

    const result = await resolveMatchInitialState('999', 45);
    expect(result).toBeDefined();
    expect(result?.pitchFitPending).toBe(false);
    expect(result?.project?.id).not.toBe('saved-project-1');
    expect(result?.project?.matchId).toBe('999');
    expect(result?.project?.title).toContain("Home FC vs Away FC (45')");

    const activeSlide = result?.project?.slides.find(
      (s) => s.id === result.activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });
});
