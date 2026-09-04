import { describe, expect, it } from 'vitest';
import type { Slide, ZoneAnnotation } from '@/lib/types/tactical-unified';
import {
  calculateUnifiedTotalDuration,
  getInterpolatedUnifiedSlideFrame,
  interpolateColor,
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

    it('calculates total duration across slides', () => {
      const total = calculateUnifiedTotalDuration(mockSlides);
      expect(total).toBe(1500); // 1000ms + 500ms for slide 0
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
    });

    it('interpolates player along custom bezier trajectory', () => {
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
  });
});
