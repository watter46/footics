import { describe, expect, it } from 'vitest';
import { parseWhoScoredFormationName } from '../formations';

describe('formations', () => {
  describe('parseWhoScoredFormationName', () => {
    it('returns exact match if present in FORMATION_LIST', () => {
      expect(parseWhoScoredFormationName('4-2-3-1')).toBe('4-2-3-1');
      expect(parseWhoScoredFormationName('3-5-2')).toBe('3-5-2');
    });

    it('parses unhyphenated digits into hyphenated string', () => {
      expect(parseWhoScoredFormationName('4231')).toBe('4-2-3-1');
      expect(parseWhoScoredFormationName('433')).toBe('4-3-3');
    });

    it('returns 4-4-2 if not provided or unknown', () => {
      expect(parseWhoScoredFormationName(undefined)).toBe('4-4-2');
      expect(parseWhoScoredFormationName('')).toBe('4-4-2');
      expect(parseWhoScoredFormationName('9999')).toBe('4-4-2');
    });
  });
});
