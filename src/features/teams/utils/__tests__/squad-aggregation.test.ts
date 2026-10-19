import { describe, expect, it } from 'vitest';
import type { PlayerMaster } from '@/lib/db/schema';
import type { Player } from '@/types';
import type { MergedSquadPlayer } from '../../components/squad-player-card';
import {
  computeSquadViewData,
  groupPlayersByCategory,
  mergeMasterAndSquadPlayers,
  POSITION_CATEGORIES,
} from '../squad-aggregation';

const createMockPlayer = (overrides: Partial<Player>): Player =>
  ({
    playerId: 1,
    name: 'Player',
    shirtNo: 1,
    position: 'MID',
    height: 180,
    weight: 75,
    age: 24,
    isManOfTheMatch: false,
    field: ':home:',
    isFirstEleven: true,
    ...overrides,
  }) as Player;

const createMockMergedPlayer = (
  overrides: Partial<MergedSquadPlayer>,
): MergedSquadPlayer =>
  ({
    ...createMockPlayer(overrides),
    ...overrides,
  }) as MergedSquadPlayer;

describe('mergeMasterAndSquadPlayers', () => {
  it('merges player master data into squad players and prioritizes positive IDs', () => {
    const teamPlayers: Player[] = [
      createMockPlayer({
        playerId: 101,
        name: 'Cole Palmer',
        shirtNo: 20,
        position: 'MID',
      }),
      createMockPlayer({
        playerId: -1,
        name: 'Cole Palmer',
        shirtNo: 10,
        position: 'MID',
      }),
    ];

    const masterPlayers: PlayerMaster[] = [
      {
        id: '25-26_101',
        playerId: 101,
        name: 'Cole Palmer',
        defaultShirtNo: 20,
        position: 'MID',
        season: '25-26',
        teamName: 'Chelsea',
        photoUrl: 'https://example.com/palmer.png',
        updatedAt: 1000,
      },
    ];

    const result = mergeMasterAndSquadPlayers(teamPlayers, masterPlayers);
    expect(result).toHaveLength(1);
    expect(result[0].playerId).toBe(101);
    expect(result[0].photoUrl).toBe('https://example.com/palmer.png');
  });

  it('inherits photo and shirtNo from manual player if official player joins later', () => {
    const mockBlob = new Blob(['image'], { type: 'image/png' });
    const teamPlayers: Player[] = [
      createMockPlayer({
        playerId: -10,
        name: 'Estevao',
        shirtNo: 41,
        position: 'FW',
      }),
      createMockPlayer({
        playerId: 500,
        name: 'Estevao',
        shirtNo: 0,
        position: 'FW',
      }),
    ];

    const masterPlayers: PlayerMaster[] = [
      {
        id: '25-26_-10',
        playerId: -10,
        name: 'Estevao',
        defaultShirtNo: 41,
        position: 'FW',
        season: '25-26',
        teamName: 'Chelsea',
        photoBlob: mockBlob,
        updatedAt: 1000,
      },
    ];

    const result = mergeMasterAndSquadPlayers(teamPlayers, masterPlayers);
    expect(result).toHaveLength(1);
    expect(result[0].playerId).toBe(500);
    expect(result[0].shirtNo).toBe(41);
    expect(result[0].photoBlob).toBe(mockBlob);
  });
});

describe('groupPlayersByCategory', () => {
  it('groups players into correct categories sorted by shirtNo', () => {
    const players: MergedSquadPlayer[] = [
      createMockMergedPlayer({
        playerId: 1,
        name: 'Sanchez',
        shirtNo: 1,
        position: 'GK',
      }),
      createMockMergedPlayer({
        playerId: 2,
        name: 'Colwill',
        shirtNo: 6,
        position: 'DC',
      }),
      createMockMergedPlayer({
        playerId: 3,
        name: 'Cucurella',
        shirtNo: 3,
        position: 'DL',
      }),
      createMockMergedPlayer({
        playerId: 4,
        name: 'Caicedo',
        shirtNo: 25,
        position: 'MC',
      }),
      createMockMergedPlayer({
        playerId: 5,
        name: 'Jackson',
        shirtNo: 15,
        position: 'FW',
      }),
      createMockMergedPlayer({
        playerId: 6,
        name: 'Unknown',
        shirtNo: 99,
        position: 'Sub',
      }),
    ];

    const categorized = groupPlayersByCategory(players, POSITION_CATEGORIES);
    expect(categorized.GK).toHaveLength(1);
    expect(categorized.DF).toHaveLength(2);
    expect(categorized.DF[0].shirtNo).toBe(3); // Cucurella (3) before Colwill (6)
    expect(categorized.DF[1].shirtNo).toBe(6);
    expect(categorized.MID).toHaveLength(1);
    expect(categorized.FW).toHaveLength(1);
    expect(categorized.Other).toHaveLength(1);
  });
});

describe('computeSquadViewData', () => {
  it('filters players and computes summary stats accurately', () => {
    const merged: MergedSquadPlayer[] = [
      createMockMergedPlayer({
        playerId: 10,
        name: 'Enzo',
        shirtNo: 8,
        position: 'MC',
      }),
      createMockMergedPlayer({
        playerId: -5,
        name: 'Prospect',
        shirtNo: 45,
        position: 'FW',
      }),
    ];

    const allData = computeSquadViewData(merged, 'all');
    expect(allData.filteredPlayers).toHaveLength(2);
    expect(allData.officialCount).toBe(1);
    expect(allData.manualCount).toBe(1);
    expect(allData.availableOfficialPlayers).toEqual([
      { playerId: 10, name: 'Enzo', shirtNo: 8 },
    ]);
    expect(allData.currentSeasonPlayerIds.has(10)).toBe(true);
    expect(allData.currentSeasonPlayerIds.has(-5)).toBe(true);

    const officialData = computeSquadViewData(merged, 'official');
    expect(officialData.filteredPlayers).toHaveLength(1);
    expect(officialData.filteredPlayers[0].playerId).toBe(10);

    const manualData = computeSquadViewData(merged, 'manual');
    expect(manualData.filteredPlayers).toHaveLength(1);
    expect(manualData.filteredPlayers[0].playerId).toBe(-5);
  });
});
