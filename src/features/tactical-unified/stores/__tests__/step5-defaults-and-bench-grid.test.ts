import { describe, expect, it } from 'vitest';
import { buildMatchTacticalPlayers } from '@/lib/tactical/match-to-tactical-bridge';
import { convertSquadToTacticalPlayers } from '@/lib/tactical/squad-to-tactical-bridge';
import {
  computeBenchGridPositions,
  createDefaultInitialPlayers,
  createDefaultPlayer,
  createDefaultSlide,
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
  PlayerSchema,
} from '@/lib/types/tactical-unified';
import type { Player as DomainPlayer, Match } from '@/types';
import { resetSlideKeepSquadData } from '../slide-reset-helpers';

describe('TASK-051 Phase 1: Step 5 Defaults and Bench Grid', () => {
  describe('PlayerSchema', () => {
    it('accepts isCustom optional boolean', () => {
      const player = createDefaultPlayer('home', 10, 20, '#000000');
      const parsedWithout = PlayerSchema.parse(player);
      expect(parsedWithout.isCustom).toBeUndefined();

      const parsedWith = PlayerSchema.parse({
        ...player,
        isCustom: true,
      });
      expect(parsedWith.isCustom).toBe(true);
    });
  });

  describe('computeBenchGridPositions', () => {
    it('sorts players by FW -> MID -> DF -> GK -> OTHER, then by shirtNo ascending', () => {
      const pGk = {
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: 'gk',
        position: 'GK',
        shirtNo: '1',
      };
      const pDf2 = {
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: 'df2',
        position: 'CB',
        shirtNo: '5',
      };
      const pDf1 = {
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: 'df1',
        position: 'LB',
        shirtNo: '3',
      };
      const pMf = {
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: 'mf',
        position: 'CM',
        shirtNo: '8',
      };
      const pFw2 = {
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: 'fw2',
        position: 'ST',
        shirtNo: '11',
      };
      const pFw1 = {
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: 'fw1',
        position: 'CF',
        shirtNo: '9',
      };
      const pOther = {
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: 'other',
        position: 'UTIL',
        shirtNo: '99',
      };

      const result = computeBenchGridPositions([
        pGk,
        pOther,
        pDf2,
        pFw2,
        pMf,
        pDf1,
        pFw1,
      ]);

      // 期待順: pFw1 (FW, 9), pFw2 (FW, 11), pMf (MF, 8), pDf1 (DF, 3), pDf2 (DF, 5), pGk (GK, 1), pOther (UTIL, 99)
      expect(result.map((p) => p.id)).toEqual([
        'fw1',
        'fw2',
        'mf',
        'df1',
        'df2',
        'gk',
        'other',
      ]);
    });

    it('assigns 3-column grid coordinates (col = idx % 3, row = Math.floor(idx / 3))', () => {
      const players = Array.from({ length: 5 }, (_, i) => ({
        ...createDefaultPlayer('home', 0, 0, '#000'),
        id: `p-${i}`,
        position: 'FW',
        shirtNo: String(i + 1),
      }));

      const result = computeBenchGridPositions(players);

      // idx 0: col 0, row 0 -> x=20, y=14
      // idx 1: col 1, row 0 -> x=50, y=14
      // idx 2: col 2, row 0 -> x=80, y=14
      // idx 3: col 0, row 1 -> x=20, y=36
      // idx 4: col 1, row 1 -> x=50, y=36
      expect(result[0]).toMatchObject({ x: 20, y: 14 });
      expect(result[1]).toMatchObject({ x: 50, y: 14 });
      expect(result[2]).toMatchObject({ x: 80, y: 14 });
      expect(result[3]).toMatchObject({ x: 20, y: 36 });
      expect(result[4]).toMatchObject({ x: 50, y: 36 });
    });
  });

  describe('convertSquadToTacticalPlayers', () => {
    it('defaults to full mode and assigns grid positions to bench players', () => {
      const squadPlayers = [
        // 11 starters
        ...Array.from({ length: 11 }, (_, i) => ({
          playerId: 100 + i,
          name: `Starter ${i + 1}`,
          shirtNo: i + 1,
          position: (i === 0 ? 'GK' : 'MF') as DomainPlayer['position'],
          isFirstEleven: true,
        })),
        // 2 bench players
        {
          playerId: 201,
          name: 'Bench GK',
          shirtNo: 12,
          position: 'GK' as DomainPlayer['position'],
          isFirstEleven: false,
        },
        {
          playerId: 202,
          name: 'Bench ST',
          shirtNo: 19,
          position: 'FW' as DomainPlayer['position'],
          isFirstEleven: false,
        },
      ];

      const tactical = convertSquadToTacticalPlayers(squadPlayers, {
        team: 'home',
        primaryColor: '#000000',
        aspectRatio: '16:9',
      });

      const starters = tactical.filter((p) => p.area === 'pitch');
      const bench = tactical.filter((p) => p.area === 'bench');

      expect(starters).toHaveLength(11);
      expect(bench).toHaveLength(2);

      // Home GK in full mode should have x corresponding to full pitch (~16.25) instead of half pitch (~11.19)
      const homeGk = starters[0];
      expect(homeGk.x).toBeCloseTo(16.25, 1);

      // Bench players should not be at (0, 0), and FW should come before GK
      expect(bench[0].position).toBe('FW');
      expect(bench[0].x).toBe(20);
      expect(bench[0].y).toBe(14);

      expect(bench[1].position).toBe('GK');
      expect(bench[1].x).toBe(50);
      expect(bench[1].y).toBe(14);
    });
  });

  describe('buildMatchTacticalPlayers', () => {
    it('uses mode=full by default for pitch players', () => {
      const mockMatch = {
        id: 1,
        teams: {
          home: {
            id: 10,
            name: 'Home FC',
            players: [
              {
                playerId: 1,
                name: 'GK',
                shirtNo: 1,
                position: 'GK',
                isFirstEleven: true,
              },
              ...Array.from({ length: 10 }, (_, i) => ({
                playerId: i + 2,
                name: `P${i + 2}`,
                shirtNo: i + 2,
                position: 'MF' as const,
                isFirstEleven: true,
              })),
            ],
          },
          away: {
            id: 20,
            name: 'Away FC',
            players: [
              {
                playerId: 101,
                name: 'Away GK',
                shirtNo: 1,
                position: 'GK',
                isFirstEleven: true,
              },
              ...Array.from({ length: 10 }, (_, i) => ({
                playerId: i + 102,
                name: `AP${i + 2}`,
                shirtNo: i + 2,
                position: 'MF' as const,
                isFirstEleven: true,
              })),
            ],
          },
        },
      } as unknown as Match;

      const result = buildMatchTacticalPlayers({
        match: mockMatch,
        aspectRatio: '16:9',
      });

      const homeGk = result.homePlayers.find((p) => p.position === 'GK');
      const awayGk = result.awayPlayers.find((p) => p.position === 'GK');

      // In full pitch mode: Home GK is at x~16.25, Away GK is at x~83.75 (unlike half pitch 11.19 / 88.81)
      expect(homeGk?.x).toBeCloseTo(16.25, 1);
      expect(awayGk?.x).toBeCloseTo(83.75, 1);
    });
  });

  describe('Default Formations and Slide Reset', () => {
    it('DEFAULT_4231_HOME and DEFAULT_442_AWAY have full pitch coordinates', () => {
      expect(DEFAULT_4231_HOME[0]).toMatchObject({
        position: 'GK',
        x: 7,
        y: 50,
      });
      expect(DEFAULT_442_AWAY[0]).toMatchObject({
        position: 'GK',
        x: 93,
        y: 50,
      });
    });

    it('createDefaultInitialPlayers creates players in full pitch coordinates', () => {
      const players = createDefaultInitialPlayers('#034694', '#ef4444', '16:9');
      const homeGk = players.find(
        (p) => p.team === 'home' && p.position === 'GK',
      );
      const awayGk = players.find(
        (p) => p.team === 'away' && p.position === 'GK',
      );

      expect(homeGk?.x).toBe(7);
      expect(awayGk?.x).toBe(93);
    });

    it('resetSlideKeepSquadData applies full pitch coordinates without matchFormations', () => {
      const slide = createDefaultSlide(
        0,
        's1',
        '#034694',
        '#ef4444',
        undefined,
        '16:9',
      );
      // Modify positions
      slide.players.forEach((p) => {
        p.x = 0;
        p.y = 0;
      });

      const resetSlide = resetSlideKeepSquadData(slide, '16:9');
      const homeGk = resetSlide.players.find(
        (p) => p.team === 'home' && p.position === 'GK',
      );
      const awayGk = resetSlide.players.find(
        (p) => p.team === 'away' && p.position === 'GK',
      );

      expect(homeGk?.x).toBe(7);
      expect(awayGk?.x).toBe(93);
    });
  });
});
