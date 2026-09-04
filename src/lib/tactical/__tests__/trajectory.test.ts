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

  it('uses custom control point directly when trajectory type is custom', () => {
    const customTraj: PlayerTrajectory = {
      type: 'custom',
      controlPoint: { x: 75, y: 45 },
    };
    const cp = getBezierControlPoint(p0, p1, customTraj);
    expect(cp.x).toBe(75);
    expect(cp.y).toBe(45);

    const midPt = calculateBezierPoint(p0, p1, 0.5, customTraj);
    // 0.25*20 + 0.5*75 + 0.25*20 = 5 + 37.5 + 5 = 47.5
    // 0.25*80 + 0.5*45 + 0.25*20 = 20 + 22.5 + 5 = 47.5
    expect(midPt.x).toBeCloseTo(47.5);
    expect(midPt.y).toBeCloseTo(47.5);
  });

  it('calculates midpoint and reverses control point correctly', () => {
    const cp = { x: 80, y: 30 };
    const _mid = getBezierControlPoint(p0, p1, {
      type: 'custom',
      controlPoint: cp,
    });
    const midPt = calculateBezierPoint(p0, p1, 0.5, {
      type: 'custom',
      controlPoint: cp,
    });

    const reversedCp = {
      x: 2 * midPt.x - 0.5 * (p0.x + p1.x),
      y: 2 * midPt.y - 0.5 * (p0.y + p1.y),
    };
    expect(reversedCp.x).toBeCloseTo(cp.x);
    expect(reversedCp.y).toBeCloseTo(cp.y);
  });
});
