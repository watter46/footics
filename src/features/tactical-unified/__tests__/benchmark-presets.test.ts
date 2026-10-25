import { describe, expect, it } from 'vitest';
import {
  createHighPressBenchmarkProject,
  createLowBlockBenchmarkProject,
  createTenSlideFullSequenceBenchmarkProject,
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

      // Verify duration calculation: arrival transitions of slide 1 and 2
      // Slide 1: 1400ms transition + 600ms pause = 2000ms
      // Slide 2: 1400ms transition + 800ms pause = 2200ms
      // Total = 4200ms
      const totalDuration = calculateUnifiedTotalDuration(project.slides);
      expect(totalDuration).toBe(4200);

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

      // Verify duration calculation: arrival transition of slide 1
      // Slide 1: 1400ms transition + 600ms pause = 2000ms
      const totalDuration = calculateUnifiedTotalDuration(project.slides);
      expect(totalDuration).toBe(2000);

      // Verify arrows and player counts
      expect(project.slides[0].arrows[0].curveType).toBe('curved');
      expect(project.slides[1].ball.visible).toBe(true);
    });
  });

  describe('10-Slide Full Sequence Benchmark Preset', () => {
    it('creates a valid 10-slide project (~16.2s total duration)', () => {
      const project = createTenSlideFullSequenceBenchmarkProject();

      expect(project.title).toContain('10-Slide Full Progression');
      expect(project.slides).toHaveLength(10);
      expect(project.activeSlideId).toBe(project.slides[0].id);

      // 9 transitions of (1200ms + 600ms) = 16200ms (~16.2s)
      const totalDuration = calculateUnifiedTotalDuration(project.slides);
      expect(totalDuration).toBe(16200);

      // Verify players, boundary box and progression
      expect(project.slides[0].players.length).toBe(22); // 11 vs 11
      expect(project.slides[9].players.length).toBe(22);
      expect(project.slides[0].boundaryBox?.enabled).toBe(true);
      expect(project.slides[0].zones.length).toBeGreaterThan(0);
    });
  });
});
