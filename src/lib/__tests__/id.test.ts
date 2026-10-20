import { describe, expect, it } from 'vitest';
import { generateId } from '../id';

describe('generateId', () => {
  it('generates a non-empty unique string ID', () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
    expect(id1).not.toBe(id2);
  });

  it('generates an ID with the given prefix', () => {
    const id = generateId('player');

    expect(id.startsWith('player_')).toBe(true);
    expect(id.length).toBeGreaterThan('player_'.length);
  });
});
