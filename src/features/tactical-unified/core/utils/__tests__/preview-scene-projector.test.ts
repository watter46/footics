import { describe, expect, it } from 'vitest';
import type {
  ArrowAnnotation,
  BoundaryBox,
  PitchTransform,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { AnnotationsData, BallAnnotation } from '../../types';
import type { PitchRectBounds } from '../canvas-coordinates';
import {
  applyBoundaryCropToPitchRect,
  hasActiveCameraTransform,
  projectNorm100WithMatrix,
  projectSceneForCamera,
} from '../preview-scene-projector';

describe('preview-scene-projector', () => {
  describe('hasActiveCameraTransform', () => {
    it('returns false for null, undefined, or default transform', () => {
      expect(hasActiveCameraTransform(null)).toBe(false);
      expect(hasActiveCameraTransform(undefined)).toBe(false);
      expect(
        hasActiveCameraTransform({
          tilt: 0,
          yaw: 90,
          zoom: 1,
          panX: 0,
          panY: 0,
          isLocked: false,
        }),
      ).toBe(false);
    });

    it.each([
      { tilt: 15, yaw: 90, zoom: 1, panX: 0, panY: 0, isLocked: false },
      { tilt: 0, yaw: 80, zoom: 1, panX: 0, panY: 0, isLocked: false },
      { tilt: 0, yaw: 90, zoom: 1.2, panX: 0, panY: 0, isLocked: false },
      { tilt: 0, yaw: 90, zoom: 1, panX: 5, panY: 0, isLocked: false },
      { tilt: 0, yaw: 90, zoom: 1, panX: 0, panY: -5, isLocked: false },
    ])('returns true when property deviates from default (%o)', (pt) => {
      expect(hasActiveCameraTransform(pt)).toBe(true);
    });
  });

  describe('projectSceneForCamera', () => {
    const createTestPlayer = (
      id: string,
      area: 'pitch' | 'bench',
      x: number,
      y: number,
    ): Player => ({
      id,
      team: 'home',
      area,
      x,
      y,
      style: {
        color: '#ff0000',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
        markerType: 'circle',
        insideContent: 'number',
        bottomLabel: 'name',
      },
      connectLines: [],
      badges: [],
    });

    const defaultAnnotations: AnnotationsData = {
      markers: [
        createTestPlayer('p1', 'pitch', 30, 40),
        createTestPlayer('bench-1', 'bench', 10, 90),
      ],
      arrows: [
        {
          id: 'a1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: 20, y: 30 },
            { x: 40, y: 50 },
          ],
          controlPoint: { x: 30, y: 40 },
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          arrowHead: true,
        },
      ],
      zones: [
        {
          id: 'z-rect',
          annotationType: 'zone',
          zoneType: 'highlight',
          shapeType: 'rect',
          x: 20,
          y: 30,
          width: 40,
          height: 20,
          points: [],
          color: '#f59e0b',
          opacity: 0.25,
          strokeWidth: 3,
        },
        {
          id: 'z-ellipse',
          annotationType: 'zone',
          zoneType: 'highlight',
          shapeType: 'ellipse',
          x: 10,
          y: 20,
          width: 30,
          height: 30,
          points: [],
          color: '#22c55e',
          opacity: 0.3,
          strokeWidth: 2,
        },
      ],
      texts: [
        {
          id: 't1',
          annotationType: 'text',
          x: 50,
          y: 20,
          content: 'Tactical text',
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ],
    };

    const defaultBall: BallAnnotation = {
      x: 55,
      y: 45,
      visible: true,
    };

    it('returns exact same references when camera is default or null', () => {
      const resultNull = projectSceneForCamera({
        annotations: defaultAnnotations,
        ball: defaultBall,
        pitchTransform: null,
        aspectRatio: '16:9',
      });
      expect(resultNull.annotations).toBe(defaultAnnotations);
      expect(resultNull.ball).toBe(defaultBall);
      expect(resultNull.mvpMatrix).toBeNull();

      const resultDefault = projectSceneForCamera({
        annotations: defaultAnnotations,
        ball: defaultBall,
        pitchTransform: {
          tilt: 0,
          yaw: 90,
          zoom: 1,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
        aspectRatio: '16:9',
      });
      expect(resultDefault.annotations).toBe(defaultAnnotations);
      expect(resultDefault.ball).toBe(defaultBall);
      expect(resultDefault.mvpMatrix).toBeNull();
    });

    it('projects markers, ball, texts, arrows, and converts rect/ellipse zones to polygon', () => {
      const transform: PitchTransform = {
        tilt: 45,
        yaw: 75,
        zoom: 1,
        panX: 0,
        panY: 0,
        isLocked: false,
      };
      const result = projectSceneForCamera({
        annotations: defaultAnnotations,
        ball: defaultBall,
        pitchTransform: transform,
        aspectRatio: '16:9',
      });

      expect(result.mvpMatrix).not.toBeNull();
      expect(result.mvpMatrix?.length).toBe(16);

      // Pitch player projected with sizeScale modified by depthScale
      const p1 = result.annotations.markers.find((m) => m.id === 'p1');
      expect(p1).toBeDefined();
      expect(p1?.x).not.toBe(30);
      expect(p1?.y).not.toBe(40);
      expect(p1?.style?.sizeScale).not.toBe(1);

      // Bench player kept as-is
      const bench = result.annotations.markers.find((m) => m.id === 'bench-1');
      expect(bench?.x).toBe(10);
      expect(bench?.y).toBe(90);
      expect(bench?.style?.sizeScale).toBe(1);

      // Ball projected
      expect(result.ball).not.toBeNull();
      expect(result.ball?.x).not.toBe(55);
      expect(result.ball?.y).not.toBe(45);

      // Text projected
      const t1 = result.annotations.texts.find((t) => t.id === 't1');
      expect(t1?.x).not.toBe(50);
      expect(t1?.y).not.toBe(20);

      // Arrow points and controlPoint projected
      const a1 = result.annotations.arrows.find((a) => a.id === 'a1');
      expect(a1?.points[0].x).not.toBe(20);
      expect(a1?.points[0].y).not.toBe(30);
      expect(a1?.controlPoint?.x).not.toBe(30);

      // Zones converted to polygon
      const zRect = result.annotations.zones.find((z) => z.id === 'z-rect');
      expect(zRect?.shapeType).toBe('polygon');
      expect(zRect?.points.length).toBe(4);

      const zEllipse = result.annotations.zones.find(
        (z) => z.id === 'z-ellipse',
      );
      expect(zEllipse?.shapeType).toBe('polygon');
      expect(zEllipse?.points.length).toBe(32);
    });
  });

  describe('applyBoundaryCropToPitchRect', () => {
    const baseVRect: PitchRectBounds = {
      x: 100,
      y: 50,
      width: 800,
      height: 450,
    };

    it('returns same reference when boundaryBox is undefined, disabled, or full-size', () => {
      expect(applyBoundaryCropToPitchRect(baseVRect, undefined)).toBe(
        baseVRect,
      );
      expect(applyBoundaryCropToPitchRect(baseVRect, null)).toBe(baseVRect);
      expect(
        applyBoundaryCropToPitchRect(baseVRect, {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          enabled: false,
        }),
      ).toBe(baseVRect);
      expect(
        applyBoundaryCropToPitchRect(baseVRect, {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          enabled: true,
        }),
      ).toBe(baseVRect);
    });

    it('returns scaled and offset PitchRectBounds when boundaryBox is active', () => {
      const boundaryBox: BoundaryBox = {
        x: 10,
        y: 20,
        width: 50,
        height: 50,
        enabled: true,
      };
      const result = applyBoundaryCropToPitchRect(baseVRect, boundaryBox);

      // fullWidth = 800 * (100 / 50) = 1600
      // fullHeight = 450 * (100 / 50) = 900
      // x = 100 - (10 / 100) * 1600 = 100 - 160 = -60
      // y = 50 - (20 / 100) * 900 = 50 - 180 = -130
      expect(result.width).toBe(1600);
      expect(result.height).toBe(900);
      expect(result.x).toBe(-60);
      expect(result.y).toBe(-130);
    });
  });
});
