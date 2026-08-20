import { describe, expect, it } from 'vitest';
import {
  getLastName,
  getShirtNo,
  getSideScore,
  normalizePosition,
  parsePlayerIdFromMarkerId,
  shortenName,
  sortPlayersBy2DPositionGroup,
} from '../player-formatting';

describe('player-formatting', () => {
  describe('normalizePosition', () => {
    it('normalizes Goalkeepers to GK', () => {
      expect(normalizePosition('GK')).toBe('GK');
      expect(normalizePosition('gk')).toBe('GK');
    });

    it('normalizes Defenders to DF', () => {
      expect(normalizePosition('DF')).toBe('DF');
      expect(normalizePosition('DR')).toBe('DF');
      expect(normalizePosition('DC')).toBe('DF');
      expect(normalizePosition('DL')).toBe('DF');
      expect(normalizePosition('CB')).toBe('DF');
      expect(normalizePosition('LB')).toBe('DF');
      expect(normalizePosition('RB')).toBe('DF');
    });

    it('normalizes Midfielders to MID', () => {
      expect(normalizePosition('MID')).toBe('MID');
      expect(normalizePosition('MF')).toBe('MID');
      expect(normalizePosition('DMC')).toBe('MID');
      expect(normalizePosition('MC')).toBe('MID');
      expect(normalizePosition('AMC')).toBe('MID');
      expect(normalizePosition('AMR')).toBe('MID');
      expect(normalizePosition('AML')).toBe('MID');
      expect(normalizePosition('CM')).toBe('MID');
      expect(normalizePosition('DM')).toBe('MID');
    });

    it('normalizes Forwards to FW', () => {
      expect(normalizePosition('FW')).toBe('FW');
      expect(normalizePosition('ST')).toBe('FW');
      expect(normalizePosition('CF')).toBe('FW');
      expect(normalizePosition('SS')).toBe('FW');
    });

    it('normalizes undefined, empty, or unknown to Other', () => {
      expect(normalizePosition(undefined)).toBe('Other');
      expect(normalizePosition('')).toBe('Other');
      expect(normalizePosition('Sub')).toBe('Other');
      expect(normalizePosition('Unknown')).toBe('Other');
    });
  });
  describe('getLastName', () => {
    it('extracts last name from full name', () => {
      expect(getLastName('Lionel Messi')).toBe('Messi');
      expect(getLastName('Kylian Mbappé')).toBe('Mbappé');
      expect(getLastName('Kaoru Mitoma')).toBe('Mitoma');
    });

    it('returns single word name as is', () => {
      expect(getLastName('Neymar')).toBe('Neymar');
      expect(getLastName('Rodri')).toBe('Rodri');
    });

    it('handles multiple parts by returning the last part', () => {
      expect(getLastName('Kevin De Bruyne')).toBe('Bruyne');
      expect(getLastName('Trent Alexander-Arnold')).toBe('Alexander-Arnold');
    });

    it('handles empty or whitespace strings', () => {
      expect(getLastName('')).toBe('');
      expect(getLastName('   ')).toBe('');
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

  describe('parsePlayerIdFromMarkerId', () => {
    it('extracts playerId from marker id with hyphenated match id', () => {
      expect(parsePlayerIdFromMarkerId('chelsea-tactics-board-345003')).toBe(
        345003,
      );
      expect(parsePlayerIdFromMarkerId('uuid-1234-5678-999')).toBe(999);
      expect(parsePlayerIdFromMarkerId('15-10')).toBe(10);
      expect(parsePlayerIdFromMarkerId('10')).toBe(10);
    });

    it('returns null for ball id or invalid ids', () => {
      expect(parsePlayerIdFromMarkerId('ball')).toBeNull();
      expect(parsePlayerIdFromMarkerId('')).toBeNull();
      expect(parsePlayerIdFromMarkerId('invalid-string')).toBeNull();
    });
  });
});
