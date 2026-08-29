import { describe, expect, it } from 'vitest';
import {
  createHighPressBenchmarkProject,
  createLowBlockBenchmarkProject,
} from '@/lib/tactical/benchmark-presets';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';

describe('Benchmark Test Presets', () => {
  describe('Low Block Benchmark Preset', () => {
    it('creates a valid 3-slide project with boundary crop and proper duration', () => {
      const project = createLowBlockBenchmarkProject();

      expect(project.title).toContain('Low Block');
      expect(project.slides).toHaveLength(3);
      expect(project.activeSlideId).toBe(project.slides[0].id);

      // Verify boundary box is configured on slides
      expect(project.slides[0].boundaryBox?.enabled).toBe(true);
      expect(project.slides[0].boundaryBox?.width).toBe(70);

      // Verify duration calculation: transitions of slide 0 and 1
      // Slide 0: 1200ms transition + 600ms pause = 1800ms
      // Slide 1: 1400ms transition + 600ms pause = 2000ms
      // Total = 3800ms
      const totalDuration = calculateUnifiedTotalDuration(project.slides);
      expect(totalDuration).toBe(3800);

      // Verify players & zones
      expect(project.slides[0].players.length).toBeGreaterThan(0);
      expect(project.slides[0].zones.length).toBeGreaterThan(0);
      expect(project.slides[1].arrows.length).toBeGreaterThan(0);
    });
  });

  describe('High Press Benchmark Preset', () => {
    it('creates a valid 2-slide project with pressing trap and turnover shot', () => {
      const project = createHighPressBenchmarkProject();

      expect(project.title).toContain('High Press');
      expect(project.slides).toHaveLength(2);
      expect(project.slides[0].boundaryBox?.enabled).toBe(true);

      // Verify duration calculation: transition of slide 0
      // Slide 0: 1200ms transition + 600ms pause = 1800ms
      const totalDuration = calculateUnifiedTotalDuration(project.slides);
      expect(totalDuration).toBe(1800);

      // Verify arrows and player counts
      expect(project.slides[0].arrows[0].curveType).toBe('curved');
      expect(project.slides[1].ball.visible).toBe(true);
    });
  });
});
