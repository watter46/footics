import { describe, expect, it } from 'vitest';
import type { PlayerMaster } from '@/lib/db/schema';
import { getTeamConfig } from '@/lib/tactical/teams-config';
import type { Match, Player, Team } from '@/types';
import {
  buildUnifiedSquad,
  buildVirtualMatch,
  getTacticsMatchId,
  matchTeamName,
} from '../squad-builder';

const chelseaConfig = getTeamConfig('chelsea');
const arsenalConfig = getTeamConfig('arsenal');

describe('squad-builder', () => {
  describe('matchTeamName', () => {
    it('returns true when names match or partially match case-insensitively', () => {
      expect(matchTeamName('Chelsea', 'Chelsea')).toBe(true);
      expect(matchTeamName('chelsea', 'Chelsea FC')).toBe(true);
      expect(matchTeamName('Arsenal FC', 'arsenal')).toBe(true);
    });

    it('returns false when names do not match or when name is undefined', () => {
      expect(matchTeamName('Chelsea', 'Arsenal')).toBe(false);
      expect(matchTeamName('Chelsea', undefined)).toBe(false);
      expect(matchTeamName('Chelsea', '')).toBe(false);
    });
  });

  describe('getTacticsMatchId', () => {
    it('returns formatted tactics match id', () => {
      expect(getTacticsMatchId('chelsea')).toBe('chelsea-tactics-board');
      expect(getTacticsMatchId('arsenal')).toBe('arsenal-tactics-board');
    });
  });

  describe('buildUnifiedSquad', () => {
    it('initializes squad from preset for Chelsea and normalizes positions', () => {
      const result = buildUnifiedSquad({
        teamConfig: chelseaConfig,
        effectiveTeamName: 'Chelsea',
        season: '26-27',
      });

      expect(result.teamPlayers.length).toBeGreaterThan(0);
      expect(result.opponentPlayers.length).toBeGreaterThan(0);
      expect(Object.keys(result.dictionary).length).toBeGreaterThan(0);

      const validPositions = new Set(['GK', 'DF', 'MID', 'FW', 'Other']);
      result.teamPlayers.forEach((p) => {
        expect(validPositions.has(p.position)).toBe(true);
        expect(p.field).toBe('home');
      });

      result.opponentPlayers.forEach((p) => {
        expect(p.field).toBe('away');
      });
    });

    it('preserves isFirstEleven boolean flag correctly for presets and opponent squad', () => {
      const result = buildUnifiedSquad({
        teamConfig: chelseaConfig,
        effectiveTeamName: 'Chelsea',
        season: '26-27',
      });

      // Chelsea preset: Robert Sánchez (starter: true), Filip Jörgensen (bench: false)
      const sanchez = result.teamPlayers.find((p) => p.playerId === 345001);
      const jorgensen = result.teamPlayers.find((p) => p.playerId === 345002);
      expect(sanchez?.isFirstEleven).toBe(true);
      expect(jorgensen?.isFirstEleven).toBe(false);

      // Opponent squad: Away DC (L) (starter: true), Away Sub GK (bench: false)
      const opponentStarter = result.opponentPlayers.find(
        (p) => p.playerId === 999004,
      );
      const opponentBench = result.opponentPlayers.find(
        (p) => p.playerId === 999012,
      );
      expect(opponentStarter?.isFirstEleven).toBe(true);
      expect(opponentBench?.isFirstEleven).toBe(false);
    });

    it('initializes empty team squad for non-preset clubs when no matches or masters exist', () => {
      const result = buildUnifiedSquad({
        teamConfig: arsenalConfig,
        effectiveTeamName: 'Arsenal',
        season: '26-27',
      });

      expect(result.teamPlayers).toEqual([]);
      expect(result.opponentPlayers.length).toBeGreaterThan(0);
    });

    it('excludes players specified in excludedPlayers', () => {
      // First get a known Chelsea player ID from preset
      const baseResult = buildUnifiedSquad({
        teamConfig: chelseaConfig,
        effectiveTeamName: 'Chelsea',
        season: '26-27',
      });
      const firstPlayer = baseResult.teamPlayers[0];
      expect(firstPlayer).toBeDefined();

      const result = buildUnifiedSquad({
        teamConfig: chelseaConfig,
        effectiveTeamName: 'Chelsea',
        season: '26-27',
        excludedPlayers: [{ playerId: firstPlayer.playerId }],
      });

      expect(
        result.teamPlayers.some((p) => p.playerId === firstPlayer.playerId),
      ).toBe(false);
    });

    it('extracts and updates players from DB matches for the corresponding season', () => {
      const mockMatch: Match = {
        id: 'match-1',
        date: '2026-09-15T15:00:00Z',
        score: '2 - 1',
        matchType: 'club',
        homeTeam: { id: 13, name: 'Arsenal' },
        awayTeam: { id: 999, name: 'Other FC' },
        playerIdNameDictionary: {},
        teams: {
          home: {
            teamId: 13,
            name: 'Arsenal',
            field: 'home',
            players: [
              {
                playerId: 501,
                name: 'Martin Odegaard',
                shirtNo: 8,
                position: 'AM',
                isFirstEleven: true,
              } as unknown as Player,
            ],
          },
          away: {
            teamId: 999,
            name: 'Other FC',
            field: 'away',
            players: [],
          },
        } as unknown as Match['teams'],
      };

      const result = buildUnifiedSquad({
        teamConfig: arsenalConfig,
        effectiveTeamName: 'Arsenal',
        season: '26-27',
        matches: [mockMatch],
      });

      expect(result.teamPlayers.length).toBe(1);
      expect(result.teamPlayers[0].playerId).toBe(501);
      expect(result.teamPlayers[0].name).toBe('Martin Odegaard');
      expect(result.teamPlayers[0].shirtNo).toBe(8);
      expect(result.teamPlayers[0].position).toBe('MID'); // normalized from AM
      expect(result.teamPlayers[0].field).toBe('home');
      expect(result.dictionary[501]).toBe('Martin Odegaard');
    });

    it('ignores matches from different seasons', () => {
      const mockMatch: Match = {
        id: 'match-old',
        date: '2024-09-15T15:00:00Z', // 24-25 season
        score: '1 - 0',
        matchType: 'club',
        homeTeam: { id: 13, name: 'Arsenal' },
        awayTeam: { id: 999, name: 'Other FC' },
        playerIdNameDictionary: {},
        teams: {
          home: {
            teamId: 13,
            name: 'Arsenal',
            players: [
              {
                playerId: 501,
                name: 'Martin Odegaard',
                shirtNo: 8,
                position: 'MID',
              } as unknown as Player,
            ],
          },
          away: {
            teamId: 999,
            name: 'Other FC',
            players: [],
          },
        } as unknown as Match['teams'],
      };

      const result = buildUnifiedSquad({
        teamConfig: arsenalConfig,
        effectiveTeamName: 'Arsenal',
        season: '26-27',
        matches: [mockMatch],
      });

      expect(result.teamPlayers.length).toBe(0);
    });

    it('applies PlayerMaster additions, updates, and exclusions', () => {
      const master1: PlayerMaster = {
        id: '26-27_-101',
        playerId: -101,
        name: 'Bukayo Saka',
        defaultShirtNo: 7,
        position: 'FW',
        season: '26-27',
        teamName: 'Arsenal',
        updatedAt: Date.now(),
      };

      const master2: PlayerMaster = {
        id: '26-27_9991',
        playerId: 9991,
        name: 'Excluded Guy',
        defaultShirtNo: 99,
        position: 'DF',
        season: '26-27',
        teamName: 'Arsenal',
        isExcluded: true,
        updatedAt: Date.now(),
      };

      const result = buildUnifiedSquad({
        teamConfig: arsenalConfig,
        effectiveTeamName: 'Arsenal',
        season: '26-27',
        masters: [master1, master2],
      });

      expect(result.teamPlayers.length).toBe(1);
      expect(result.teamPlayers[0].playerId).toBe(-101);
      expect(result.teamPlayers[0].name).toBe('Bukayo Saka');
      expect(result.teamPlayers[0].shirtNo).toBe(7);
      expect(result.teamPlayers.some((p) => p.name === 'Excluded Guy')).toBe(
        false,
      );
    });

    it('deduplicates players with the same name, prioritizing positive official IDs', () => {
      const masterTemp: PlayerMaster = {
        id: '26-27_-8888',
        playerId: -8888,
        name: 'Cole Palmer',
        defaultShirtNo: 20,
        position: 'MID',
        season: '26-27',
        teamName: 'Chelsea',
        updatedAt: Date.now(),
      };

      const result = buildUnifiedSquad({
        teamConfig: chelseaConfig,
        effectiveTeamName: 'Chelsea',
        season: '26-27',
        masters: [masterTemp],
      });

      const palmerList = result.teamPlayers.filter(
        (p) => p.name.trim().toLowerCase() === 'cole palmer',
      );

      expect(palmerList.length).toBe(1);
      expect(palmerList[0].playerId).toBeGreaterThan(0);
      expect(palmerList[0].shirtNo).toBe(20);
    });
  });

  describe('buildVirtualMatch', () => {
    it('creates a valid virtual Match object with formations and teams', () => {
      const squadResult = buildUnifiedSquad({
        teamConfig: chelseaConfig,
        effectiveTeamName: 'Chelsea',
        season: '26-27',
      });

      const virtualMatch = buildVirtualMatch(
        chelseaConfig,
        squadResult.teamPlayers,
        squadResult.opponentPlayers,
        squadResult.dictionary,
      );

      expect(virtualMatch.id).toBe('chelsea-tactics-board');
      expect(virtualMatch.homeTeam?.name).toBe('Chelsea');
      expect(virtualMatch.awayTeam?.name).toBe('Opponent');
      expect(virtualMatch.teams?.home?.players).toHaveLength(
        squadResult.teamPlayers.length,
      );
      expect(virtualMatch.teams?.away?.players).toHaveLength(
        squadResult.opponentPlayers.length,
      );
      const homeTeam = virtualMatch.teams?.home as Team;
      const awayTeam = virtualMatch.teams?.away as Team;
      expect(homeTeam?.formations?.[0]?.playerIds).toHaveLength(
        Math.min(11, squadResult.teamPlayers.length),
      );
      expect(awayTeam?.formations?.[0]?.playerIds).toHaveLength(11);
    });
  });
});
