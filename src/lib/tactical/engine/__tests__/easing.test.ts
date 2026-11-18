import { describe, expect, it } from 'vitest';
import { applyEasing, TRANSITION_EASING_OPTIONS } from '../easing';

describe('engine/easing', () => {
  it('clamps t to [0, 1] and applies linear easing', () => {
    expect(applyEasing(-0.5, 'linear')).toBe(0);
    expect(applyEasing(1.5, 'linear')).toBe(1);
    expect(applyEasing(0.5, 'linear')).toBe(0.5);
  });

  it('applies ease-in-out easing at boundary and midpoint values', () => {
    expect(applyEasing(0, 'ease-in-out')).toBe(0);
    expect(applyEasing(0.5, 'ease-in-out')).toBe(0.5);
    expect(applyEasing(1, 'ease-in-out')).toBe(1);
  });

  it('exports TRANSITION_EASING_OPTIONS with the 4 expected easing values', () => {
    const values = TRANSITION_EASING_OPTIONS.map((opt) => opt.value);
    expect(values).toEqual(['ease-in-out', 'linear', 'ease-in', 'ease-out']);
  });
});
