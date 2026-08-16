import { describe, expect, it } from 'vitest';
import {
  calculateBezierPoint,
  getBezierControlPoint,
  type PlayerTrajectory,
} from '../trajectory';

describe('trajectory utility', () => {
  const p0 = { x: 20, y: 80 };
  const p1 = { x: 20, y: 20 };

  it('calculates linear midpoint for straight trajectory', () => {
    const straightTraj: PlayerTrajectory = { type: 'straight' };
    const pt = calculateBezierPoint(p0, p1, 0.5, straightTraj);
    expect(pt.x).toBeCloseTo(20);
    expect(pt.y).toBeCloseTo(50);
  });

  it('calculates curved control point and arc offset for arc_right', () => {
    const arcRightTraj: PlayerTrajectory = {
      type: 'arc_right',
      curveOffset: 30,
    };
    const cp = getBezierControlPoint(p0, p1, arcRightTraj);
    // dx = 0, dy = -60, dist = 60
    // normX = -(-60)/60 = 1, normY = 0
    // offset = 60 * 30 / 100 = 18
    // cp.x = 20 + 1 * 18 = 38
    expect(cp.x).toBeCloseTo(38);
    expect(cp.y).toBeCloseTo(50);

    const midPt = calculateBezierPoint(p0, p1, 0.5, arcRightTraj);
    // Bezier midpoint with cp: 0.25*20 + 0.5*38 + 0.25*20 = 5 + 19 + 5 = 29
    expect(midPt.x).toBeCloseTo(29);
    expect(midPt.y).toBeCloseTo(50);
  });

  it('calculates curved control point and arc offset for arc_left', () => {
    const arcLeftTraj: PlayerTrajectory = {
      type: 'arc_left',
      curveOffset: 30,
    };
    const cp = getBezierControlPoint(p0, p1, arcLeftTraj);
    expect(cp.x).toBeCloseTo(2); // 20 - 18 = 2
    expect(cp.y).toBeCloseTo(50);

    const midPt = calculateBezierPoint(p0, p1, 0.5, arcLeftTraj);
    expect(midPt.x).toBeCloseTo(11); // 20 - 9 = 11
    expect(midPt.y).toBeCloseTo(50);
  });
});
