import { describe, expect, it } from 'vitest';
import { computeArrowDimensions } from '@/features/tactical-unified/core/components/annotations/arrow-geometry';
import { getWavyPoints } from '@/features/tactical-unified/core/components/annotations/wavy-arrow-math';
import type {
  ArrowEffectConfig,
  ZoneEffectConfig,
} from '@/lib/types/tactical/annotations';
import type { MarkerEffectConfig } from '@/lib/types/tactical/player';
import type { NormalizedPoint } from '@/lib/types/tactical/primitives';
import {
  computeArrowEffectState,
  computeArrowFlowDashOffset,
  computeRippleRings,
  computeZonePulseOpacity,
  trimRenderPoints,
} from '../effect-geometry';

describe('effect-geometry', () => {
  describe('computeArrowEffectState', () => {
    it('returns default full visibility and progress when config is undefined or type is none', () => {
      expect(computeArrowEffectState(500, undefined)).toEqual({
        progress: 1.0,
        opacity: 1.0,
        visible: true,
      });

      expect(
        computeArrowEffectState(500, {
          type: 'none',
          delay: 0.5,
          duration: 0.8,
          holdDuration: 0.5,
          exitAction: 'keep',
          fadeDuration: 0.3,
          easing: 'linear',
        }),
      ).toEqual({
        progress: 1.0,
        opacity: 1.0,
        visible: true,
      });
    });

    it('correctly transitions through grow, hold, fade, and hidden states with auto-hide', () => {
      const config: ArrowEffectConfig = {
        type: 'grow',
        delay: 0.5, // 500ms
        duration: 0.8, // 800ms (ends at 1300ms)
        holdDuration: 0.5, // 500ms (ends at 1800ms)
        fadeDuration: 0.3, // 300ms (ends at 2100ms)
        exitAction: 'auto-hide',
        easing: 'linear',
      };

      // Before delay (t = 200ms)
      expect(computeArrowEffectState(200, config)).toEqual({
        visible: false,
        progress: 0.0,
        opacity: 0.0,
      });

      // Midpoint of grow (t = 900ms: 400ms into 800ms duration)
      const midGrow = computeArrowEffectState(900, config);
      expect(midGrow.visible).toBe(true);
      expect(midGrow.progress).toBeCloseTo(0.5, 4);
      expect(midGrow.opacity).toBeCloseTo(1.0, 4);

      // End of grow / Start of hold (t = 1300ms)
      expect(computeArrowEffectState(1300, config)).toEqual({
        visible: true,
        progress: 1.0,
        opacity: 1.0,
      });

      // During hold (t = 1600ms)
      expect(computeArrowEffectState(1600, config)).toEqual({
        visible: true,
        progress: 1.0,
        opacity: 1.0,
      });

      // Midpoint of fade-out (t = 1950ms: 150ms into 300ms fade)
      const midFade = computeArrowEffectState(1950, config);
      expect(midFade.visible).toBe(true);
      expect(midFade.progress).toBe(1.0);
      expect(midFade.opacity).toBeCloseTo(0.5, 4);

      // After fade-out (t = 2200ms)
      const finished = computeArrowEffectState(2200, config);
      expect(finished.visible).toBe(false);
      expect(finished.opacity).toBe(0.0);
    });

    it('keeps arrow visible after hold when exitAction is keep', () => {
      const config: ArrowEffectConfig = {
        type: 'grow',
        delay: 0.5,
        duration: 0.8,
        holdDuration: 0.5,
        fadeDuration: 0.3,
        exitAction: 'keep',
        easing: 'linear',
      };

      expect(computeArrowEffectState(2500, config)).toEqual({
        visible: true,
        progress: 1.0,
        opacity: 1.0,
      });
    });

    it('supports ease-out easing', () => {
      const config: ArrowEffectConfig = {
        type: 'grow',
        delay: 0.0,
        duration: 1.0,
        holdDuration: 0.0,
        fadeDuration: 0.0,
        exitAction: 'keep',
        easing: 'ease-out',
      };

      const result = computeArrowEffectState(500, config);
      // ease-out at 0.5 should have progress > 0.5
      expect(result.progress).toBeGreaterThan(0.5);
    });
  });

  describe('trimRenderPoints', () => {
    it('trims horizontal straight line at progress 0.5', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ];
      const result = trimRenderPoints(points, 0.5);

      expect(result.trimmedPoints).toHaveLength(2);
      expect(result.trimmedPoints[0]).toEqual({ x: 0, y: 0 });
      expect(result.trimmedPoints[1].x).toBeCloseTo(50, 4);
      expect(result.trimmedPoints[1].y).toBeCloseTo(0, 4);
      expect(result.tipAngle).toBeCloseTo(0, 4);
    });

    it('trims vertical straight line at progress 0.5', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ];
      const result = trimRenderPoints(points, 0.5);

      expect(result.trimmedPoints).toHaveLength(2);
      expect(result.trimmedPoints[0]).toEqual({ x: 0, y: 0 });
      expect(result.trimmedPoints[1].x).toBeCloseTo(0, 4);
      expect(result.trimmedPoints[1].y).toBeCloseTo(50, 4);
      expect(result.tipAngle).toBeCloseTo(Math.PI / 2, 4);
    });

    it('handles progress <= 0 by returning start point pair and segment angle', () => {
      const points = [
        { x: 10, y: 20 },
        { x: 50, y: 60 },
      ];
      const result = trimRenderPoints(points, 0);

      expect(result.trimmedPoints).toHaveLength(2);
      expect(result.trimmedPoints[0]).toEqual({ x: 10, y: 20 });
      expect(result.trimmedPoints[1]).toEqual({ x: 10, y: 20 });
      expect(result.tipAngle).toBeCloseTo(Math.atan2(40, 40), 4);
    });

    it('handles progress >= 1.0 by returning all points and last segment angle', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
      ];
      const result = trimRenderPoints(points, 1.0);

      expect(result.trimmedPoints).toEqual(points);
      expect(result.tipAngle).toBeCloseTo(Math.PI / 2, 4);
    });

    it('trims multi-segment polyline across segments', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ];

      // Total length = 100
      // progress = 0.25 -> target distance = 25 (in segment 0)
      const res1 = trimRenderPoints(points, 0.25);
      expect(res1.trimmedPoints).toHaveLength(2);
      expect(res1.trimmedPoints[0]).toEqual({ x: 0, y: 0 });
      expect(res1.trimmedPoints[1].x).toBeCloseTo(25, 4);
      expect(res1.trimmedPoints[1].y).toBeCloseTo(0, 4);
      expect(res1.tipAngle).toBeCloseTo(0, 4);

      // progress = 0.75 -> target distance = 75 (in segment 1)
      const res2 = trimRenderPoints(points, 0.75);
      expect(res2.trimmedPoints).toHaveLength(3);
      expect(res2.trimmedPoints[0]).toEqual({ x: 0, y: 0 });
      expect(res2.trimmedPoints[1]).toEqual({ x: 50, y: 0 });
      expect(res2.trimmedPoints[2].x).toBeCloseTo(50, 4);
      expect(res2.trimmedPoints[2].y).toBeCloseTo(25, 4);
      expect(res2.tipAngle).toBeCloseTo(Math.PI / 2, 4);
    });

    it('smooths tip angle and aligns last two points to main heading when isWavy is true', () => {
      const rawWavy = getWavyPoints(0, 0, 100, 0);
      const points: NormalizedPoint[] = [];
      for (let i = 0; i < rawWavy.length; i += 2) {
        points.push({ x: rawWavy[i], y: rawWavy[i + 1] });
      }

      // Without isWavy: tipAngle follows local wave derivative (non-zero)
      const normalResult = trimRenderPoints(points, 0.5, false);
      expect(Math.abs(normalResult.tipAngle)).toBeGreaterThan(0.1);

      // With isWavy: tipAngle follows main heading (0)
      const wavyResult = trimRenderPoints(points, 0.5, true);
      expect(wavyResult.tipAngle).toBeCloseTo(0, 2);

      const len = wavyResult.trimmedPoints.length;
      const lastPt = wavyResult.trimmedPoints[len - 1];
      const prevPt = wavyResult.trimmedPoints[len - 2];
      const segmentAngle = Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x);
      expect(segmentAngle).toBeCloseTo(0, 2);
    });
  });

  describe('computeArrowDimensions', () => {
    it('calculates expected dimensions for 1200px stage and baseStrokeWidth 3', () => {
      expect(computeArrowDimensions(1200, 3)).toEqual({
        scale: 1,
        strokeWidth: 3,
        pointerLength: 15,
        pointerWidth: 15,
        dotRadius: 5,
      });
    });

    it('calculates expected dimensions for 600px stage and baseStrokeWidth 3', () => {
      expect(computeArrowDimensions(600, 3)).toEqual({
        scale: 0.5,
        strokeWidth: 2,
        pointerLength: 8,
        pointerWidth: 8,
        dotRadius: 3.2,
      });
    });
  });

  describe('computeRippleRings', () => {
    it('returns empty array if config is undefined or type is none', () => {
      expect(computeRippleRings(1000, undefined)).toEqual([]);
      expect(
        computeRippleRings(1000, {
          type: 'none',
          delay: 0,
          duration: 1,
          ringsCount: 3,
          repeatCount: 2,
          maxRadiusScale: 2.5,
          exitAction: 'keep',
        }),
      ).toEqual([]);
    });

    it('returns empty array before delay', () => {
      const config: MarkerEffectConfig = {
        type: 'ripple',
        delay: 0.5, // 500ms
        duration: 1.0,
        ringsCount: 3,
        repeatCount: 2,
        maxRadiusScale: 2.5,
        exitAction: 'keep',
      };

      expect(computeRippleRings(200, config)).toEqual([]);
    });

    it('calculates ripple rings with radius and opacity', () => {
      const config: MarkerEffectConfig = {
        type: 'ripple',
        delay: 0.0,
        duration: 1.0,
        ringsCount: 3,
        repeatCount: 2,
        maxRadiusScale: 2.5,
        exitAction: 'keep',
      };

      const rings = computeRippleRings(500, config, 10);
      expect(rings).toHaveLength(3);
      for (const ring of rings) {
        expect(ring.radius).toBeGreaterThanOrEqual(10);
        expect(ring.radius).toBeLessThanOrEqual(25);
        expect(ring.opacity).toBeGreaterThanOrEqual(0);
        expect(ring.opacity).toBeLessThanOrEqual(1.0);
      }
    });

    it('returns empty array after repeatCount cycles are completed', () => {
      const config: MarkerEffectConfig = {
        type: 'ripple',
        delay: 0.5,
        duration: 1.0,
        ringsCount: 3,
        repeatCount: 2, // ends at 500ms + 2000ms = 2500ms
        maxRadiusScale: 2.5,
        exitAction: 'keep',
      };

      expect(computeRippleRings(2600, config)).toEqual([]);
    });

    it('supports repeatCount = 0 as infinite loop', () => {
      const config: MarkerEffectConfig = {
        type: 'ripple',
        delay: 0.0,
        duration: 1.0,
        ringsCount: 3,
        repeatCount: 0,
        maxRadiusScale: 2.5,
        exitAction: 'keep',
      };

      const rings = computeRippleRings(10500, config, 10);
      expect(rings).toHaveLength(3);
    });

    it('propagates custom color from config to ripple rings', () => {
      const config: MarkerEffectConfig = {
        type: 'ripple',
        delay: 0.0,
        duration: 1.0,
        ringsCount: 2,
        repeatCount: 1,
        maxRadiusScale: 2.0,
        exitAction: 'keep',
        color: '#ff0000',
      };

      const rings = computeRippleRings(500, config, 10);
      expect(rings).toHaveLength(2);
      expect(rings[0].color).toBe('#ff0000');
      expect(rings[1].color).toBe('#ff0000');
    });
  });

  describe('computeZonePulseOpacity', () => {
    it('returns baseOpacity when config is undefined or type is not pulse', () => {
      expect(computeZonePulseOpacity(500, undefined, 0.3)).toBe(0.3);
      expect(
        computeZonePulseOpacity(
          500,
          {
            type: 'none',
            duration: 1.2,
            minOpacity: 0.1,
            maxOpacity: 0.5,
          },
          0.25,
        ),
      ).toBe(0.25);
    });

    it('computes sinusoidal pulse opacity according to duration and min/max bounds', () => {
      const config: ZoneEffectConfig = {
        type: 'pulse',
        duration: 1.0,
        minOpacity: 0.2,
        maxOpacity: 0.6,
      };

      // t = 0s -> pulse = 0 -> minOpacity (0.2)
      expect(computeZonePulseOpacity(0, config)).toBeCloseTo(0.2, 4);

      // t = 0.25s -> pulse = 0.5 -> 0.4
      expect(computeZonePulseOpacity(250, config)).toBeCloseTo(0.4, 4);

      // t = 0.5s -> pulse = 1.0 -> maxOpacity (0.6)
      expect(computeZonePulseOpacity(500, config)).toBeCloseTo(0.6, 4);

      // t = 0.75s -> pulse = 0.5 -> 0.4
      expect(computeZonePulseOpacity(750, config)).toBeCloseTo(0.4, 4);

      // t = 1.0s -> pulse = 0 -> minOpacity (0.2)
      expect(computeZonePulseOpacity(1000, config)).toBeCloseTo(0.2, 4);
    });
  });

  describe('computeArrowFlowDashOffset', () => {
    it('computes negative dash offset based on time and speed', () => {
      // t = 1000ms, speed = 20 -> -20
      expect(computeArrowFlowDashOffset(1000, undefined, 20)).toBe(-20);

      // default speed = 25
      expect(computeArrowFlowDashOffset(1000)).toBe(-25);
      expect(computeArrowFlowDashOffset(2000)).toBe(-50);
    });
  });

  describe('computeArrowEffectState flow and grow-and-flow', () => {
    it('handles flow effect with constant visibility and flowing dash offset', () => {
      const config: ArrowEffectConfig = {
        type: 'flow',
        delay: 0,
        duration: 1.0,
        holdDuration: 0,
        fadeDuration: 0,
        exitAction: 'keep',
        easing: 'linear',
      };

      const state0 = computeArrowEffectState(0, config);
      expect(state0.visible).toBe(true);
      expect(state0.progress).toBe(1.0);
      expect(state0.opacity).toBe(1.0);
      expect(state0.dashOffset).toBeCloseTo(0, 4);

      const state1000 = computeArrowEffectState(1000, config);
      expect(state1000.visible).toBe(true);
      expect(state1000.progress).toBe(1.0);
      expect(state1000.dashOffset).toBeCloseTo(-25, 4);
    });

    it('handles grow-and-flow effect with zero dash offset during growth and flowing offset after growth', () => {
      const config: ArrowEffectConfig = {
        type: 'grow-and-flow',
        delay: 0.5, // 500ms
        duration: 0.8, // 800ms (growth ends at 1300ms)
        holdDuration: 1.0,
        fadeDuration: 0.3,
        exitAction: 'keep',
        easing: 'linear',
      };

      // During growth (t = 900ms)
      const growing = computeArrowEffectState(900, config);
      expect(growing.visible).toBe(true);
      expect(growing.progress).toBeCloseTo(0.5, 4);
      expect(growing.dashOffset).toBe(0);

      // Exactly at end of growth (t = 1300ms)
      const endGrowth = computeArrowEffectState(1300, config);
      expect(endGrowth.visible).toBe(true);
      expect(endGrowth.progress).toBe(1.0);
      expect(endGrowth.dashOffset).toBeCloseTo(0, 4);

      // Flowing after growth (t = 2300ms -> 1000ms after growth end)
      const flowing = computeArrowEffectState(2300, config);
      expect(flowing.visible).toBe(true);
      expect(flowing.progress).toBe(1.0);
      expect(flowing.dashOffset).toBeCloseTo(-25, 4);
    });
  });
});
