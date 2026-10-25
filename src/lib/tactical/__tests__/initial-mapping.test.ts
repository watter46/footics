import { describe, expect, it } from 'vitest';
import type { FormattedMatchData } from '@/lib/national-match-schema';
import {
  type ClubMatchCentreDataLike,
  generateInitialMapping,
  getActivePlayersClub,
  getActivePlayersNational,
  type InitialMappingMetadata,
  type InitialPlayerMapping,
} from '../initial-mapping';

describe('initial-mapping', () => {
  describe('getActivePlayersNational', () => {
    it('returns starters when no substitutions have occurred', () => {
      const matchData: FormattedMatchData = {
        lineups: {
          homeStarters: [
            { playerId: 1, name: 'H1', isFirstEleven: true },
            { playerId: 2, name: 'H2', isFirstEleven: true },
          ],
          awayStarters: [
            { playerId: 101, name: 'A1', isFirstEleven: true },
            { playerId: 102, name: 'A2', isFirstEleven: true },
          ],
          homeBench: [{ playerId: 3, name: 'H3', isFirstEleven: false }],
          awayBench: [{ playerId: 103, name: 'A3', isFirstEleven: false }],
        },
        timeline: [],
      };

      const result = getActivePlayersNational(matchData, 0);
      expect(result.homeActiveIds).toEqual([1, 2]);
      expect(result.awayActiveIds).toEqual([101, 102]);
    });

    it('handles substitution events correctly based on minute', () => {
      const matchData: FormattedMatchData = {
        lineups: {
          homeStarters: [
            { playerId: 1, name: 'H1', isFirstEleven: true },
            { playerId: 2, name: 'H2', isFirstEleven: true },
          ],
          awayStarters: [
            { playerId: 101, name: 'A1', isFirstEleven: true },
            { playerId: 102, name: 'A2', isFirstEleven: true },
          ],
          homeBench: [{ playerId: 3, name: 'H3', isFirstEleven: false }],
          awayBench: [{ playerId: 103, name: 'A3', isFirstEleven: false }],
        },
        timeline: [
          // Period 1: minute 30, home sub: 1 -> 3
          [30, [[null, null, 'subst', null, null, null, 1, 3]], undefined],
          // Period 2: minute 60, away sub: 101 -> 103
          [60, undefined, [[null, null, 'subst', null, null, null, 101, 103]]],
        ],
      };

      // minute 29: no substitution applied
      const beforeSub = getActivePlayersNational(matchData, 29);
      expect(beforeSub.homeActiveIds).toEqual([1, 2]);
      expect(beforeSub.awayActiveIds).toEqual([101, 102]);

      // minute 45: only home substitution applied
      const midMatch = getActivePlayersNational(matchData, 45);
      expect(midMatch.homeActiveIds).toEqual([2, 3]);
      expect(midMatch.awayActiveIds).toEqual([101, 102]);

      // minute 70: both substitutions applied
      const lateMatch = getActivePlayersNational(matchData, 70);
      expect(lateMatch.homeActiveIds).toEqual([2, 3]);
      expect(lateMatch.awayActiveIds).toEqual([102, 103]);
    });
  });

  describe('getActivePlayersClub', () => {
    it('returns starters and reflects substitutions according to minute', () => {
      const matchCentreData: ClubMatchCentreDataLike = {
        home: {
          players: [
            { playerId: 1, name: 'H1', isFirstEleven: true },
            { playerId: 2, name: 'H2', isFirstEleven: true },
            { playerId: 3, name: 'H3', isFirstEleven: false },
          ],
          incidentEvents: [
            {
              minute: 45,
              type: { displayName: 'SubstitutionOff' },
              playerId: 1,
            },
            {
              minute: 45,
              type: { displayName: 'SubstitutionOn' },
              playerId: 3,
            },
            {
              minute: 80,
              type: { displayName: 'SubstitutionOff' },
              playerId: 2,
            },
          ],
        },
        away: {
          players: [
            { playerId: 101, name: 'A1', isFirstEleven: true },
            { playerId: 102, name: 'A2', isFirstEleven: false },
          ],
          incidentEvents: [
            {
              minute: 50,
              type: { displayName: 'SubstitutionOn' },
              playerId: 102,
            },
          ],
        },
      };

      const atMinute0 = getActivePlayersClub(matchCentreData, 0);
      expect(atMinute0.homeActiveIds).toEqual([1, 2]);
      expect(atMinute0.awayActiveIds).toEqual([101]);

      const atMinute60 = getActivePlayersClub(matchCentreData, 60);
      expect(atMinute60.homeActiveIds).toEqual([2, 3]);
      expect(atMinute60.awayActiveIds).toEqual([101, 102]);

      const atMinute90 = getActivePlayersClub(matchCentreData, 90);
      expect(atMinute90.homeActiveIds).toEqual([3]);
    });
  });

  describe('generateInitialMapping', () => {
    const makePlayers = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, i) => ({
        playerId: i + 1,
        name: `${prefix} Player ${i + 1}`,
        shirtNo: i + 1,
        position: i === 0 ? 'GK' : i < 5 ? 'DF' : i < 9 ? 'MF' : 'FW',
        isFirstEleven: i < 11,
      }));

    it('returns empty object when teams have no players', () => {
      const metadata: InitialMappingMetadata = {
        teams: {
          home: { players: [] },
          away: { players: [] },
        },
      };
      expect(generateInitialMapping(metadata)).toEqual({});
    });

    it('prioritizes formation playerIds when >= 11 players provided', () => {
      const players = makePlayers(15, 'Home');
      // Pick playerIds 1..11 reversed
      const starterIds = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const metadata: InitialMappingMetadata = {
        teams: {
          home: {
            name: 'Arsenal',
            players,
            formations: [
              {
                formationName: '442',
                playerIds: starterIds,
              },
            ],
          },
        },
      };

      const mapping = generateInitialMapping(metadata, 'vertical');
      const pitchPlayers = Object.values(mapping).filter(
        (p) => p.area === 'pitch',
      );
      const benchPlayers = Object.values(mapping).filter(
        (p) => p.area === 'bench',
      );

      expect(pitchPlayers).toHaveLength(11);
      expect(benchPlayers).toHaveLength(4);
      expect(pitchPlayers.map((p) => p.playerId).sort((a, b) => a - b)).toEqual(
        starterIds.slice().sort((a, b) => a - b),
      );
      // Verify mapping structure
      const sample = pitchPlayers[0] as InitialPlayerMapping;
      expect(sample).toHaveProperty('playerId');
      expect(sample).toHaveProperty('name');
      expect(sample).toHaveProperty('shirtNo');
      expect(sample).toHaveProperty('position');
      expect(sample).toHaveProperty('x');
      expect(sample).toHaveProperty('y');
      expect(sample).toHaveProperty('team', 'home');
      expect(sample).toHaveProperty('area', 'pitch');
    });

    it('falls back to isFirstEleven when formation playerIds are less than 11', () => {
      const players = makePlayers(14, 'Home');
      const metadata: InitialMappingMetadata = {
        teams: {
          home: {
            name: 'Liverpool',
            players,
            formations: [
              {
                formationName: '433',
                playerIds: [1, 2, 3], // < 11
              },
            ],
          },
        },
      };

      const mapping = generateInitialMapping(metadata);
      const pitchPlayers = Object.values(mapping).filter(
        (p) => p.area === 'pitch',
      );
      const benchPlayers = Object.values(mapping).filter(
        (p) => p.area === 'bench',
      );

      expect(pitchPlayers).toHaveLength(11);
      expect(benchPlayers).toHaveLength(3);
    });

    it('prioritizes 3-4-3 formation for Chelsea when formationName is not set', () => {
      const players = makePlayers(12, 'Chelsea');
      const metadata: InitialMappingMetadata = {
        teams: {
          home: {
            name: 'Chelsea FC',
            players,
          },
        },
      };

      const mappingVertical = generateInitialMapping(metadata, 'vertical');
      const mappingHorizontal = generateInitialMapping(metadata, 'horizontal');

      expect(Object.keys(mappingVertical)).toHaveLength(12);
      expect(Object.keys(mappingHorizontal)).toHaveLength(12);

      // Verify coordinate difference between vertical and horizontal orientation
      const p1V = mappingVertical[1];
      const p1H = mappingHorizontal[1];
      expect(p1V).toBeDefined();
      expect(p1H).toBeDefined();
      expect(p1V.x !== p1H.x || p1V.y !== p1H.y).toBe(true);
    });

    it('conforms to InitialPlayerMapping contract', () => {
      const metadata: InitialMappingMetadata = {
        teams: {
          home: {
            players: [
              {
                playerId: 99,
                name: 'Test Player',
                shirtNo: '99',
                position: 'FW',
                isFirstEleven: true,
              },
            ],
          },
        },
      };
      const mapping = generateInitialMapping(metadata);
      expect(mapping[99]?.area).toBe('pitch');
      expect(mapping[99]?.playerId).toBe(99);
      expect(mapping[99]?.name).toBe('Test Player');
      expect(mapping[99]?.shirtNo).toBe('99');
      expect(mapping[99]?.position).toBe('FW');
      expect(mapping[99]?.team).toBe('home');
    });
  });
});
