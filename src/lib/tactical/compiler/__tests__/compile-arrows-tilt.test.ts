import { describe, expect, it } from 'vitest';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import {
  calculateLastSegmentAngle,
  computeArrowDimensions,
  generateWavyLinePoints,
  offsetArrowEndpoints,
} from '@/lib/tactical/compiler/geometry-primitives';
import type { EphemeralSessionState } from '@/lib/tactical/compiler/scene-graph-dto';
import { screenNormToStagePixel } from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import { evaluateStaticSlideFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toScreenNormCoord,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { PitchTransform } from '@/lib/types/tactical/camera-config';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

function createBaseSlide(overrides?: Partial<DomainSlide>): DomainSlide {
  const p1: PitchPlayer = {
    id: 'p1',
    area: 'pitch',
    team: 'home',
    x: toScreenNormCoord(20),
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

  return {
    id: 'slide-1',
    index: 0,
    players: [p1],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: toScreenNormCoord(50),
      y: toScreenNormCoord(50),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'linear',
    ...overrides,
  };
}

describe('compileArrows 3D Pitch Plane Projection', () => {
  const viewport = { width: 1000, height: 800 };
  const pitchTransform: PitchTransform = {
    tilt: 25,
    panX: 0,
    panY: 0,
    zoom: 1,
    isLocked: false,
  };

  it('case 1: projects wavy dribble arrow vertices generated on the pre-projection pitch plane', () => {
    const startNorm = toScreenNormPoint(20, 40, false);
    const endNorm = toScreenNormPoint(70, 60, false);

    const slide = createBaseSlide({
      pitchTransform,
      arrows: [
        {
          id: 'arr-wavy',
          annotationType: 'arrow',
          arrowType: 'dribble',
          points: [startNorm, endNorm],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
          curveType: 'straight',
        },
      ],
    });

    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);
    const arrow = scene.arrows.find((a) => a.id === 'arr-wavy');
    expect(arrow).toBeDefined();

    const startRawPx = screenNormToStagePixel(startNorm, viewport);
    const endRawPx = screenNormToStagePixel(endNorm, viewport);
    const dims = computeArrowDimensions(viewport.width, 3);
    const offsetRes = offsetArrowEndpoints({
      startX: startRawPx.x,
      startY: startRawPx.y,
      endX: endRawPx.x,
      endY: endRawPx.y,
      startMarker: 'none',
      endMarker: 'arrow',
      dotRadius: dims.dotRadius,
    });
    const rawWavy = generateWavyLinePoints(
      offsetRes.startX,
      offsetRes.startY,
      offsetRes.endX,
      offsetRes.endY,
    );

    const expectedFlatPoints: number[] = [];
    for (let i = 0; i < rawWavy.length; i += 2) {
      const proj = projectStagePixelWithPitchTransform(
        toStagePixelPoint(rawWavy[i], rawWavy[i + 1]),
        viewport,
        pitchTransform,
      );
      expectedFlatPoints.push(proj.x, proj.y);
    }

    expect(arrow?.flatPointsPx.length).toBe(expectedFlatPoints.length);
    for (let i = 0; i < expectedFlatPoints.length; i++) {
      expect(arrow?.flatPointsPx[i]).toBeCloseTo(expectedFlatPoints[i], 5);
    }
  });

  it('case 2: projects controlHandlePx at t=0.5 of the curved arrow and computes endAngleRad from projected last segment', () => {
    const startNorm = toScreenNormPoint(20, 50, false);
    const endNorm = toScreenNormPoint(80, 50, false);
    const cpNorm = toScreenNormPoint(50, 20, false);

    const slide = createBaseSlide({
      pitchTransform,
      arrows: [
        {
          id: 'arr-curved',
          annotationType: 'arrow',
          arrowType: 'pass',
          points: [startNorm, endNorm],
          controlPoint: cpNorm,
          color: '#facc15',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
          curveType: 'curved',
        },
      ],
    });

    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);
    const arrow = scene.arrows.find((a) => a.id === 'arr-curved');
    expect(arrow).toBeDefined();
    expect(arrow?.controlHandlePx).toBeDefined();

    // subdivideQuadraticBezier uses 30 steps -> index 15 (flatPointsPx indices 30, 31) is t = 0.5
    const midX = arrow?.flatPointsPx[30] ?? 0;
    const midY = arrow?.flatPointsPx[31] ?? 0;
    expect(arrow?.controlHandlePx?.x).toBeCloseTo(midX, 5);
    expect(arrow?.controlHandlePx?.y).toBeCloseTo(midY, 5);

    const expectedEndAngle = calculateLastSegmentAngle(
      arrow?.flatPointsPx ?? [],
    );
    expect(arrow?.endAngleRad).toBeCloseTo(expectedEndAngle, 6);
  });

  it('case 3: sourcePlayerId arrow tracks dragged player projected start while keeping fixed end under tilt', () => {
    const endNorm = toScreenNormPoint(70, 50, false);
    const slide = createBaseSlide({
      pitchTransform,
      arrows: [
        {
          id: 'arr-player',
          annotationType: 'arrow',
          arrowType: 'pass',
          sourcePlayerId: 'p1',
          points: [toScreenNormPoint(20, 50, false), endNorm],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
          curveType: 'straight',
        },
      ],
    });

    const session: EphemeralSessionState = {
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
      selectedIds: ['p1'],
      activeDragDelta: {
        entityIds: ['p1'],
        deltaScreenNormX: 10,
        deltaScreenNormY: -10,
      },
    };

    const frame = evaluateStaticSlideFrame(slide);
    const baseScene = compileSceneGraph(frame, null, viewport);
    const draggedScene = compileSceneGraph(frame, session, viewport);

    const baseArrow = baseScene.arrows.find((a) => a.id === 'arr-player');
    const draggedArrow = draggedScene.arrows.find((a) => a.id === 'arr-player');
    expect(baseArrow).toBeDefined();
    expect(draggedArrow).toBeDefined();

    expect(draggedArrow?.startPointPx.x).not.toBeCloseTo(
      baseArrow?.startPointPx.x ?? 0,
      2,
    );
    expect(draggedArrow?.startPointPx.y).not.toBeCloseTo(
      baseArrow?.startPointPx.y ?? 0,
      2,
    );
    expect(draggedArrow?.endPointPx.x).toBeCloseTo(
      baseArrow?.endPointPx.x ?? 0,
      5,
    );
    expect(draggedArrow?.endPointPx.y).toBeCloseTo(
      baseArrow?.endPointPx.y ?? 0,
      5,
    );
  });
});
