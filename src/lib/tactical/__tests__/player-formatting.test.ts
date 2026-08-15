import { describe, expect, it } from 'vitest';
import {
  getShirtNo,
  getSideScore,
  shortenName,
  sortPlayersBy2DPositionGroup,
} from '../player-formatting';

describe('player-formatting', () => {
  describe('shortenName', () => {
    it('shortens first name and keeps last name', () => {
      expect(shortenName('Enzo Fernandez')).toBe('E. Fernandez');
    });

    it('returns the same string if it is a single word', () => {
      expect(shortenName('Neymar')).toBe('Neymar');
    });

    it('handles multiple names correctly', () => {
      expect(shortenName('Kevin De Bruyne')).toBe('K. Bruyne');
    });
  });

  describe('getShirtNo', () => {
    it('extracts shirtNo correctly', () => {
      expect(getShirtNo({ shirtNo: 10 })).toBe('10');
      expect(getShirtNo({ number: 9 })).toBe('9');
      expect(getShirtNo({ jerseyNumber: 7 })).toBe('7');
    });

    it('returns empty string if no valid property is found', () => {
      expect(getShirtNo(null)).toBe('');
      expect(getShirtNo({ name: 'Player' })).toBe('');
    });
  });

  describe('getSideScore', () => {
    it('scores left side positions as 1', () => {
      expect(getSideScore('DL')).toBe(1);
      expect(getSideScore('LWB')).toBe(1);
      expect(getSideScore('LW')).toBe(1);
    });

    it('scores right side positions as 3', () => {
      expect(getSideScore('DR')).toBe(3);
      expect(getSideScore('RWB')).toBe(3);
      expect(getSideScore('RW')).toBe(3);
    });

    it('scores center side positions as 2', () => {
      expect(getSideScore('DC')).toBe(2);
      expect(getSideScore('MC')).toBe(2);
      expect(getSideScore('ST')).toBe(2);
    });
  });

  describe('sortPlayersBy2DPositionGroup', () => {
    it('sorts players by vertical group (GK->DF->MF->FW) then horizontal (Left->Center->Right)', () => {
      const players = [
        { id: 1, position: 'ST' }, // FW, Center (4, 2)
        { id: 2, position: 'GK' }, // GK, Center (1, 2)
        { id: 3, position: 'DR' }, // DF, Right (2, 3)
        { id: 4, position: 'DL' }, // DF, Left (2, 1)
        { id: 5, position: 'MC' }, // MF, Center (3, 2)
      ];

      const sorted = sortPlayersBy2DPositionGroup(players);
      expect(sorted.map((p) => p.id)).toEqual([2, 4, 3, 5, 1]);
    });
  });
});
