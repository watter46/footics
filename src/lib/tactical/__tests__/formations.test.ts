import { describe, expect, it } from 'vitest';
import {
  FORMATION_LIST,
  getFormationActualPos,
  getFormationActualPosVertical,
  getHalfCourtPitchPos,
  PITCH_BOUNDS_9_16,
  PITCH_BOUNDS_16_9,
} from '../../data/formations';
import { FORMATION_POSITIONS } from '../../data/formations-data';
import {
  DEFAULT_442_POSITIONS,
  parseWhoScoredFormationName,
} from '../formations';

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

  describe('getHalfCourtPitchPos', () => {
    it('places GK safely inside 6-yard box and pitch bounds (around 11.2%)', () => {
      const gkX = getHalfCourtPitchPos(10, 'home');
      // Left goal line is at 7.8125%, 6-yard box is at 12.23%
      expect(gkX).toBeGreaterThan(PITCH_BOUNDS_16_9.xMin);
      expect(gkX).toBeLessThan(12.5);
      expect(gkX).toBeCloseTo(11.19, 1);
    });

    it('places DF near the penalty area line (around 20.5%)', () => {
      const dfX = getHalfCourtPitchPos(20, 'home');
      expect(dfX).toBeCloseTo(20.47, 1);
    });

    it('places deepest FW safely before halfway line (under 50%)', () => {
      const fwX = getHalfCourtPitchPos(90, 'home');
      expect(fwX).toBeLessThan(PITCH_BOUNDS_16_9.xMid);
      expect(fwX).toBeCloseTo(46.96, 1);
    });

    it('mirrors Away positions symmetrically', () => {
      const homeGkX = getHalfCourtPitchPos(10, 'home');
      const awayGkX = getHalfCourtPitchPos(10, 'away');
      expect(awayGkX).toBeCloseTo(100 - homeGkX, 4);
      expect(awayGkX).toBeLessThan(PITCH_BOUNDS_16_9.xMax);
    });
  });

  describe('Mathematical Boundary Verification across all 28 formations', () => {
    it('verifies all 28 formations exist in FORMATION_POSITIONS with 11 players each', () => {
      expect(FORMATION_LIST.length).toBe(28);
      for (const formation of FORMATION_LIST) {
        const positions = FORMATION_POSITIONS[formation];
        expect(positions, `Formation ${formation} should exist`).toBeDefined();
        expect(
          positions.length,
          `Formation ${formation} should have 11 positions`,
        ).toBe(11);
        expect(
          positions[0].group,
          `First player in ${formation} should be GK`,
        ).toBe('GK');
      }
    });

    it('guarantees horizontal Full Mode positions are strictly bounded within pitch lines', () => {
      for (const formation of FORMATION_LIST) {
        const positions = FORMATION_POSITIONS[formation];

        // Home team
        positions.forEach((pos, idx) => {
          const actual = getFormationActualPos(pos, 'home', 'full');
          expect(actual.x).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.xMin);
          expect(actual.x).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.xMax);
          expect(actual.y).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.yMin);
          expect(actual.y).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.yMax);

          if (idx === 0) {
            // GK should be inside penalty area [7.81%, 21.07%]
            expect(actual.x).toBeGreaterThan(PITCH_BOUNDS_16_9.xMin);
            expect(actual.x).toBeLessThanOrEqual(22.0);
          }
        });

        // Away team
        positions.forEach((pos, idx) => {
          const actual = getFormationActualPos(pos, 'away', 'full');
          expect(actual.x).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.xMin);
          expect(actual.x).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.xMax);
          expect(actual.y).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.yMin);
          expect(actual.y).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.yMax);

          if (idx === 0) {
            // Away GK should be inside away penalty area [78.93%, 92.19%]
            expect(actual.x).toBeGreaterThanOrEqual(78.0);
            expect(actual.x).toBeLessThan(PITCH_BOUNDS_16_9.xMax);
          }
        });
      }
    });

    it('guarantees horizontal Half Mode positions are strictly bounded within each defending half of pitch', () => {
      for (const formation of FORMATION_LIST) {
        const positions = FORMATION_POSITIONS[formation];

        // Home team: must be inside home half [PITCH_BOUNDS_16_9.xMin, 50.0]
        positions.forEach((pos, idx) => {
          const actual = getFormationActualPos(pos, 'home', 'half');
          expect(
            actual.x,
            `${formation} Home player ${idx} x`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.xMin);
          expect(
            actual.x,
            `${formation} Home player ${idx} x`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.xMid);
          expect(
            actual.y,
            `${formation} Home player ${idx} y`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.yMin);
          expect(
            actual.y,
            `${formation} Home player ${idx} y`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.yMax);

          if (idx === 0) {
            // GK in safe 6-yard box zone [PITCH_BOUNDS_16_9.xMin, 12.5%]
            expect(actual.x, `${formation} Home GK x`).toBeGreaterThan(
              PITCH_BOUNDS_16_9.xMin,
            );
            expect(actual.x, `${formation} Home GK x`).toBeLessThanOrEqual(
              12.5,
            );
          }
        });

        // Away team: must be inside away half [50.0, PITCH_BOUNDS_16_9.xMax]
        positions.forEach((pos, idx) => {
          const actual = getFormationActualPos(pos, 'away', 'half');
          expect(
            actual.x,
            `${formation} Away player ${idx} x`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.xMid);
          expect(
            actual.x,
            `${formation} Away player ${idx} x`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.xMax);
          expect(
            actual.y,
            `${formation} Away player ${idx} y`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.yMin);
          expect(
            actual.y,
            `${formation} Away player ${idx} y`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.yMax);

          if (idx === 0) {
            // Away GK in safe 6-yard box zone [87.5%, PITCH_BOUNDS_16_9.xMax]
            expect(actual.x, `${formation} Away GK x`).toBeGreaterThanOrEqual(
              87.5,
            );
            expect(actual.x, `${formation} Away GK x`).toBeLessThan(
              PITCH_BOUNDS_16_9.xMax,
            );
          }
        });
      }
    });

    it('guarantees vertical Half Mode positions are strictly bounded within pitch lines', () => {
      for (const formation of FORMATION_LIST) {
        const positions = FORMATION_POSITIONS[formation];

        // Home team: defending bottom y in [50.0, PITCH_BOUNDS_9_16.yMax]
        positions.forEach((pos, idx) => {
          const actual = getFormationActualPosVertical(pos, 'home', 'half');
          expect(
            actual.y,
            `${formation} Vertical Home player ${idx} y`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_9_16.yMid);
          expect(
            actual.y,
            `${formation} Vertical Home player ${idx} y`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_9_16.yMax);
          expect(
            actual.x,
            `${formation} Vertical Home player ${idx} x`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_9_16.xMin);
          expect(
            actual.x,
            `${formation} Vertical Home player ${idx} x`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_9_16.xMax);

          if (idx === 0) {
            // Home GK near bottom goal
            expect(actual.y, `${formation} Vertical Home GK y`).toBeGreaterThan(
              87.5,
            );
            expect(
              actual.y,
              `${formation} Vertical Home GK y`,
            ).toBeLessThanOrEqual(PITCH_BOUNDS_9_16.yMax);
          }
        });

        // Away team: defending top y in [PITCH_BOUNDS_9_16.yMin, 50.0]
        positions.forEach((pos, idx) => {
          const actual = getFormationActualPosVertical(pos, 'away', 'half');
          expect(
            actual.y,
            `${formation} Vertical Away player ${idx} y`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_9_16.yMin);
          expect(
            actual.y,
            `${formation} Vertical Away player ${idx} y`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_9_16.yMid);
          expect(
            actual.x,
            `${formation} Vertical Away player ${idx} x`,
          ).toBeGreaterThanOrEqual(PITCH_BOUNDS_9_16.xMin);
          expect(
            actual.x,
            `${formation} Vertical Away player ${idx} x`,
          ).toBeLessThanOrEqual(PITCH_BOUNDS_9_16.xMax);

          if (idx === 0) {
            // Away GK near top goal
            expect(
              actual.y,
              `${formation} Vertical Away GK y`,
            ).toBeGreaterThanOrEqual(PITCH_BOUNDS_9_16.yMin);
            expect(actual.y, `${formation} Vertical Away GK y`).toBeLessThan(
              12.5,
            );
          }
        });
      }
    });

    it('guarantees DEFAULT_442_POSITIONS are properly bounded on pitch', () => {
      expect(DEFAULT_442_POSITIONS.home.length).toBe(11);
      expect(DEFAULT_442_POSITIONS.away.length).toBe(11);

      // Home GK inside 6-yard box
      expect(DEFAULT_442_POSITIONS.home[0].x).toBeCloseTo(11.19, 1);
      expect(DEFAULT_442_POSITIONS.home[0].y).toBeCloseTo(50.0, 1);

      // Away GK inside 6-yard box
      expect(DEFAULT_442_POSITIONS.away[0].x).toBeCloseTo(88.81, 1);
      expect(DEFAULT_442_POSITIONS.away[0].y).toBeCloseTo(50.0, 1);

      DEFAULT_442_POSITIONS.home.forEach((pos) => {
        expect(pos.x).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.xMin);
        expect(pos.x).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.xMid);
      });

      DEFAULT_442_POSITIONS.away.forEach((pos) => {
        expect(pos.x).toBeGreaterThanOrEqual(PITCH_BOUNDS_16_9.xMid);
        expect(pos.x).toBeLessThanOrEqual(PITCH_BOUNDS_16_9.xMax);
      });
    });
  });
});
