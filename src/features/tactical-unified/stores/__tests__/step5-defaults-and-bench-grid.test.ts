import { describe, expect, it } from 'vitest';
import { buildMatchToDomainProject } from '@/lib/tactical/acl/match-project-translator';
import { translateSquadToDomainPlayers } from '@/lib/tactical/acl/match-squad-translator';
import { resetSlideKeepSquadPositions } from '@/lib/tactical/domain/slide-reset';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import {
  type BenchPlayer,
  DomainPlayerSchema,
} from '@/lib/types/tactical/domain-entities';
import {
  computeBenchGridPositions,
  createDefaultInitialPlayers,
  createDefaultPlayer,
  createDefaultSlide,
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
} from '@/lib/types/tactical-unified';
import type { Match } from '@/types';

describe('TASK-051 Phase 1: Step 5 Defaults and Bench Grid', () => {
  describe('DomainPlayerSchema', () => {
    it('accepts isCustom optional boolean', () => {
      const player = createDefaultPlayer('home', 10, 20, '#000000');
      const parsedWithout = DomainPlayerSchema.parse(player);
      expect(parsedWithout.isCustom).toBeUndefined();

      const parsedWith = DomainPlayerSchema.parse({
        ...player,
        isCustom: true,
      });
      expect(parsedWith.isCustom).toBe(true);
    });
  });

  describe('computeBenchGridPositions', () => {
    it('sorts players by FW -> MID -> DF -> GK -> OTHER, then by shirtNo ascending', () => {
      const baseBench = (
        id: string,
        position: string,
        shirtNo: string,
      ): BenchPlayer => ({
        ...createDefaultPlayer('home', 0, 0, '#000'),
        area: 'bench',
        x: toScreenNormCoord(0),
        y: toScreenNormCoord(0),
        id,
        position,
        shirtNo,
      });
      const pGk = baseBench('gk', 'GK', '1');
      const pDf2 = baseBench('df2', 'CB', '5');
      const pDf1 = baseBench('df1', 'LB', '3');
      const pMf = baseBench('mf', 'CM', '8');
      const pFw2 = baseBench('fw2', 'ST', '11');
      const pFw1 = baseBench('fw1', 'CF', '9');
      const pOther = baseBench('other', 'UTIL', '99');

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
      const players: BenchPlayer[] = Array.from({ length: 5 }, (_, i) => ({
        ...createDefaultPlayer('home', 0, 0, '#000'),
        area: 'bench' as const,
        x: toScreenNormCoord(0),
        y: toScreenNormCoord(0),
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

  describe('translateSquadToDomainPlayers', () => {
    it('translates starters to pitch players and non-starters to bench players', () => {
      const squadPlayers = [
        // 11 starters
        ...Array.from({ length: 11 }, (_, i) => ({
          playerId: String(100 + i),
          name: `Starter ${i + 1}`,
          shirtNo: String(i + 1),
          position: i === 0 ? ('GK' as const) : ('MID' as const),
          isStarter: true,
        })),
        // 2 bench players
        {
          playerId: '201',
          name: 'Bench GK',
          shirtNo: '12',
          position: 'GK' as const,
          isStarter: false,
        },
        {
          playerId: '202',
          name: 'Bench ST',
          shirtNo: '19',
          position: 'FW' as const,
          isStarter: false,
        },
      ];

      const tactical = translateSquadToDomainPlayers(
        squadPlayers,
        'home',
        '#000000',
      );

      const starters = tactical.filter((p) => p.area === 'pitch');
      const bench = tactical.filter((p) => p.area === 'bench');

      expect(starters).toHaveLength(11);
      expect(bench).toHaveLength(2);
      expect(starters[0].x).toBe(25);
      expect(starters[0].y).toBe(50);
      expect(bench[0].position).toBe('GK');
      expect(bench[1].position).toBe('FW');
    });
  });

  describe('buildMatchToDomainProject', () => {
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

      const { project } = buildMatchToDomainProject(mockMatch, {
        aspectRatio: '16:9',
      });

      const players = project.phases[0].slides[0].players;
      const homeGk = players.find(
        (p) => p.team === 'home' && p.position === 'GK',
      );
      const awayGk = players.find(
        (p) => p.team === 'away' && p.position === 'GK',
      );

      expect(players).toHaveLength(22);
      expect(homeGk).toBeDefined();
      expect(awayGk).toBeDefined();
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

    it('resetSlideKeepSquadPositions applies full pitch coordinates without matchFormations', () => {
      const slide = createDefaultSlide(0, 's1', '#034694', '#ef4444', '16:9');
      // Modify positions
      slide.players.forEach((p) => {
        p.x = toScreenNormCoord(0);
        p.y = toScreenNormCoord(0);
      });

      const resetSlide = resetSlideKeepSquadPositions(
        slide as unknown as Parameters<typeof resetSlideKeepSquadPositions>[0],
        '16:9',
      );
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
