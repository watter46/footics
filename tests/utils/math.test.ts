import { describe, expect, it } from 'vitest';
import { add, subtract } from '../../src/utils/math';

describe('math utils', () => {
  describe('add', () => {
    it('correctly adds two numbers', () => {
      expect(add(1, 2)).toBe(3);
    });
  });

  describe('subtract', () => {
    it('correctly subtracts two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });
});
