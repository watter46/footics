import { describe, expect, it } from 'vitest';
import {
  findFormationAtMinute,
  getFormationAndPlayersAtMinute,
  getPlayersForFormation,
  getTeamFormationAtMinute,
} from '@/lib/data/formation-utils';
import type { ClubMatchRoot, Formation, Player, Team } from '@/types';

const mockPlayer = (id: number, name: string, shirtNo: number): Player => ({
  playerId: id,
  name,
  shirtNo,
  position: 'DC',
  height: 185,
  weight: 80,
  age: 25,
  isManOfTheMatch: false,
  field: 'home',
  isFirstEleven: true,
  stats: {},
});

const mockFormation1: Formation = {
  formationId: 2,
  formationName: '4-2-3-1',
  captainPlayerId: 101,
  startMinuteExpanded: 0,
  endMinuteExpanded: 60,
  playerIds: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111],
  jerseyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const mockFormation2: Formation = {
  formationId: 3,
  formationName: '4-3-3',
  captainPlayerId: 101,
  startMinuteExpanded: 60,
  endMinuteExpanded: 75,
  playerIds: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 112],
  jerseyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
};

const mockFormation3: Formation = {
  formationId: 4,
  formationName: '5-3-2',
  captainPlayerId: 102,
  startMinuteExpanded: 75,
  endMinuteExpanded: 90,
  playerIds: [101, 102, 103, 104, 105, 106, 107, 108, 110, 112, 113],
  jerseyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13],
};

const allPlayers: Player[] = [
  mockPlayer(101, 'GK Player', 1),
  mockPlayer(102, 'DF Player 1', 2),
  mockPlayer(103, 'DF Player 2', 3),
  mockPlayer(104, 'DF Player 3', 4),
  mockPlayer(105, 'DF Player 4', 5),
  mockPlayer(106, 'MF Player 1', 6),
  mockPlayer(107, 'MF Player 2', 7),
  mockPlayer(108, 'MF Player 3', 8),
  mockPlayer(109, 'FW Player 1', 9),
  mockPlayer(110, 'FW Player 2', 10),
  mockPlayer(111, 'FW Player 3', 11),
  mockPlayer(112, 'Sub In 1', 12),
  mockPlayer(113, 'Sub In 2', 13),
];

const mockTeam: Team = {
  teamId: 10,
  name: 'Chelsea',
  countryName: 'England',
  managerName: 'Manager',
  field: 'home',
  averageAge: 25,
  players: allPlayers,
  formations: [mockFormation1, mockFormation2],
  stats: {},
};

const awayPlayers = allPlayers.map((p) => ({
  ...p,
  playerId: p.playerId + 1000,
  field: 'away' as const,
}));

