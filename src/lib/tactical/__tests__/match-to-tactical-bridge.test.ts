import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Match, Player, Team } from '@/types';
import {
  buildMatchTacticalPlayers,
  injectMatchToTactical,
} from '../match-to-tactical-bridge';

function createMockTeam(
  teamId: number,
  name: string,
  field: 'home' | 'away',
): Team {
  const players: Player[] = Array.from({ length: 18 }, (_, i) => ({
    playerId: teamId * 100 + i + 1,
    name: `${name} Player ${i + 1}`,
    shirtNo: i + 1,
    position: i === 0 ? 'GK' : i < 5 ? 'DC' : i < 9 ? 'MC' : 'FW',
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
        formationName: '4-2-3-1',
        captainPlayerId: starterIds[0],
        startMinuteExpanded: 0,
        endMinuteExpanded: 90,
        playerIds: starterIds,
        jerseyNumbers: players.slice(0, 11).map((p) => p.shirtNo),
      },
    ],
    stats: {},
  };
}

function createMockMatch(): Match {
  return {
    id: '12345',
    date: '2026-09-01',
    score: '2-1',
    matchType: 'club',
    homeTeam: { id: 1, name: 'Chelsea' },
    awayTeam: { id: 2, name: 'Arsenal' },
    playerIdNameDictionary: {},
    teams: {
      home: createMockTeam(1, 'Chelsea', 'home'),
      away: createMockTeam(2, 'Arsenal', 'away'),
    },
  };
}

describe('buildMatchTacticalPlayers', () => {
  it('generates 22 pitch players (11 home, 11 away) and bench players', () => {
    const match = createMockMatch();
    const result = buildMatchTacticalPlayers({
      match,
      minute: 0,
      homeColor: '#034694',
      awayColor: '#ef4444',
      aspectRatio: '16:9',
    });

    const homePitch = result.homePlayers.filter((p) => p.area === 'pitch');
    const awayPitch = result.awayPlayers.filter((p) => p.area === 'pitch');
    const homeBench = result.homePlayers.filter((p) => p.area === 'bench');
    const awayBench = result.awayPlayers.filter((p) => p.area === 'bench');

    expect(homePitch).toHaveLength(11);
    expect(awayPitch).toHaveLength(11);
    expect(homeBench).toHaveLength(7);
    expect(awayBench).toHaveLength(7);
    expect(result.allPlayers).toHaveLength(36);
    expect(result.homeFormation).toBe('4-2-3-1');
    expect(result.awayFormation).toBe('4-2-3-1');
  });

  it('handles substitution changes at specified minute', () => {
    const match = createMockMatch();
    const homeTeam = match.teams.home as Team;

    const subPlayerId = homeTeam.players[11].playerId;
    const updatedPlayerIds = [
      ...homeTeam.formations[0].playerIds.slice(0, 10),
      subPlayerId,
    ];

    homeTeam.formations.push({
      formationId: 2,
      formationName: '3-4-3',
      captainPlayerId: updatedPlayerIds[0],
      startMinuteExpanded: 60,
      endMinuteExpanded: 90,
      playerIds: updatedPlayerIds,
      jerseyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
    });

    const res45 = buildMatchTacticalPlayers({ match, minute: 45 });
    expect(res45.homeFormation).toBe('4-2-3-1');
    expect(
      res45.homePlayers.some(
        (p) => p.playerId === String(subPlayerId) && p.area === 'pitch',
      ),
    ).toBe(false);

    const res65 = buildMatchTacticalPlayers({ match, minute: 65 });
    expect(res65.homeFormation).toBe('3-4-3');
    expect(
      res65.homePlayers.some(
        (p) => p.playerId === String(subPlayerId) && p.area === 'pitch',
      ),
    ).toBe(true);
  });
});

describe('injectMatchToTactical', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('loads match into active slide of TacticalUnifiedStore', () => {
    const match = createMockMatch();
    injectMatchToTactical({ match, minute: 30 });

    const state = useTacticalUnifiedStore.getState();
    expect(state.project.matchId).toBe('12345');
    expect(state.project.title).toContain("Chelsea vs Arsenal (30')");

    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide).toBeDefined();

    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });
});
