import { describe, expect, it } from 'vitest';
import {
  createDefaultPlayer,
  createDefaultSlide,
} from '@/lib/types/tactical-unified';
import { flipSlideObjects, isVerticalPitch } from '../slide-flip-helpers';

describe('slide-flip-helpers', () => {
  describe('isVerticalPitch', () => {
    it('returns true for 9:16, 4:5, and 1:1', () => {
      expect(isVerticalPitch('9:16')).toBe(true);
      expect(isVerticalPitch('4:5')).toBe(true);
      expect(isVerticalPitch('1:1')).toBe(true);
    });

    it('returns false for 16:9, 4:3, etc.', () => {
      expect(isVerticalPitch('16:9')).toBe(false);
      expect(isVerticalPitch('4:3')).toBe(false);
      expect(isVerticalPitch(null)).toBe(false);
      expect(isVerticalPitch(undefined)).toBe(false);
    });
  });

  describe('flipSlideObjects', () => {
    it('flips Y coordinates when isVertical is true', () => {
      const slide = createDefaultSlide(0, 's1');
      slide.players = [createDefaultPlayer('home', 30, 20, '#034694')];
      slide.ball = { x: 50, y: 15, visible: true };

      const flipped = flipSlideObjects(slide, true);

      expect(flipped.players[0].x).toBe(30);
      expect(flipped.players[0].y).toBe(80); // 100 - 20
      expect(flipped.ball.x).toBe(50);
      expect(flipped.ball.y).toBe(85); // 100 - 15
    });

    it('flips X coordinates when isVertical is false', () => {
      const slide = createDefaultSlide(0, 's1');
      slide.players = [createDefaultPlayer('home', 30, 20, '#034694')];
      slide.ball = { x: 50, y: 15, visible: true };

      const flipped = flipSlideObjects(slide, false);

      expect(flipped.players[0].x).toBe(70); // 100 - 30
      expect(flipped.players[0].y).toBe(20);
      expect(flipped.ball.x).toBe(50); // 100 - 50
      expect(flipped.ball.y).toBe(15);
    });
  });
});