const awayFormation: Formation = {
  formationId: 1,
  formationName: '4-4-2',
  captainPlayerId: 1101,
  startMinuteExpanded: 0,
  endMinuteExpanded: 90,
  playerIds: awayPlayers.slice(0, 11).map((p) => p.playerId),
  jerseyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const mockMatchData: ClubMatchRoot = {
  matchId: 123456,
  matchCentreData: {
    playerIdNameDictionary: {},
    periodMinuteLimits: { '1': 45, '2': 90 },
    periodEndMinutes: { '1': 47, '2': 94 },
    timeStamp: '',
    attendance: 40000,
    venueName: 'Stadium',
    referee: {
      officialId: 1,
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
    },
    weatherCode: '',
    elapsed: 'FT',
    startTime: '15:00',
    startDate: '2023-09-01',
    score: '2 : 1',
    htScore: '1 : 0',
    ftScore: '2 : 1',
    statusCode: 100,
    periodCode: 2,
    home: mockTeam,
    away: {
      teamId: 2,
      name: 'Away Team',
      countryName: 'Spain',
      managerName: 'Away Manager',
      field: 'away',
      averageAge: 26,
      players: awayPlayers,
      formations: [awayFormation],
      stats: {},
    },
    maxMinute: 90,
    minuteExpanded: 94,
    maxPeriod: 2,
    expandedMinutes: {},
    expandedMaxMinute: 94,
    events: [],
  },
  matchCentreEventTypeJson: {},
  formationIdNameMappings: {},
};

describe('findFormationAtMinute', () => {
  it('returns null for empty or null formations array', () => {
    expect(findFormationAtMinute([], 10)).toBeNull();
    expect(findFormationAtMinute(null, 10)).toBeNull();
    expect(findFormationAtMinute(undefined, 10)).toBeNull();
  });

  it('returns the formation for a single formation scenario across all minutes', () => {
    const single = [mockFormation1];
    expect(findFormationAtMinute(single, 0)).toEqual(mockFormation1);
    expect(findFormationAtMinute(single, 30)).toEqual(mockFormation1);
    expect(findFormationAtMinute(single, 60)).toEqual(mockFormation1);
    expect(findFormationAtMinute(single, 90)).toEqual(mockFormation1);
    expect(findFormationAtMinute(single, -5)).toEqual(mockFormation1);
  });

  it('returns the correct formation across boundary minutes and substitutions', () => {
    const formations = [mockFormation1, mockFormation2, mockFormation3];

    // Before match or start
    expect(findFormationAtMinute(formations, -1)).toEqual(mockFormation1);
    expect(findFormationAtMinute(formations, 0)).toEqual(mockFormation1);
    expect(findFormationAtMinute(formations, 30)).toEqual(mockFormation1);
    expect(findFormationAtMinute(formations, 59)).toEqual(mockFormation1);

    // Boundary at minute 60 (Substitution 1)
    expect(findFormationAtMinute(formations, 60)).toEqual(mockFormation2);
    expect(findFormationAtMinute(formations, 70)).toEqual(mockFormation2);
    expect(findFormationAtMinute(formations, 74)).toEqual(mockFormation2);

    // Boundary at minute 75 (Substitution 2)
    expect(findFormationAtMinute(formations, 75)).toEqual(mockFormation3);
    expect(findFormationAtMinute(formations, 89)).toEqual(mockFormation3);
    expect(findFormationAtMinute(formations, 90)).toEqual(mockFormation3);
    expect(findFormationAtMinute(formations, 95)).toEqual(mockFormation3);
  });

  it('handles unsorted formation inputs gracefully', () => {
    const unsorted = [mockFormation3, mockFormation1, mockFormation2];
    expect(findFormationAtMinute(unsorted, 10)).toEqual(mockFormation1);
    expect(findFormationAtMinute(unsorted, 65)).toEqual(mockFormation2);
    expect(findFormationAtMinute(unsorted, 80)).toEqual(mockFormation3);
  });
});

describe('getPlayersForFormation', () => {
  it('returns empty array when formation or players are null/undefined', () => {
    expect(getPlayersForFormation(null, allPlayers)).toEqual([]);
    expect(getPlayersForFormation(mockFormation1, null)).toEqual([]);
    expect(getPlayersForFormation(mockFormation1, undefined)).toEqual([]);
  });

  it('returns matching player objects in the order of playerIds', () => {
    const players = getPlayersForFormation(mockFormation1, allPlayers);
    expect(players).toHaveLength(11);
    expect(players.map((p) => p.playerId)).toEqual(mockFormation1.playerIds);
    expect(players[0]?.name).toBe('GK Player');
  });

  it('filters out playerIds that are not found in allPlayers', () => {
    const partialFormation: Formation = {
      ...mockFormation1,
      playerIds: [101, 999, 102],
    };
    const players = getPlayersForFormation(partialFormation, allPlayers);
    expect(players).toHaveLength(2);
    expect(players.map((p) => p.playerId)).toEqual([101, 102]);
  });
});

describe('getTeamFormationAtMinute', () => {
  it('handles null team gracefully', () => {
    const result = getTeamFormationAtMinute(null, 10);
    expect(result.teamId).toBe(0);
    expect(result.formation).toBeNull();
    expect(result.players).toEqual([]);
  });

  it('returns correct team formation and players at specified minute', () => {
    const res0 = getTeamFormationAtMinute(mockTeam, 30);
    expect(res0.teamId).toBe(10);
    expect(res0.teamName).toBe('Chelsea');
    expect(res0.formationName).toBe('4-2-3-1');
    expect(res0.captainPlayerId).toBe(101);
    expect(res0.players).toHaveLength(11);
    expect(res0.playerIds).toContain(111);
    expect(res0.playerIds).not.toContain(112);

    const res65 = getTeamFormationAtMinute(mockTeam, 65);
    expect(res65.formationName).toBe('4-3-3');
    expect(res65.playerIds).toContain(112);
    expect(res65.playerIds).not.toContain(111);
  });
});

describe('getFormationAndPlayersAtMinute', () => {
  it('extracts formations and players for both teams at given minute', () => {
    const matchResult = getFormationAndPlayersAtMinute(mockMatchData, 20);
    expect(matchResult.minute).toBe(20);
    expect(matchResult.home.teamName).toBe('Chelsea');
    expect(matchResult.home.formationName).toBe('4-2-3-1');
    expect(matchResult.home.players).toHaveLength(11);

    expect(matchResult.away.teamName).toBe('Away Team');
    expect(matchResult.away.formationName).toBe('4-4-2');
    expect(matchResult.away.players).toHaveLength(11);
  });

  it('reflects tactical substitutions at second half correctly', () => {
    const matchResult = getFormationAndPlayersAtMinute(mockMatchData, 70);
    expect(matchResult.minute).toBe(70);
    expect(matchResult.home.formationName).toBe('4-3-3');
    expect(matchResult.home.playerIds).toContain(112);
    expect(matchResult.away.formationName).toBe('4-4-2');
  });
});
