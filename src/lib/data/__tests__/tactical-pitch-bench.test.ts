import { describe, expect, it } from 'vitest';
import {
  normalizePitchCoordinate,
  type PitchDimensions,
  type PitchPoint,
} from '../tactical-pitch-bench';

describe('normalizePitchCoordinate', () => {
  it('normalizes zero coordinates correctly', () => {
    const point: PitchPoint = { x: 0, y: 0 };
    const result = normalizePitchCoordinate(point);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('normalizes maximum coordinates correctly to 100%', () => {
    const point: PitchPoint = { x: 105, y: 68 };
    const result = normalizePitchCoordinate(point);
    expect(result).toEqual({ x: 100, y: 100 });
  });

  it('normalizes center and regular coordinates correctly', () => {
    const center: PitchPoint = { x: 52.5, y: 34 };
    const centerResult = normalizePitchCoordinate(center);
    expect(centerResult).toEqual({ x: 50, y: 50 });

    const regular: PitchPoint = { x: 26.25, y: 17 };
    const regularResult = normalizePitchCoordinate(regular);
    expect(regularResult).toEqual({ x: 25, y: 25 });
  });

  it('clamps coordinates that fall below lower bound (negative coordinates)', () => {
    const point: PitchPoint = { x: -10, y: -5 };
    const result = normalizePitchCoordinate(point);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('clamps coordinates that exceed upper bound', () => {
    const point: PitchPoint = { x: 120, y: 80 };
    const result = normalizePitchCoordinate(point);
    expect(result).toEqual({ x: 100, y: 100 });
  });

  it('handles custom pitch dimensions properly', () => {
    const customDim: PitchDimensions = { width: 100, height: 50 };
    const point: PitchPoint = { x: 50, y: 25 };
    const result = normalizePitchCoordinate(point, customDim);
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it('falls back to default dimensions when non-positive dimensions are given', () => {
    const invalidDim: PitchDimensions = { width: 0, height: -10 };
    const point: PitchPoint = { x: 52.5, y: 34 };
    const result = normalizePitchCoordinate(point, invalidDim);
    expect(result).toEqual({ x: 50, y: 50 });
  });
});
