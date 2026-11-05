import { describe, expect, it } from 'vitest';
import { getScreenPitchBounds } from '@/lib/tactical/pitch-geometry';
import { getFormationActualPos } from '../formations';
import { FORMATION_POSITIONS } from '../formations-data';

describe('formations getFormationActualPos', () => {
  it('places GK near defending goal line and FW near halfway line for home team in half mode (16:9)', () => {
    const bounds = getScreenPitchBounds('16:9');
    // 4-3-3: GK top=90, ST top=30
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const gk = formation433.find((p) => p.position === 'GK')!;
    const st = formation433.find((p) => p.position === 'ST')!;

    const gkPos = getFormationActualPos(gk, 'home', 'half');
    const stPos = getFormationActualPos(st, 'home', 'half');

    // GK must be near home goal (left), ST must be further forward (near halfway line)
    expect(gkPos.x).toBeLessThan(stPos.x);
    expect(gkPos.x).toBeGreaterThan(bounds.xMin);
    expect(gkPos.x).toBeLessThanOrEqual(22.0); // Inside penalty area
    expect(stPos.x).toBeLessThan(bounds.xMid); // In home half
    expect(stPos.x).toBeGreaterThan(35.0); // Advanced position
  });

  it('places GK near defending goal line and FW near halfway line for away team in half mode (16:9)', () => {
    const bounds = getScreenPitchBounds('16:9');
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const gk = formation433.find((p) => p.position === 'GK')!;
    const st = formation433.find((p) => p.position === 'ST')!;

    const gkPos = getFormationActualPos(gk, 'away', 'half');
    const stPos = getFormationActualPos(st, 'away', 'half');

    // GK must be near away goal (right), ST must be further forward (towards center)
    expect(gkPos.x).toBeGreaterThan(stPos.x);
    expect(gkPos.x).toBeGreaterThanOrEqual(78.0); // Inside away penalty area
    expect(gkPos.x).toBeLessThan(bounds.xMax);
    expect(stPos.x).toBeGreaterThan(bounds.xMid); // In away half
    expect(stPos.x).toBeLessThan(65.0); // Advanced position towards halfway line
  });

  it('expands across full pitch for full mode (default) (16:9)', () => {
    const bounds = getScreenPitchBounds('16:9');
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const st = formation433.find((p) => p.position === 'ST')!;

    // Default mode must be 'full'
    const stPosDefault = getFormationActualPos(st, 'home');
    const stPosFull = getFormationActualPos(st, 'home', 'full');
    expect(stPosDefault.x).toBeCloseTo(stPosFull.x);
    expect(stPosDefault.y).toBeCloseTo(stPosFull.y);

    // In full mode, Home ST (top=30) penetrates into opponent half (> xMid)
    expect(stPosFull.x).toBeGreaterThan(bounds.xMid);

    // For away team, ST penetrates into home half (< xMid)
    const stPosAwayDefault = getFormationActualPos(st, 'away');
    const stPosAwayFull = getFormationActualPos(st, 'away', 'full');
    expect(stPosAwayDefault.x).toBeCloseTo(stPosAwayFull.x);
    expect(stPosAwayDefault.y).toBeCloseTo(stPosAwayFull.y);
    expect(stPosAwayFull.x).toBeLessThan(bounds.xMid);
  });

  it('respects full vs half mode in vertical aspect ratio (4:5)', () => {
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const st = formation433.find((p) => p.position === 'ST')!;

    const stPosHalf = getFormationActualPos(st, 'home', 'half', '4:5');
    const stPosFull = getFormationActualPos(st, 'home', 'full', '4:5');

    // Home attacks upward (smaller y). Full mode penetrates opponent half (< 50)
    expect(stPosHalf.y).toBeGreaterThan(50.0);
    expect(stPosFull.y).toBeLessThan(50.0);
  });

  it('expands wingers across full width in vertical aspect ratios within screen pitch bounds', () => {
    // 4-3-3: LW left=20, RW left=80
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const lw = formation433.find((p) => p.position === 'LW')!;
    const rw = formation433.find((p) => p.position === 'RW')!;

    // 4:5: bounds.xMin ≈ 28.85%, bounds.xMax ≈ 71.15%, span ≈ 42.3%
    // LW (left=20): 28.85 + 0.20 * 42.3 = 37.31%
    // RW (left=80): 28.85 + 0.80 * 42.3 = 62.69%
    const lwPos45 = getFormationActualPos(lw, 'home', 'full', '4:5');
    const rwPos45 = getFormationActualPos(rw, 'home', 'full', '4:5');
    expect(lwPos45.x).toBeCloseTo(37.31, 1);
    expect(rwPos45.x).toBeCloseTo(62.69, 1);
    expect(rwPos45.x - lwPos45.x).toBeCloseTo(25.38, 1);

    for (const ratio of ['4:5', '9:16', '1:1'] as const) {
      const bounds = getScreenPitchBounds(ratio);
      const lwPos = getFormationActualPos(lw, 'home', 'full', ratio);
      const rwPos = getFormationActualPos(rw, 'home', 'full', ratio);

      expect(lwPos.x).toBeGreaterThanOrEqual(bounds.xMin);
      expect(rwPos.x).toBeLessThanOrEqual(bounds.xMax);
      expect(rwPos.x).toBeGreaterThan(lwPos.x);
    }
  });
});
