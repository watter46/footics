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

  it('correctly maps 20-player match data with formationSlots and subbed-out players to bench behind unplayed subs', () => {
    // 20人の選手データを持つチーム
    const homeTeam = createMockTeam(1, 'Chelsea', 'home');
    // 20人に拡張
    homeTeam.players = Array.from({ length: 20 }, (_, i) => ({
      playerId: 100 + i + 1,
      name: `Chelsea Player ${i + 1}`,
      shirtNo: i + 1,
      position: i === 0 ? 'GK' : i < 5 ? 'DC' : i < 9 ? 'MC' : 'FW',
      isFirstEleven: i < 11,
      field: 'home',
      stats: {},
      height: 180,
      weight: 75,
      age: 25,
      isManOfTheMatch: false,
    }));

    // 最初: 1..11 がスタメン (slot 1..11), 12..20 が控え (slot 0)
    // 60分に 11番(FW) が 12番(控え) と交代
    // 60分以降の formation では 12番が slot 11 に入り、11番は playerIds から消える（交代退場）
    const all20Ids = homeTeam.players.map((p) => p.playerId);
    const starterIds = all20Ids.slice(0, 11);
    const slotsStart = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    const positionsStart = Array.from({ length: 20 }, (_, i) => ({
      vertical: i < 11 ? Math.floor(i / 3) * 2 : 0,
      horizontal: i < 11 ? (i % 3) * 4 : 0,
    }));

    const starterIdsAfterSub = [
      ...all20Ids.slice(0, 10),
      all20Ids[11],
      ...all20Ids.slice(12),
    ];
    // 11番(all20Ids[10])は formation.playerIds に含まれない
    const slotsAfterSub = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0,
    ];

    homeTeam.formations = [
      {
        formationId: 1,
        formationName: '4-2-3-1',
        captainPlayerId: starterIds[0],
        startMinuteExpanded: 0,
        endMinuteExpanded: 60,
        playerIds: all20Ids,
        formationSlots: slotsStart,
        formationPositions: positionsStart,
        jerseyNumbers: homeTeam.players.map((p) => p.shirtNo),
      },
      {
        formationId: 2,
        formationName: '4-2-3-1',
        captainPlayerId: starterIds[0],
        startMinuteExpanded: 60,
        endMinuteExpanded: 90,
        playerIds: starterIdsAfterSub, // 19人 (11番が退場して含まれない)
        formationSlots: slotsAfterSub,
        formationPositions: positionsStart.slice(0, 19),
        jerseyNumbers: homeTeam.players
          .filter((p) => p.playerId !== all20Ids[10])
          .map((p) => p.shirtNo),
      },
    ];

    const match: Match = {
      id: '99999',
      date: '2026-09-01',
      score: '1-0',
      matchType: 'club',
      homeTeam: { id: 1, name: 'Chelsea' },
      awayTeam: { id: 2, name: 'Arsenal' },
      playerIdNameDictionary: {},
      teams: {
        home: homeTeam,
        away: createMockTeam(2, 'Arsenal', 'away'),
      },
    };

    // 70分時点をビルド
    const result = buildMatchTacticalPlayers({ match, minute: 70 });
    const homePitch = result.homePlayers.filter((p) => p.area === 'pitch');
    const homeBench = result.homePlayers.filter((p) => p.area === 'bench');

    // ピッチ上は 11人
    expect(homePitch).toHaveLength(11);
    // 交代でピッチに入った 12番 (ID: 112) がピッチにいる
    expect(homePitch.some((p) => p.playerId === '112')).toBe(true);

    // ベンチは 9人 (未出場控え8人 + 交代退場した11番)
    expect(homeBench).toHaveLength(9);

    // 交代退場した 11番 (ID: 111) はベンチに含まれている
    expect(homeBench.some((p) => p.playerId === '111')).toBe(true);
    // 未出場控え選手 (ID: 113) もベンチに含まれている
    expect(homeBench.some((p) => p.playerId === '113')).toBe(true);
    // ピッチにいる 12番 (ID: 112) はベンチにはいない
    expect(homeBench.some((p) => p.playerId === '112')).toBe(false);
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
