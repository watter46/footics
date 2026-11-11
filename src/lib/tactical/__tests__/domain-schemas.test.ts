import { describe, expect, it } from 'vitest';
import {
  BenchPlayerSchema,
  DomainArrowAnnotationSchema,
  DomainBallStateSchema,
  DomainPlayerSchema,
  DomainTextAnnotationSchema,
  DomainZoneAnnotationSchema,
  PitchPlayerSchema,
} from '@/lib/types/tactical/domain-entities';
import {
  DomainSlideSchema,
  DomainTacticalPhaseSchema,
  DomainTacticalProjectSchema,
} from '@/lib/types/tactical/domain-hierarchy';

describe('Domain Entities Schemas', () => {
  const basePlayer = {
    id: 'p-1',
    team: 'home' as const,
    x: 20,
    y: 30,
    style: { color: '#034694' },
    name: 'Player 1',
    shirtNo: '10',
  };

  describe('DomainPlayerSchema (PitchPlayer & BenchPlayer)', () => {
    it('successfully parses a valid PitchPlayer with pitch-specific attributes', () => {
      const parsed = DomainPlayerSchema.safeParse({
        ...basePlayer,
        area: 'pitch',
        connectLines: [
          {
            id: 'cl-1',
            toPlayerId: 'p-2',
            lineStyle: 'solid',
            color: '#ffffff',
          },
        ],
        badges: [{ id: 'b-1', label: 'Captain', color: '#ffff00' }],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.area).toBe('pitch');
      }
    });

    it('successfully parses a valid BenchPlayer', () => {
      const parsed = DomainPlayerSchema.safeParse({
        ...basePlayer,
        area: 'bench',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.area).toBe('bench');
      }
    });

    it('rejects BenchPlayer with pitch-specific attributes (strict mode)', () => {
      const result = BenchPlayerSchema.safeParse({
        ...basePlayer,
        area: 'bench',
        connectLines: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DomainZoneAnnotationSchema', () => {
    it('parses valid rect and ellipse zones', () => {
      const rect = DomainZoneAnnotationSchema.safeParse({
        id: 'z-rect',
        annotationType: 'zone',
        shapeType: 'rect',
        x: 10,
        y: 10,
        width: 30,
        height: 20,
      });
      expect(rect.success).toBe(true);

      const ellipse = DomainZoneAnnotationSchema.safeParse({
        id: 'z-ellipse',
        shapeType: 'ellipse',
        x: 40,
        y: 40,
        width: 15,
        height: 15,
      });
      expect(ellipse.success).toBe(true);
    });

    it('rejects polygon zone with fewer than 3 vertices', () => {
      const result = DomainZoneAnnotationSchema.safeParse({
        id: 'z1',
        shapeType: 'polygon',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('parses valid polygon zone with 3 or more points', () => {
      const result = DomainZoneAnnotationSchema.safeParse({
        id: 'z-poly',
        shapeType: 'polygon',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
          { x: 30, y: 10 },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('DomainArrowAnnotationSchema', () => {
    const baseArrow = {
      id: 'a-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };

    it('parses arrow with startMarker and endMarker defaults', () => {
      const result = DomainArrowAnnotationSchema.safeParse(baseArrow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startMarker).toBe('none');
        expect(result.data.endMarker).toBe('arrow');
      }
    });

    it('rejects arrow with obsolete arrowHead property (strict mode)', () => {
      const result = DomainArrowAnnotationSchema.safeParse({
        ...baseArrow,
        arrowHead: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DomainBallStateSchema & DomainTextAnnotationSchema', () => {
    it('parses DomainBallState and clamps coordinates', () => {
      const result = DomainBallStateSchema.safeParse({
        x: 150,
        y: -50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.x).toBe(115);
        expect(result.data.y).toBe(-15);
      }
    });

    it('parses DomainTextAnnotation', () => {
      const result = DomainTextAnnotationSchema.safeParse({
        id: 't-1',
        x: 50,
        y: 50,
        content: 'Tactical note',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Domain Hierarchy Schemas', () => {
  const sampleSlide = {
    id: 's-1',
    index: 0,
    players: [],
    arrows: [],
    zones: [],
    texts: [],
  };

  const samplePhase = {
    id: 'p-1',
    name: 'Build-up phase',
    aspectRatio: '4:5' as const,
    boundaryBox: { x: 0, y: 0, width: 100, height: 100 },
    backgroundType: 'pitch' as const,
    slides: [sampleSlide],
  };

  const sampleProject = {
    id: 'proj-1',
    version: '3.0.0' as const,
    createdAt: '2026-11-12T00:00:00.000Z',
    updatedAt: '2026-11-12T00:00:00.000Z',
    phases: [samplePhase],
  };

  describe('DomainSlideSchema', () => {
    it('parses a valid slide with default ball state and timing', () => {
      const result = DomainSlideSchema.safeParse(sampleSlide);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ball.visible).toBe(true);
        expect(result.data.ball.x).toBe(50);
        expect(result.data.transitionDurationMs).toBe(1000);
      }
    });

    it('rejects slide with redundant aspectRatio property (strict mode)', () => {
      const result = DomainSlideSchema.safeParse({
        ...sampleSlide,
        aspectRatio: '16:9',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DomainTacticalPhaseSchema', () => {
    it('parses a valid tactical phase', () => {
      const result = DomainTacticalPhaseSchema.safeParse(samplePhase);
      expect(result.success).toBe(true);
    });

    it('rejects phase with zero slides', () => {
      const result = DomainTacticalPhaseSchema.safeParse({
        ...samplePhase,
        slides: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DomainTacticalProjectSchema', () => {
    it('parses a valid tactical project', () => {
      const result = DomainTacticalProjectSchema.safeParse(sampleProject);
      expect(result.success).toBe(true);
    });

    it('rejects project with activeSlideId property (strict mode)', () => {
      const result = DomainTacticalProjectSchema.safeParse({
        ...sampleProject,
        activeSlideId: 's1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects project with zero phases', () => {
      const result = DomainTacticalProjectSchema.safeParse({
        ...sampleProject,
        phases: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
