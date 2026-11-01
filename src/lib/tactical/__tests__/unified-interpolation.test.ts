import { describe, expect, it } from 'vitest';
import type { Slide, ZoneAnnotation } from '@/lib/types/tactical-unified';
import { interpolateArrow as directInterpolateArrow } from '../interpolation-annotation';
import { interpolateBall as directInterpolateBall } from '../interpolation-ball';
import { lerp as directLerp } from '../interpolation-geometry';
import { interpolatePlayer as directInterpolatePlayer } from '../interpolation-player';
import {
  calculateUnifiedTotalDuration,
  getInterpolatedUnifiedSlideFrame,
  interpolateColor,
  interpolatePitchTransform,
  interpolatePolygonPoints,
  interpolateZone,
  rectToPoints,
  resamplePolygon,
} from '../unified-interpolation';

describe('unified-interpolation engine', () => {
  describe('color interpolation', () => {
    it('interpolates between two hex colors', () => {
      const colorA = '#000000';
      const colorB = '#ffffff';
      const mid = interpolateColor(colorA, colorB, 0.5);
      expect(mid).toBe('#808080');
    });

    it('clamps t between 0 and 1', () => {
      expect(interpolateColor('#ff0000', '#00ff00', -0.5)).toBe('#ff0000');
      expect(interpolateColor('#ff0000', '#00ff00', 1.5)).toBe('#00ff00');
    });
  });

  describe('polygon resampling & vertex morphing', () => {
    it('resamples a triangle into 6 points maintaining perimeter', () => {
      const triangle = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ];
      const resampled = resamplePolygon(triangle, 6, true);
      expect(resampled.length).toBe(6);
      expect(resampled[0].x).toBeCloseTo(0, 1);
      expect(resampled[0].y).toBeCloseTo(0, 1);
    });

    it('interpolates between polygons of the same vertex count', () => {
      const polyA = [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
        { x: 10, y: 20 },
      ];
      const polyB = [
        { x: 30, y: 30 },
        { x: 40, y: 30 },
        { x: 40, y: 40 },
        { x: 30, y: 40 },
      ];

      const midPoints = interpolatePolygonPoints(polyA, polyB, 0.5);
      expect(midPoints.length).toBe(4);
      expect(midPoints[0].x).toBeCloseTo(20, 1);
      expect(midPoints[0].y).toBeCloseTo(20, 1);
      expect(midPoints[2].x).toBeCloseTo(30, 1);
      expect(midPoints[2].y).toBeCloseTo(30, 1);
    });

    it('interpolates between polygons with different vertex counts (e.g. 3 vertices -> 4 vertices)', () => {
      const triangle = [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 10, y: 20 },
      ];
      const square = [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
      ];

      const midPoints = interpolatePolygonPoints(triangle, square, 0.5);
      // target vertices count should be max(3, 4) = 4
      expect(midPoints.length).toBe(4);
      // All points should have valid numbers
      for (const p of midPoints) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    });

    it('converts rect to rotated 4-corner polygon points', () => {
      const corners = rectToPoints(10, 10, 20, 10, 0);
      expect(corners.length).toBe(4);
      expect(corners[0]).toEqual({ x: 10, y: 10 });
      expect(corners[1]).toEqual({ x: 30, y: 10 });
      expect(corners[2]).toEqual({ x: 30, y: 20 });
      expect(corners[3]).toEqual({ x: 10, y: 20 });
    });
  });

  describe('zone morphing', () => {
    it('morphs a rect zone to a polygon zone smoothly', () => {
      const rectZone: ZoneAnnotation = {
        id: 'zone-1',
        annotationType: 'zone',
        zoneType: 'highlight',
        shapeType: 'rect',
        x: 10,
        y: 10,
        width: 20,
        height: 10,
        points: [],
        color: '#ff0000',
        opacity: 0.4,
        strokeWidth: 2,
      };

      const polygonZone: ZoneAnnotation = {
        id: 'zone-1',
        annotationType: 'zone',
        zoneType: 'highlight',
        shapeType: 'polygon',
        points: [
          { x: 40, y: 40 },
          { x: 60, y: 40 },
          { x: 70, y: 60 },
          { x: 30, y: 60 },
        ],
        color: '#00ff00',
        opacity: 0.8,
        strokeWidth: 4,
      };

      const morphed = interpolateZone(rectZone, polygonZone, 0.5);
      expect(morphed).not.toBeNull();
      expect(morphed?.shapeType).toBe('polygon');
      expect(morphed?.opacity).toBeCloseTo(0.6, 2);
      expect(morphed?.strokeWidth).toBeCloseTo(3, 1);
      expect(morphed?.points.length).toBe(4);
    });

    it('fades out zone when disappearing in next slide', () => {
      const zoneA: ZoneAnnotation = {
        id: 'zone-1',
        annotationType: 'zone',
        zoneType: 'space',
        shapeType: 'rect',
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        points: [],
        color: '#3b82f6',
        opacity: 0.5,
        strokeWidth: 1,
      };

      const mid = interpolateZone(zoneA, undefined, 0.5);
      expect(mid?.opacity).toBeCloseTo(0.25, 2);
      expect(mid?.visible).toBe(true);

      const end = interpolateZone(zoneA, undefined, 1.0);
      expect(end?.visible).toBe(false);
    });
  });

  describe('timeline slide interpolation', () => {
    const mockSlides: Slide[] = [
      {
        id: 'slide-1',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        easing: 'linear',
        players: [
          {
            id: 'p1',
            team: 'home',
            area: 'pitch',
            x: 10,
            y: 20,
            style: {
              markerType: 'circle',
              insideContent: 'number',
              bottomLabel: 'name',
              color: '#034694',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              sizeScale: 1,
              numberSizeScale: 1,
              labelSizeScale: 1,
            },
            connectLines: [],
            badges: [],
          },
        ],
        arrows: [],
        zones: [
          {
            id: 'z1',
            annotationType: 'zone',
            zoneType: 'space',
            shapeType: 'polygon',
            points: [
              { x: 10, y: 10 },
              { x: 20, y: 10 },
              { x: 20, y: 20 },
              { x: 10, y: 20 },
            ],
            color: '#3b82f6',
            opacity: 0.3,
            strokeWidth: 2,
          },
        ],
        texts: [],
        ball: { x: 10, y: 20, visible: true },
      },
      {
        id: 'slide-2',
        index: 1,
        transitionDurationMs: 1000,
        pauseMs: 500,
        easing: 'linear',
        players: [
          {
            id: 'p1',
            team: 'home',
            area: 'pitch',
            x: 50,
            y: 60,
            style: {
              markerType: 'circle',
              insideContent: 'number',
              bottomLabel: 'name',
              color: '#034694',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              sizeScale: 1,
              numberSizeScale: 1,
              labelSizeScale: 1,
            },
            connectLines: [],
            badges: [],
          },
        ],
        arrows: [],
        zones: [
          {
            id: 'z1',
            annotationType: 'zone',
            zoneType: 'space',
            shapeType: 'polygon',
            points: [
              { x: 30, y: 30 },
              { x: 50, y: 30 },
              { x: 50, y: 50 },
              { x: 30, y: 50 },
            ],
            color: '#ef4444',
            opacity: 0.7,
            strokeWidth: 4,
          },
        ],
        texts: [],
        ball: { x: 50, y: 60, visible: true },
      },
    ];

    it('calculates total duration across slides (destination-based)', () => {
      // 0 or 1 slide should have 0 duration
      expect(calculateUnifiedTotalDuration([])).toBe(0);
      expect(calculateUnifiedTotalDuration([mockSlides[0]])).toBe(0);

      const total = calculateUnifiedTotalDuration(mockSlides);
      expect(total).toBe(1500); // 1000ms + 500ms for destination slide (slide 1)

      // Test with different durations
      const variedSlides: Slide[] = [
        { ...mockSlides[0], transitionDurationMs: 2000, pauseMs: 1000 },
        { ...mockSlides[1], transitionDurationMs: 500, pauseMs: 200 },
      ];
      expect(calculateUnifiedTotalDuration(variedSlides)).toBe(700); // Only slide 1 counts: 500 + 200
    });

    it('interpolates positions at 50% transition progress (500ms)', () => {
      const frame = getInterpolatedUnifiedSlideFrame(mockSlides, 500);
      expect(frame.players.p1.x).toBeCloseTo(30, 1);
      expect(frame.players.p1.y).toBeCloseTo(40, 1);
      expect(frame.ball.x).toBeCloseTo(30, 1);
      expect(frame.ball.y).toBeCloseTo(40, 1);

      // Zone vertex morphing
      expect(frame.zones.z1.points[0].x).toBeCloseTo(20, 1);
      expect(frame.zones.z1.points[0].y).toBeCloseTo(20, 1);
      expect(frame.zones.z1.opacity).toBeCloseTo(0.5, 2);
      expect(frame.zones.z1.strokeWidth).toBeCloseTo(3, 1);
      expect(frame.isPaused).toBe(false);
    });

    it('holds positions during pause time (1200ms)', () => {
      const frame = getInterpolatedUnifiedSlideFrame(mockSlides, 1200);
      expect(frame.players.p1.x).toBeCloseTo(50, 1);
      expect(frame.players.p1.y).toBeCloseTo(60, 1);
      expect(frame.ball.x).toBeCloseTo(50, 1);
      expect(frame.ball.y).toBeCloseTo(60, 1);
      expect(frame.isPaused).toBe(true);
      expect(frame.currentSlideIndex).toBe(1);
      expect(frame.nextSlideIndex).toBe(1);
    });

    it('returns last slide index when timeMs reaches or exceeds totalDurationMs', () => {
      const frameAtTotal = getInterpolatedUnifiedSlideFrame(mockSlides, 1500);
      expect(frameAtTotal.currentSlideIndex).toBe(1);
      expect(frameAtTotal.nextSlideIndex).toBe(1);
      expect(frameAtTotal.isPaused).toBe(true);
      expect(frameAtTotal.progress).toBe(1);

      const framePastTotal = getInterpolatedUnifiedSlideFrame(mockSlides, 2000);
      expect(framePastTotal.currentSlideIndex).toBe(1);
      expect(framePastTotal.nextSlideIndex).toBe(1);
      expect(framePastTotal.isPaused).toBe(true);
      expect(framePastTotal.progress).toBe(1);
    });

    it('interpolates player along custom bezier trajectory', () => {
      expect(directLerp(0, 10, 0.5)).toBe(5);
      expect(typeof directInterpolateBall).toBe('function');
      expect(typeof directInterpolatePlayer).toBe('function');
      expect(typeof directInterpolateArrow).toBe('function');
      const slidesWithCurve: Slide[] = [
        {
          id: 's1',
          index: 0,
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'linear',
          players: [
            {
              id: 'p1',
              team: 'home',
              area: 'pitch',
              x: 20,
              y: 80,
              style: {
                markerType: 'circle',
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#034694',
                strokeColor: '#ffffff',
                strokeWidth: 2,
                sizeScale: 1.0,
                numberSizeScale: 1.0,
                labelSizeScale: 1.0,
              },
              connectLines: [],
              badges: [],
            },
          ],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 50, y: 50, visible: true },
        },
        {
          id: 's2',
          index: 1,
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'linear',
          players: [
            {
              id: 'p1',
              team: 'home',
              area: 'pitch',
              x: 20,
              y: 20,
              style: {
                markerType: 'circle',
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#034694',
                strokeColor: '#ffffff',
                strokeWidth: 2,
                sizeScale: 1.0,
                numberSizeScale: 1.0,
                labelSizeScale: 1.0,
              },
              connectLines: [],
              badges: [],
              trajectory: {
                type: 'custom',
                controlPoint: { x: 75, y: 45 },
              },
            },
          ],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 50, y: 50, visible: true },
        },
      ];

      // At t=0.5 (500ms), bezier midpoint calculation
      // x: 0.25*20 + 0.5*75 + 0.25*20 = 47.5
      // y: 0.25*80 + 0.5*45 + 0.25*20 = 47.5
      const frame = getInterpolatedUnifiedSlideFrame(slidesWithCurve, 500);
      expect(frame.players.p1.x).toBeCloseTo(47.5, 1);
      expect(frame.players.p1.y).toBeCloseTo(47.5, 1);
    });

    describe('ball rotation interpolation', () => {
      it('computes clockwise rotation when moving right (dx >= 0)', () => {
        const ballA = { x: 20, y: 50, visible: true };
        const ballB = { x: 70, y: 50, visible: true };
        // dx = 50 >= 0 -> dir = 1
        // At ease = 0.5, x = 45, distance = 25
        const state = directInterpolateBall(ballA, ballB, 0.5);
        expect(state.rotation).toBeDefined();
        expect(state.rotation).toBeCloseTo(25 * 7.2, 1); // 180 degrees
        expect(state.rotation).toBeGreaterThan(0);
      });

      it('computes counter-clockwise rotation when moving left (dx < 0)', () => {
        const ballA = { x: 70, y: 50, visible: true };
        const ballB = { x: 20, y: 50, visible: true };
        // dx = -50 < 0 -> dir = -1
        // At ease = 0.5, x = 45, distance = 25
        const state = directInterpolateBall(ballA, ballB, 0.5);
        expect(state.rotation).toBeDefined();
        expect(state.rotation).toBeCloseTo(-25 * 7.2, 1); // -180 degrees
        expect(state.rotation).toBeLessThan(0);
      });

      it('returns startRotation (0) when stationary', () => {
        const ballA = { x: 50, y: 50, visible: true };
        const ballB = { x: 50, y: 50, visible: true };
        const state = directInterpolateBall(ballA, ballB, 0.5);
        expect(state.rotation).toBe(0);
      });

      it('incorporates custom startRotation', () => {
        const ballA = { x: 10, y: 50, visible: true };
        const ballB = { x: 30, y: 50, visible: true };
        const state = directInterpolateBall(ballA, ballB, 1.0, 90);
        expect(state.rotation).toBeCloseTo(90 + 20 * 7.2, 1);
      });

      it('includes ball.rotation in unified slide frame interpolation and updates over time', () => {
        const slides: Slide[] = [
          {
            id: 's1',
            index: 0,
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'linear',
            players: [],
            arrows: [],
            zones: [],
            texts: [],
            ball: { x: 20, y: 50, visible: true },
          },
          {
            id: 's2',
            index: 1,
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'linear',
            players: [],
            arrows: [],
            zones: [],
            texts: [],
            ball: { x: 70, y: 50, visible: true },
          },
        ];

        const frameStart = getInterpolatedUnifiedSlideFrame(slides, 0);
        expect(frameStart.ball.rotation).toBe(0);

        const frameMid = getInterpolatedUnifiedSlideFrame(slides, 500);
        expect(frameMid.ball.rotation).toBeCloseTo(25 * 7.2, 1);

        const frameEnd = getInterpolatedUnifiedSlideFrame(slides, 1000);
        expect(frameEnd.ball.rotation).toBeCloseTo(50 * 7.2, 1);
      });
    });

    describe('pitchTransform interpolation', () => {
      it('interpolates pitchTransform between two slides with easing', () => {
        const transformA = {
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 90,
          isLocked: false,
        };
        const transformB = {
          panX: 100,
          panY: -50,
          zoom: 2,
          tilt: 30,
          yaw: 70,
          isLocked: true,
        };

        const mid = interpolatePitchTransform(transformA, transformB, 0.5);
        expect(mid.panX).toBeCloseTo(50, 1);
        expect(mid.panY).toBeCloseTo(-25, 1);
        expect(mid.zoom).toBeCloseTo(1.5, 2);
        expect(mid.tilt).toBeCloseTo(15, 1);
        expect(mid.yaw).toBeCloseTo(80, 1);

        // isLocked switches at t < 0.5 ? a.isLocked : b.isLocked
        const early = interpolatePitchTransform(transformA, transformB, 0.4);
        expect(early.isLocked).toBe(false);

        const half = interpolatePitchTransform(transformA, transformB, 0.5);
        expect(half.isLocked).toBe(true);
      });

      it('interpolates yaw using the shortest angular path across 360 boundary (350 -> 10 => 0 at t=0.5)', () => {
        const transformA = {
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 350,
          isLocked: false,
        };
        const transformB = {
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 10,
          isLocked: false,
        };

        const mid = interpolatePitchTransform(transformA, transformB, 0.5);
        expect(mid.yaw).toBeCloseTo(0, 1);
      });

      it('falls back to default values when transform is missing', () => {
        const mid = interpolatePitchTransform(null, undefined, 0.5);
        expect(mid).toEqual({
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 90,
          isLocked: false,
        });
      });

      it('interpolates pitchTransform within getInterpolatedUnifiedSlideFrame', () => {
        const slides: Slide[] = [
          {
            id: 's1',
            index: 0,
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'linear',
            players: [],
            arrows: [],
            zones: [],
            texts: [],
            ball: { x: 50, y: 50, visible: true },
            pitchTransform: {
              panX: 0,
              panY: 0,
              zoom: 1,
              tilt: 0,
              yaw: 90,
              isLocked: false,
            },
          },
          {
            id: 's2',
            index: 1,
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'linear',
            players: [],
            arrows: [],
            zones: [],
            texts: [],
            ball: { x: 50, y: 50, visible: true },
            pitchTransform: {
              panX: 100,
              panY: 50,
              zoom: 2,
              tilt: 30,
              yaw: 110,
              isLocked: true,
            },
          },
        ];

        const frameStart = getInterpolatedUnifiedSlideFrame(slides, 0);
        expect(frameStart.pitchTransform.zoom).toBe(1);
        expect(frameStart.pitchTransform.tilt).toBe(0);
        expect(frameStart.pitchTransform.yaw).toBe(90);

        const frameMid = getInterpolatedUnifiedSlideFrame(slides, 500);
        expect(frameMid.pitchTransform.panX).toBeCloseTo(50, 1);
        expect(frameMid.pitchTransform.panY).toBeCloseTo(25, 1);
        expect(frameMid.pitchTransform.zoom).toBeCloseTo(1.5, 2);
        expect(frameMid.pitchTransform.tilt).toBeCloseTo(15, 1);
        expect(frameMid.pitchTransform.yaw).toBeCloseTo(100, 1);
      });

      describe('camera transition modes (slow, continuous, cut)', () => {
        it('handles single slide slow camera drift with auto-extended duration', () => {
          const slides: Slide[] = [
            {
              id: 's1',
              index: 0,
              transitionDurationMs: 1000,
              pauseMs: 500,
              easing: 'linear',
              players: [
                {
                  id: 'p1',
                  team: 'home',
                  area: 'pitch',
                  x: 10,
                  y: 10,
                  style: {
                    markerType: 'circle',
                    insideContent: 'number',
                    bottomLabel: 'name',
                    color: '#000',
                    strokeColor: '#fff',
                    strokeWidth: 2,
                    sizeScale: 1,
                    numberSizeScale: 1,
                    labelSizeScale: 1,
                  },
                  connectLines: [],
                  badges: [],
                },
              ],
              arrows: [],
              zones: [],
              texts: [],
              ball: { x: 10, y: 10, visible: true },
              pitchTransform: {
                panX: 0,
                panY: 0,
                zoom: 1,
                tilt: 0,
                yaw: 90,
                isLocked: false,
              },
            },
            {
              id: 's2',
              index: 1,
              transitionDurationMs: 2000,
              pauseMs: 500,
              cameraTransitionMode: 'slow',
              cameraDurationMs: 10000,
              easing: 'linear',
              players: [
                {
                  id: 'p1',
                  team: 'home',
                  area: 'pitch',
                  x: 50,
                  y: 50,
                  style: {
                    markerType: 'circle',
                    insideContent: 'number',
                    bottomLabel: 'name',
                    color: '#000',
                    strokeColor: '#fff',
                    strokeWidth: 2,
                    sizeScale: 1,
                    numberSizeScale: 1,
                    labelSizeScale: 1,
                  },
                  connectLines: [],
                  badges: [],
                },
              ],
              arrows: [],
              zones: [],
              texts: [],
              ball: { x: 50, y: 50, visible: true },
              pitchTransform: {
                panX: 100,
                panY: 50,
                zoom: 2,
                tilt: 20,
                yaw: 90,
                isLocked: false,
              },
            },
          ];

          // 1. calculateUnifiedTotalDuration is extended to 10000ms
          const total = calculateUnifiedTotalDuration(slides);
          expect(total).toBe(10000);

          // 2. at timeMs = 5000: player reached destination (progress === 1), camera at t=0.5, isPaused === false
          const frame5000 = getInterpolatedUnifiedSlideFrame(slides, 5000);
          expect(frame5000.progress).toBe(1);
          expect(frame5000.players.p1.x).toBeCloseTo(50, 1);
          expect(frame5000.players.p1.y).toBeCloseTo(50, 1);
          expect(frame5000.pitchTransform.panX).toBeCloseTo(50, 1);
          expect(frame5000.pitchTransform.panY).toBeCloseTo(25, 1);
          expect(frame5000.pitchTransform.zoom).toBeCloseTo(1.5, 2);
          expect(frame5000.isPaused).toBe(false);

          // 3. at timeMs = 10000: camera reaches end, isPaused === true
          const frame10000 = getInterpolatedUnifiedSlideFrame(slides, 10000);
          expect(frame10000.pitchTransform.panX).toBeCloseTo(100, 1);
          expect(frame10000.pitchTransform.zoom).toBeCloseTo(2, 2);
          expect(frame10000.isPaused).toBe(true);
        });

        it('handles multi-slide continuous camera span without stopping at intermediate slide', () => {
          const slides: Slide[] = [
            {
              id: 's1',
              index: 0,
              transitionDurationMs: 1000,
              pauseMs: 500,
              easing: 'linear',
              players: [],
              arrows: [],
              zones: [],
              texts: [],
              ball: { x: 50, y: 50, visible: true },
              pitchTransform: {
                panX: 0,
                panY: 0,
                zoom: 1,
                tilt: 0,
                yaw: 90,
                isLocked: false,
              },
            },
            {
              id: 's2',
              index: 1,
              transitionDurationMs: 1000,
              pauseMs: 500,
              easing: 'linear',
              cameraTransitionMode: 'continuous',
              players: [],
              arrows: [],
              zones: [],
              texts: [],
              ball: { x: 50, y: 50, visible: true },
              pitchTransform: {
                panX: 40,
                panY: 20,
                zoom: 1.4,
                tilt: 0,
                yaw: 90,
                isLocked: false,
              },
            },
            {
              id: 's3',
              index: 2,
              transitionDurationMs: 2000,
              pauseMs: 500,
              easing: 'linear',
              cameraTransitionMode: 'slow',
              cameraDurationMs: 10000,
              players: [],
              arrows: [],
              zones: [],
              texts: [],
              ball: { x: 50, y: 50, visible: true },
              pitchTransform: {
                panX: 100,
                panY: 50,
                zoom: 2,
                tilt: 0,
                yaw: 90,
                isLocked: false,
              },
            },
          ];

          const total = calculateUnifiedTotalDuration(slides);
          expect(total).toBe(10000); // 1500 + 8500 = 10000ms

          // At boundary (timeMs = 1500, end of s2 player duration):
          // Camera should be at 1500 / 10000 = 0.15 of span between s1 (panX: 0) and s3 (panX: 100) -> panX: 15
          const frame1500 = getInterpolatedUnifiedSlideFrame(slides, 1500);
          expect(frame1500.pitchTransform.panX).toBeCloseTo(15, 1);
          expect(frame1500.pitchTransform.zoom).toBeCloseTo(
            1 + (2 - 1) * 0.15,
            2,
          );

          // At timeMs = 5000:
          // Camera at 5000 / 10000 = 0.5 between s1 and s3 -> panX: 50, zoom: 1.5
          const frame5000 = getInterpolatedUnifiedSlideFrame(slides, 5000);
          expect(frame5000.pitchTransform.panX).toBeCloseTo(50, 1);
          expect(frame5000.pitchTransform.zoom).toBeCloseTo(1.5, 2);
          expect(frame5000.isPaused).toBe(false);
        });

        it('instantly snaps camera to destination on cameraTransitionMode cut', () => {
          const slides: Slide[] = [
            {
              id: 's1',
              index: 0,
              transitionDurationMs: 1000,
              pauseMs: 500,
              easing: 'linear',
              players: [],
              arrows: [],
              zones: [],
              texts: [],
              ball: { x: 50, y: 50, visible: true },
              pitchTransform: {
                panX: 0,
                panY: 0,
                zoom: 1,
                tilt: 0,
                yaw: 90,
                isLocked: false,
              },
            },
            {
              id: 's2',
              index: 1,
              transitionDurationMs: 1000,
              pauseMs: 500,
              easing: 'linear',
              cameraTransitionMode: 'cut',
              players: [],
              arrows: [],
              zones: [],
              texts: [],
              ball: { x: 50, y: 50, visible: true },
              pitchTransform: {
                panX: 80,
                panY: 40,
                zoom: 2.5,
                tilt: 15,
                yaw: 120,
                isLocked: true,
              },
            },
          ];

          // At timeMs = 10 (just started transition):
          const frame10 = getInterpolatedUnifiedSlideFrame(slides, 10);
          expect(frame10.pitchTransform.panX).toBe(80);
          expect(frame10.pitchTransform.panY).toBe(40);
          expect(frame10.pitchTransform.zoom).toBe(2.5);
          expect(frame10.pitchTransform.tilt).toBe(15);
          expect(frame10.pitchTransform.yaw).toBe(120);
          expect(frame10.pitchTransform.isLocked).toBe(true);
        });
      });
    });

    describe('arrow interpolation with connected players', () => {
      it('syncs arrow endpoints with interpolated player coordinates during transition', () => {
        const slides: Slide[] = [
          {
            id: 's1',
            index: 0,
            transitionDurationMs: 1000,
            pauseMs: 0,
            easing: 'linear',
            players: [
              {
                id: 'p1',
                team: 'home',
                area: 'pitch',
                x: 10,
                y: 10,
                style: {
                  markerType: 'circle',
                  insideContent: 'number',
                  bottomLabel: 'name',
                  color: '#000',
                  strokeColor: '#fff',
                  strokeWidth: 2,
                  sizeScale: 1,
                  numberSizeScale: 1,
                  labelSizeScale: 1,
                },
                connectLines: [],
                badges: [],
              },
              {
                id: 'p2',
                team: 'away',
                area: 'pitch',
                x: 80,
                y: 80,
                style: {
                  markerType: 'circle',
                  insideContent: 'number',
                  bottomLabel: 'name',
                  color: '#fff',
                  strokeColor: '#000',
                  strokeWidth: 2,
                  sizeScale: 1,
                  numberSizeScale: 1,
                  labelSizeScale: 1,
                },
                connectLines: [],
                badges: [],
              },
            ],
            arrows: [
              {
                id: 'arrow-sync-1',
                annotationType: 'arrow',
                arrowType: 'pass',
                curveType: 'straight',
                sourcePlayerId: 'p1',
                targetPlayerId: 'p2',
                points: [
                  { x: 10, y: 10 },
                  { x: 80, y: 80 },
                ],
                color: '#38bdf8',
                strokeWidth: 3,
                dashArray: [6, 4],
                arrowHead: false,
              },
            ],
            zones: [],
            texts: [],
            ball: { x: 50, y: 50, visible: true },
          },
          {
            id: 's2',
            index: 1,
            transitionDurationMs: 1000,
            pauseMs: 0,
            easing: 'linear',
            players: [
              {
                id: 'p1',
                team: 'home',
                area: 'pitch',
                x: 30,
                y: 50,
                style: {
                  markerType: 'circle',
                  insideContent: 'number',
                  bottomLabel: 'name',
                  color: '#000',
                  strokeColor: '#fff',
                  strokeWidth: 2,
                  sizeScale: 1,
                  numberSizeScale: 1,
                  labelSizeScale: 1,
                },
                connectLines: [],
                badges: [],
              },
              {
                id: 'p2',
                team: 'away',
                area: 'pitch',
                x: 60,
                y: 20,
                style: {
                  markerType: 'circle',
                  insideContent: 'number',
                  bottomLabel: 'name',
                  color: '#fff',
                  strokeColor: '#000',
                  strokeWidth: 2,
                  sizeScale: 1,
                  numberSizeScale: 1,
                  labelSizeScale: 1,
                },
                connectLines: [],
                badges: [],
              },
            ],
            arrows: [
              {
                id: 'arrow-sync-1',
                annotationType: 'arrow',
                arrowType: 'pass',
                curveType: 'straight',
                sourcePlayerId: 'p1',
                targetPlayerId: 'p2',
                // Points intentionally differing or outdated in raw data
                points: [
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                ],
                color: '#38bdf8',
                strokeWidth: 3,
                dashArray: [6, 4],
                arrowHead: false,
              },
            ],
            zones: [],
            texts: [],
            ball: { x: 50, y: 50, visible: true },
          },
        ];

        // At t=0.5 (500ms):
        // p1 moves from (10, 10) to (30, 50) -> expected (20, 30)
        // p2 moves from (80, 80) to (60, 20) -> expected (70, 50)
        const frameMid = getInterpolatedUnifiedSlideFrame(slides, 500);
        expect(frameMid.players.p1.x).toBeCloseTo(20, 1);
        expect(frameMid.players.p1.y).toBeCloseTo(30, 1);
        expect(frameMid.players.p2.x).toBeCloseTo(70, 1);
        expect(frameMid.players.p2.y).toBeCloseTo(50, 1);

        const arrow = frameMid.arrows['arrow-sync-1'];
        expect(arrow).toBeDefined();
        // Endpoints MUST synchronize with the interpolated player coordinates
        expect(arrow.points[0].x).toBeCloseTo(20, 1);
        expect(arrow.points[0].y).toBeCloseTo(30, 1);
        expect(arrow.points[1].x).toBeCloseTo(70, 1);
        expect(arrow.points[1].y).toBeCloseTo(50, 1);
        expect(arrow.dashArray).toEqual([6, 4]);
        expect(arrow.arrowHead).toBe(false);
      });
    });
  });
});
