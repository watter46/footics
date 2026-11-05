import { describe, expect, it } from 'vitest';
import { getScreenPitchBounds } from '@/lib/tactical/pitch-geometry';
import { getFormationActualPos } from '../formations';
import { FORMATION_POSITIONS } from '../formations-data';

describe('formations getFormationActualPos', () => {
  it('places GK near defending goal line and FW near halfway line for home team (16:9)', () => {
    const bounds = getScreenPitchBounds('16:9');
    // 4-3-3: GK top=90, ST top=30
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const gk = formation433.find((p) => p.position === 'GK')!;
    const st = formation433.find((p) => p.position === 'ST')!;

    const gkPos = getFormationActualPos(gk, 'home');
    const stPos = getFormationActualPos(st, 'home');

    // GK must be near home goal (left), ST must be further forward (near halfway line)
    expect(gkPos.x).toBeLessThan(stPos.x);
    expect(gkPos.x).toBeGreaterThan(bounds.xMin);
    expect(gkPos.x).toBeLessThanOrEqual(22.0); // Inside penalty area
    expect(stPos.x).toBeLessThan(bounds.xMid); // In home half
    expect(stPos.x).toBeGreaterThan(35.0); // Advanced position
  });

  it('places GK near defending goal line and FW near halfway line for away team (16:9)', () => {
    const bounds = getScreenPitchBounds('16:9');
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const gk = formation433.find((p) => p.position === 'GK')!;
    const st = formation433.find((p) => p.position === 'ST')!;

    const gkPos = getFormationActualPos(gk, 'away');
    const stPos = getFormationActualPos(st, 'away');

    // GK must be near away goal (right), ST must be further forward (towards center)
    expect(gkPos.x).toBeGreaterThan(stPos.x);
    expect(gkPos.x).toBeGreaterThanOrEqual(78.0); // Inside away penalty area
    expect(gkPos.x).toBeLessThan(bounds.xMax);
    expect(stPos.x).toBeGreaterThan(bounds.xMid); // In away half
    expect(stPos.x).toBeLessThan(65.0); // Advanced position towards halfway line
  });

  it('places GK at bottom and FW near center for home team in vertical aspect ratio (4:5)', () => {
    const formation433 = FORMATION_POSITIONS['4-3-3'];
    const gk = formation433.find((p) => p.position === 'GK')!;
    const st = formation433.find((p) => p.position === 'ST')!;

    const gkPos = getFormationActualPos(gk, 'home', undefined, '4:5');
    const stPos = getFormationActualPos(st, 'home', undefined, '4:5');

    // Vertical pitch: Home defends bottom (large y), attacks upward (smaller y)
    expect(gkPos.y).toBeGreaterThan(stPos.y);
    expect(gkPos.y).toBeGreaterThan(80.0);
    expect(stPos.y).toBeGreaterThan(50.0);
    expect(stPos.y).toBeLessThan(75.0);
  });
});
