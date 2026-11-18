import { describe, expect, it } from 'vitest';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import { compileDrawingPreview } from '@/lib/tactical/compiler/compile-zones';
import {
  generateWavyLinePoints,
  subdivideQuadraticBezier,
  trimFlatPoints,
} from '@/lib/tactical/compiler/geometry-primitives';
import type { EphemeralSessionState } from '@/lib/tactical/compiler/scene-graph-dto';
import { evaluateStaticSlideFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

function createMockSlide(): DomainSlide {
  const p1: DomainPlayer = {
    id: 'p1',
    area: 'pitch',
    team: 'home',
    x: toScreenNormCoord(10),
    y: toScreenNormCoord(50),
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
  };

  const p2: DomainPlayer = {
    id: 'p2',
    area: 'pitch',
    team: 'away',
    x: toScreenNormCoord(90),
    y: toScreenNormCoord(50),
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color: '#ef4444',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    },
    connectLines: [],
    badges: [],
  };

  const p3: DomainPlayer = {
    id: 'p3',
    area: 'pitch',
    team: 'home',
    x: toScreenNormCoord(50),
    y: toScreenNormCoord(20),
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
  };

  const a1: DomainArrowAnnotation = {
    id: 'a1',
    annotationType: 'arrow',
    arrowType: 'pass',
    curveType: 'straight',
    points: [toScreenNormPoint(10, 50), toScreenNormPoint(90, 50)],
    color: '#ffffff',
    strokeWidth: 3,
    dashArray: [],
    startMarker: 'none',
    endMarker: 'arrow',
    sourcePlayerId: 'p1',
    targetPlayerId: 'p2',
  };

  return {
    id: 'slide-1',
    index: 0,
    players: [p1, p2, p3],
    arrows: [a1],
    zones: [],
    texts: [
      {
        id: 't1',
        annotationType: 'text',
        x: toScreenNormCoord(50),
        y: toScreenNormCoord(10),
        content: 'Title',
        fontSize: 16,
        color: '#ffffff',
        bold: true,
        italic: false,
      },
    ],
    ball: {
      x: toScreenNormCoord(50),
      y: toScreenNormCoord(80),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'linear',
  };
}

describe('compileSceneGraph', () => {
  const viewport = { width: 1000, height: 500 };

  it('compiles player radius offsets for bound arrows', () => {
    const slide = createMockSlide();
    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);

    expect(scene.arrows).toHaveLength(1);
    const a1 = scene.arrows[0];
    // p1 at x=100 (10% of 1000), p2 at x=900 (90% of 1000)
    // Offset by player radius (> 100 at start, < 900 at end)
    expect(a1.flatPointsPx[0]).toBeGreaterThan(100);
    expect(a1.flatPointsPx[a1.flatPointsPx.length - 2]).toBeLessThan(900);
  });

  it('reflects selectedIds without mutating input frame', () => {
    const slide = createMockSlide();
    const frame = evaluateStaticSlideFrame(slide);

    const session: EphemeralSessionState = {
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
      selectedIds: ['p1'],
    };

    const scene = compileSceneGraph(frame, session, viewport);

    const p1Item = scene.billboardItems.find(
      (item) => item.kind === 'player' && item.id === 'p1',
    );
    expect(p1Item).toBeDefined();
    expect(p1Item?.positionPx).toEqual({ x: 100, y: 250 });

    // Original frame must remain unchanged
    expect(frame.slide.players[0].x).toBe(10);
    expect(frame.slide.players[0].y).toBe(50);
  });

  it('sorts billboard items by depthSortKey (Y ascending)', () => {
    const slide = createMockSlide();
    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);

    const keys = scene.billboardItems.map((item) => item.depthSortKey);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).toBeGreaterThanOrEqual(keys[i - 1]);
    }
  });

  it('compiles zones, connectLines, and drawingPreview correctly', () => {
    const slide = createMockSlide();
    const p1 = slide.players[0];
    const p2 = slide.players[1];
    // Add connectLine to p1
    (p1 as unknown as { connectLines: unknown[] }).connectLines = [
      {
        id: 'cl1',
        toPlayerId: p2.id,
        lineStyle: 'dashed',
        color: '#ffffff',
        strokeWidth: 3.5,
        visible: true,
      },
    ];

    const slideWithZones: DomainSlide = {
      ...slide,
      zones: [
        {
          id: 'z1',
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'rect',
          x: toScreenNormCoord(20),
          y: toScreenNormCoord(30),
          width: 40,
          height: 20,
          color: '#f59e0b',
          opacity: 0.25,
          strokeWidth: 3,
        },
      ],
    };

    const session: EphemeralSessionState = {
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
      selectedIds: ['z1'],
    };

    const frame = evaluateStaticSlideFrame(slideWithZones);
    const scene = compileSceneGraph(frame, session, viewport);

    expect(scene.zones).toHaveLength(1);
    expect(scene.zones[0].selected).toBe(true);
    expect(scene.zones[0].xPx).toBe(200);
    expect(scene.zones[0].yPx).toBe(150);

    expect(scene.connectLines).toHaveLength(1);
    expect(scene.connectLines[0].fromPlayerId).toBe('p1');
    expect(scene.connectLines[0].toPlayerId).toBe('p2');
  });

  it('compiles drawingPreview for zones, arrows, route lines, and returns null for null input', () => {
    const viewport = { width: 1000, height: 500 };

    const zonePreview = compileDrawingPreview(
      {
        tool: 'zone',
        startPoint: toScreenNormPoint(10, 10),
        currentPoint: toScreenNormPoint(30, 40),
      },
      viewport,
      { color: '#ef4444', strokeWidth: 3 },
    );
    expect(zonePreview).not.toBeNull();
    if (zonePreview && 'shapeType' in zonePreview) {
      expect(zonePreview.shapeType).toBe('rect');
      expect(zonePreview.xPx).toBe(100);
      expect(zonePreview.yPx).toBe(50);
      expect(zonePreview.widthPx).toBe(200);
      expect(zonePreview.heightPx).toBe(150);
      expect(zonePreview.opacity).toBe(0.25);
    } else {
      throw new Error('Expected ResolvedZonePrimitive for zone tool');
    }

    const circlePreview = compileDrawingPreview(
      {
        tool: 'zone_circle',
        startPoint: toScreenNormPoint(10, 10),
        currentPoint: toScreenNormPoint(30, 40),
      },
      viewport,
      { color: '#ef4444', strokeWidth: 3 },
    );
    expect(circlePreview).not.toBeNull();
    if (circlePreview && 'shapeType' in circlePreview) {
      expect(circlePreview.shapeType).toBe('ellipse');
      expect(circlePreview.xPx).toBe(100);
      expect(circlePreview.yPx).toBe(50);
      expect(circlePreview.widthPx).toBe(200);
      expect(circlePreview.heightPx).toBe(150);
    } else {
      throw new Error('Expected ResolvedZonePrimitive for zone_circle tool');
    }

    const wavyPreview = compileDrawingPreview(
      {
        tool: 'arrow_wavy',
        startPoint: toScreenNormPoint(10, 10),
        currentPoint: toScreenNormPoint(30, 40),
      },
      viewport,
      { color: '#ffffff', strokeWidth: 3 },
    );
    expect(wavyPreview).not.toBeNull();
    if (wavyPreview && 'endMarker' in wavyPreview) {
      expect(wavyPreview.endMarker).toBe('arrow');
      expect(wavyPreview.color).toBe('#eab308');
      expect(wavyPreview.flatPointsPx.length).toBeGreaterThan(4);
    } else {
      throw new Error('Expected ResolvedArrowPrimitive for arrow_wavy tool');
    }

    const routePreview = compileDrawingPreview(
      {
        tool: 'route_line',
        startPoint: toScreenNormPoint(10, 10),
        currentPoint: toScreenNormPoint(30, 40),
      },
      viewport,
      { color: '#ffffff', strokeWidth: 3 },
    );
    expect(routePreview).not.toBeNull();
    if (routePreview && 'endMarker' in routePreview) {
      expect(routePreview.startMarker).toBe('dot');
      expect(routePreview.endMarker).toBe('dot');
      expect(routePreview.color).toBe('#38bdf8');
    } else {
      throw new Error('Expected ResolvedArrowPrimitive for route_line tool');
    }

    expect(
      compileDrawingPreview(null, viewport, {
        color: '#ffffff',
        strokeWidth: 2,
      }),
    ).toBeNull();
  });

  it('subdivides quadratic bezier and generates wavy lines', () => {
    const bezier = subdivideQuadraticBezier(0, 0, 50, 100, 100, 0, 10);
    expect(bezier.length).toBe(22); // (10 + 1) * 2 points
    expect(bezier[0]).toBe(0);
    expect(bezier[1]).toBe(0);
    expect(bezier[bezier.length - 2]).toBe(100);
    expect(bezier[bezier.length - 1]).toBe(0);

    const wavy = generateWavyLinePoints(0, 0, 100, 0);
    expect(wavy.length).toBeGreaterThan(4);

    const trimmed = trimFlatPoints([0, 0, 50, 0, 100, 0], 0.5);
    expect(trimmed.flatPointsPx.length).toBeGreaterThanOrEqual(4);
    const lastX = trimmed.flatPointsPx[trimmed.flatPointsPx.length - 2];
    expect(lastX).toBeCloseTo(50, 1);
  });
});
