import { describe, expect, it } from 'vitest';
import type { Match } from '@/types';
import { extractAvailableSeasons, getSeasonFromDate } from '../season-utils';

describe('season-utils', () => {
  describe('getSeasonFromDate', () => {
    it('returns 26-27 for August 2026', () => {
      expect(getSeasonFromDate('2026-08-20T04:00:00.000Z')).toBe('26-27');
      expect(getSeasonFromDate('2026-08-01')).toBe('26-27');
    });

    it('returns 26-27 for January to June 2027', () => {
      expect(getSeasonFromDate('2027-01-15')).toBe('26-27');
      expect(getSeasonFromDate('2027-05-30')).toBe('26-27');
      expect(getSeasonFromDate('2027-06-30')).toBe('26-27');
    });

    it('returns 24-25 for matches in 2024 autumn and 2025 spring', () => {
      expect(getSeasonFromDate('2024-08-18')).toBe('24-25');
      expect(getSeasonFromDate('2024-12-25')).toBe('24-25');
      expect(getSeasonFromDate('2025-02-10')).toBe('24-25');
      expect(getSeasonFromDate('2025-05-18')).toBe('24-25');
    });

    it('returns 25-26 for matches in 2025 autumn and 2026 spring', () => {
      expect(getSeasonFromDate('2025-08-15')).toBe('25-26');
      expect(getSeasonFromDate('2026-04-12')).toBe('25-26');
    });

    it('handles null / undefined / invalid date with fallback', () => {
      expect(getSeasonFromDate(null, 2026)).toBe('26-27');
      expect(getSeasonFromDate(undefined, 2024)).toBe('24-25');
      expect(getSeasonFromDate('invalid-date', 2026)).toBe('26-27');
    });
  });

  describe('extractAvailableSeasons', () => {
    it('extracts unique seasons from matches and default seasons in descending order', () => {
      const matches: Match[] = [
        {
          id: '1',
          date: '2024-09-01',
          score: '1-0',
          matchType: 'club',
          homeTeam: { id: 1, name: 'Chelsea' },
          awayTeam: { id: 2, name: 'Arsenal' },
          playerIdNameDictionary: {},
          teams: {
            home: { teamId: 1, name: 'Chelsea', players: [] },
            away: { teamId: 2, name: 'Arsenal', players: [] },
          },
        },
        {
          id: '2',
          date: '2027-08-15', // 27-28 season
          score: '2-2',
          matchType: 'club',
          homeTeam: { id: 1, name: 'Chelsea' },
          awayTeam: { id: 3, name: 'Liverpool' },
          playerIdNameDictionary: {},
          teams: {
            home: { teamId: 1, name: 'Chelsea', players: [] },
            away: { teamId: 3, name: 'Liverpool', players: [] },
          },
        },
      ];

      const result = extractAvailableSeasons(matches, [
        '26-27',
        '25-26',
        '24-25',
      ]);
      expect(result).toEqual(['27-28', '26-27', '25-26', '24-25']);
    });
  });
});
