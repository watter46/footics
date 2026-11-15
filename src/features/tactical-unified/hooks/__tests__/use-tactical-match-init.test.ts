import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { db } from '@/lib/db';
import type { Match, Player, Team } from '@/types';
import {
  resolveMatchInitialState,
  useTacticalMatchInit,
} from '../use-tactical-match-init';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => null),
}));

function createMatchInitHarness() {
  const project = createDefaultTacticalProject();
  const phaseId = project.phases[0]?.id ?? '';
  const slideId = project.phases[0]?.slides[0]?.id ?? '';
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
  });
  const playbackStore = createPlaybackStore();
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(
      TacticalStoreProvider,
      { stores: { documentStore, sessionStore, playbackStore } },
      children,
    );
  return { documentStore, sessionStore, playbackStore, wrapper };
}

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
    vi.clearAllMocks();
  });

  it('does nothing when no matchId is provided', () => {
    const { wrapper } = createMatchInitHarness();
    const { result } = renderHook(() => useTacticalMatchInit(), { wrapper });
    expect(result.current.hasMatchQuery).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches match from db and initializes tactical canvas with 22 players', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);
    const { documentStore, sessionStore, wrapper } = createMatchInitHarness();

    const { result } = renderHook(
      () => useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
      { wrapper },
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const project = documentStore.getState().project;
    expect(project.matchId).toBe('999');
    expect(project.title).toContain("Home FC vs Away FC (25')");

    const { activePhaseId, activeSlideId } = sessionStore.getState();
    const activeSlide = selectDomainActiveSlide(
      project,
      activePhaseId,
      activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });

  it('injects match into isolated TacticalStoreProvider stores without polluting sibling stores', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const customHarness = createMatchInitHarness();
    const otherHarness = createMatchInitHarness();
    const { result } = renderHook(
      () => useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
      { wrapper: customHarness.wrapper },
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(customHarness.documentStore.getState().project.matchId).toBe('999');
    expect(customHarness.documentStore.getState().project.title).toContain(
      "Home FC vs Away FC (25')",
    );
    expect(
      otherHarness.documentStore.getState().project.matchId,
    ).toBeUndefined();
  });

  it('injectToStore: false resolves initialState without modifying stores or outside provider', async () => {
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

    expect(result.current.initialState).toBeDefined();
    expect(result.current.initialState?.project.matchId).toBe('999');
    const resolved = result.current.initialState;
    const activeSlide = resolved
      ? selectDomainActiveSlide(
          resolved.project,
          resolved.activePhaseId,
          resolved.activeSlideId,
        )
      : undefined;
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
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
    expect(result?.project.matchId).toBe('999');
    expect(result?.project.title).toContain("Home FC vs Away FC (30')");

    const activeSlide = result
      ? selectDomainActiveSlide(
          result.project,
          result.activePhaseId,
          result.activeSlideId,
        )
      : undefined;
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
    expect(result?.project.id).not.toBe('saved-project-1');
    expect(result?.project.matchId).toBe('999');
    expect(result?.project.title).toContain("Home FC vs Away FC (45')");

    const activeSlide = result
      ? selectDomainActiveSlide(
          result.project,
          result.activePhaseId,
          result.activeSlideId,
        )
      : undefined;
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });
});
