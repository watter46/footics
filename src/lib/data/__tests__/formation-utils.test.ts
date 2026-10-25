import { beforeEach, describe, expect, it } from 'vitest';
import {
  getTeamFormationAtMinute,
  type TeamFormationResult,
} from '@/lib/data/formation-utils';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { getPlayerMaster, savePlayerMaster } from '@/lib/db/queries';
import { db } from '@/lib/db/schema';
import {
  matchPlayersToFormationPositions,
  type PositionMatchablePlayer,
} from '@/lib/tactical/player-formatting';
import type { Formation, Player, Team } from '@/types';

describe('formation-utils and position matching', () => {
  beforeEach(async () => {
    await db.players.clear();
  });

  describe('getTeamFormationAtMinute', () => {
    it('separates 11 pitch players and bench players from WhoScored 20-player array with formationSlots', () => {
      const mockPlayers: Player[] = Array.from({ length: 20 }, (_, i) => ({
        playerId: 100 + i,
        name: `Player ${i}`,
        shirtNo: i + 1,
        position: i === 0 ? 'GK' : i < 11 ? 'MC' : 'Sub',
        height: 180,
        weight: 75,
        age: 25,
        isFirstEleven: i < 11,
        isManOfTheMatch: false,
        field: 'home',
        stats: {},
      }));

      const mockFormation: Formation = {
        formationId: 1,
        formationName: '4-3-3',
        captainPlayerId: 100,
        startMinuteExpanded: 0,
        endMinuteExpanded: 90,
        playerIds: mockPlayers.map((p) => p.playerId),
        jerseyNumbers: mockPlayers.map((p) => p.shirtNo),
        formationSlots: [
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        formationPositions: [
          { vertical: 0, horizontal: 5 },
          { vertical: 2, horizontal: 1 },
          { vertical: 2, horizontal: 3 },
          { vertical: 2, horizontal: 7 },
          { vertical: 2, horizontal: 9 },
          { vertical: 5, horizontal: 5 },
          { vertical: 6, horizontal: 3 },
          { vertical: 6, horizontal: 7 },
          { vertical: 9, horizontal: 1 },
          { vertical: 9, horizontal: 5 },
          { vertical: 9, horizontal: 9 },
        ],
      };

      const team: Team = {
        teamId: 10,
        name: 'Chelsea',
        countryName: 'England',
        managerName: 'Manager',
        field: 'home',
        averageAge: 25,
        players: mockPlayers,
        formations: [mockFormation],
        stats: {},
      };

      const result: TeamFormationResult = getTeamFormationAtMinute(team, 10);

      expect(result.playerIds.length).toBe(11);
      expect(result.players.length).toBe(11);
      expect(result.playerIds).toEqual(
        mockPlayers.slice(0, 11).map((p) => p.playerId),
      );

      // 9 unplayed bench players
      expect(result.benchPlayerIds.length).toBe(9);
      expect(result.benchPlayers.length).toBe(9);
      expect(result.benchPlayerIds).toEqual(
        mockPlayers.slice(11).map((p) => p.playerId),
      );

      // slotPositions check
      expect(result.slotPositions[100]).toEqual({
        slot: 1,
        vertical: 0,
        horizontal: 5,
      });
      expect(result.slotPositions[101]).toEqual({
        slot: 2,
        vertical: 2,
        horizontal: 1,
      });
    });

    it('includes subbed-out players at the end of benchPlayers after substitution', () => {
      // 12 players total in team squad
      const mockPlayers: Player[] = Array.from({ length: 12 }, (_, i) => ({
        playerId: 200 + i,
        name: `Player ${i}`,
        shirtNo: i + 1,
        position: 'MC',
        height: 180,
        weight: 75,
        age: 25,
        isFirstEleven: i < 11,
        isManOfTheMatch: false,
        field: 'home',
        stats: {},
      }));

      // At minute 60, player 201 is substituted off and replaced by player 211
      const formationStart: Formation = {
        formationId: 1,
        formationName: '4-3-3',
        captainPlayerId: 200,
        startMinuteExpanded: 0,
        endMinuteExpanded: 60,
        playerIds: [200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211],
        jerseyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        formationSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0],
      };

      const formationAfterSub: Formation = {
        formationId: 2,
        formationName: '4-3-3',
        captainPlayerId: 200,
        startMinuteExpanded: 61,
        endMinuteExpanded: 90,
        // Player 201 is no longer in active slots (or not in playerIds/formationSlots)
        // In WhoScored, the player list in formation after sub contains the current active players (slot 1..11)
        playerIds: [200, 211, 202, 203, 204, 205, 206, 207, 208, 209, 210],
        jerseyNumbers: [1, 12, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        formationSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      };

      const team: Team = {
        teamId: 10,
        name: 'Chelsea',
        countryName: 'England',
        managerName: 'Manager',
        field: 'home',
        averageAge: 25,
        players: mockPlayers,
        formations: [formationStart, formationAfterSub],
        stats: {},
      };

      const result: TeamFormationResult = getTeamFormationAtMinute(team, 70);

      // Pitch has 11 players including 211
      expect(result.playerIds).toContain(211);
      expect(result.playerIds).not.toContain(201);
      expect(result.playerIds.length).toBe(11);

      // Bench contains subbed out player 201 at the end
      expect(result.benchPlayerIds).toContain(201);
      expect(result.benchPlayers.map((p) => p.playerId)).toContain(201);
    });
  });

  describe('matchPlayersToFormationPositions', () => {
    it('accurately maps DR, DL, DMC, FW to formation template positions', () => {
      // 4-3-3 formation template positions
      const templatePositions = FORMATION_POSITIONS['4-3-3'];

      interface TestPlayer extends PositionMatchablePlayer {
        id: number;
        name: string;
      }

      const players: TestPlayer[] = [
        {
          id: 1,
          name: 'GK',
          position: 'GK',
          slotVertical: 0,
          slotHorizontal: 5,
        },
        {
          id: 2,
          name: 'RB',
          position: 'DR',
          slotVertical: 2,
          slotHorizontal: 1,
        },
        {
          id: 3,
          name: 'CB1',
          position: 'DC',
          slotVertical: 2,
          slotHorizontal: 3,
        },
        {
          id: 4,
          name: 'CB2',
          position: 'DC',
          slotVertical: 2,
          slotHorizontal: 7,
        },
        {
          id: 5,
          name: 'LB',
          position: 'DL',
          slotVertical: 2,
          slotHorizontal: 9,
        },
        {
          id: 6,
          name: 'DM',
          position: 'DMC',
          slotVertical: 4,
          slotHorizontal: 5,
        },
        {
          id: 7,
          name: 'RCM',
          position: 'MC',
          slotVertical: 6,
          slotHorizontal: 3,
        },
        {
          id: 8,
          name: 'LCM',
          position: 'MC',
          slotVertical: 6,
          slotHorizontal: 7,
        },
        {
          id: 9,
          name: 'RW',
          position: 'AMR',
          slotVertical: 9,
          slotHorizontal: 1,
        },
        {
          id: 10,
          name: 'ST',
          position: 'FW',
          slotVertical: 9,
          slotHorizontal: 5,
        },
        {
          id: 11,
          name: 'LW',
          position: 'AML',
          slotVertical: 9,
          slotHorizontal: 9,
        },
      ];

      const mapped = matchPlayersToFormationPositions(
        players,
        templatePositions,
      );

      expect(mapped.length).toBe(11);

      const rbMapping = mapped.find((m) => m.player.id === 2);
      expect(rbMapping?.templatePos.position).toBe('RB');
      expect(rbMapping?.templatePos.left).toBeGreaterThan(70);

      const lbMapping = mapped.find((m) => m.player.id === 5);
      expect(lbMapping?.templatePos.position).toBe('LB');
      expect(lbMapping?.templatePos.left).toBeLessThan(30);

      const dmMapping = mapped.find((m) => m.player.id === 6);
      expect(dmMapping?.templatePos.position).toBe('DM');

      const stMapping = mapped.find((m) => m.player.id === 10);
      expect(stMapping?.templatePos.position).toBe('ST');
    });
  });

  describe('savePlayerMaster', () => {
    it('does not overwrite existing position with Sub', async () => {
      // 1. Initial save with DC position
      await savePlayerMaster({
        playerId: 999,
        name: 'Levi Colwill',
        position: 'DC',
        season: '26-27',
      });

      const initial = await getPlayerMaster(999, '26-27');
      expect(initial?.position).toBe('DC');

      // 2. Overwrite attempt with Sub (e.g. from match where he started on bench)
      await savePlayerMaster({
        playerId: 999,
        name: 'Levi Colwill',
        position: 'Sub',
        season: '26-27',
      });

      const after = await getPlayerMaster(999, '26-27');
      expect(after?.position).toBe('DC');
    });
  });
});
