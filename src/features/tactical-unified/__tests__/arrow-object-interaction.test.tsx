import { act, render } from '@testing-library/react';
import type Konva from 'konva';
import React from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { ArrowObject } from '@/features/tactical-unified/core/components/annotations/ArrowObject';
import {
  generateWavyLinePoints,
  subdivideQuadraticBezier,
} from '@/lib/tactical/compiler/geometry-primitives';
import type { ResolvedArrowPrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';

const STAGE_SIZE = { width: 800, height: 500 };
type StagePixelPoint = ResolvedArrowPrimitive['startPointPx'];
const px = (x: number, y: number): StagePixelPoint =>
  ({ x, y }) as StagePixelPoint;

function makeArrow(overrides: Partial<ArrowAnnotation> = {}): ArrowAnnotation {
  return {
    id: 'arrow-1',
    annotationType: 'arrow',
    points: [
      { x: 10, y: 50 },
      { x: 60, y: 50 },
    ],
    arrowType: 'pass',
    curveType: 'curved',
    controlPoint: { x: 35, y: 20 },
    color: '#ffffff',
    strokeWidth: 3,
    dashArray: [],
    arrowHead: true,
    ...overrides,
  };
}

function makeResolvedCurvedArrow(): ResolvedArrowPrimitive {
  const s = { x: 80, y: 250 };
  const e = { x: 480, y: 250 };
  const cp = { x: 280, y: 100 };
  const mid = {
    x: 0.25 * s.x + 0.5 * cp.x + 0.25 * e.x,
    y: 0.25 * s.y + 0.5 * cp.y + 0.25 * e.y,
  };
  return {
    id: 'arrow-1',
    flatPointsPx: subdivideQuadraticBezier(s.x, s.y, cp.x, cp.y, e.x, e.y),
    startPointPx: px(s.x, s.y),
    endPointPx: px(e.x, e.y),
    controlHandlePx: px(mid.x, mid.y),
    endMarker: 'arrow',
    startMarker: 'none',
    endAngleRad: 0,
    selected: true,
    color: '#ffffff',
    strokeWidthPx: 3,
    pointerLengthPx: 12,
    pointerWidthPx: 12,
    dotRadiusPx: 6,
    dashArrayPx: [],
    dashOffsetPx: 0,
    opacity: 1,
    visible: true,
  };
}

function makeResolvedWavyArrow(): ResolvedArrowPrimitive {
  const s = { x: 80, y: 250 };
  const e = { x: 480, y: 250 };
  return {
    id: 'arrow-wavy',
    flatPointsPx: generateWavyLinePoints(s.x, s.y, e.x, e.y),
    startPointPx: px(s.x, s.y),
    endPointPx: px(e.x, e.y),
    controlHandlePx: undefined,
    endMarker: 'arrow',
    startMarker: 'none',
    endAngleRad: 0,
    selected: true,
    color: '#ffffff',
    strokeWidthPx: 3,
    pointerLengthPx: 12,
    pointerWidthPx: 12,
    dotRadiusPx: 6,
    dashArrayPx: [],
    dashOffsetPx: 0,
    opacity: 1,
    visible: true,
  };
}

describe('ArrowObject interaction', () => {
  it('places control handle on resolvedArrow.controlHandlePx (on the curve)', () => {
    const stageRef = React.createRef<Konva.Stage>();
    const arrow = makeArrow();
    const resolvedArrow = makeResolvedCurvedArrow();

    render(
      <Stage ref={stageRef} width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
        <Layer>
          <ArrowObject
            arrow={arrow}
            stageSize={STAGE_SIZE}
            isSelected={true}
            onSelect={vi.fn()}
            updateArrow={vi.fn()}
            resolvedArrow={resolvedArrow}
          />
        </Layer>
      </Stage>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    const circles = stage?.find('Circle') ?? [];
    expect(circles.length).toBe(3);
    const controlCircle = circles[2];
    expect(controlCircle.x()).toBeCloseTo(
      resolvedArrow.controlHandlePx?.x ?? 0,
      5,
    );
    expect(controlCircle.y()).toBeCloseTo(
      resolvedArrow.controlHandlePx?.y ?? 0,
      5,
    );
  });

  it('subdivides bezier curve (> 6 points) passing through dragged control handle during dragmove', () => {
    const stageRef = React.createRef<Konva.Stage>();
    const arrow = makeArrow();
    const resolvedArrow = makeResolvedCurvedArrow();

    render(
      <Stage ref={stageRef} width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
        <Layer>
          <ArrowObject
            arrow={arrow}
            stageSize={STAGE_SIZE}
            isSelected={true}
            onSelect={vi.fn()}
            updateArrow={vi.fn()}
            resolvedArrow={resolvedArrow}
          />
        </Layer>
      </Stage>,
    );

    const stage = stageRef.current;
    const circles = stage?.find('Circle') ?? [];
    const controlCircle = circles[2];
    const arrowNode = stage?.findOne('Arrow') as Konva.Arrow | undefined;
    expect(arrowNode).toBeDefined();

    act(() => {
      controlCircle.position({ x: 300, y: 120 });
      controlCircle.fire('dragmove', { target: controlCircle });
    });

    const pts = arrowNode?.points() ?? [];
    expect(pts.length).toBeGreaterThan(6);
    const midIdx = Math.floor(pts.length / 4) * 2;
    expect(pts[midIdx]).toBeCloseTo(300, 1);
    expect(pts[midIdx + 1]).toBeCloseTo(120, 1);
  });

  it('keeps wavy line vertices (> 4 elements) during end handle dragmove on dribble arrow', () => {
    const stageRef = React.createRef<Konva.Stage>();
    const arrow = makeArrow({
      id: 'arrow-wavy',
      arrowType: 'dribble',
      curveType: 'straight',
      controlPoint: undefined,
    });
    const resolvedArrow = makeResolvedWavyArrow();

    render(
      <Stage ref={stageRef} width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
        <Layer>
          <ArrowObject
            arrow={arrow}
            stageSize={STAGE_SIZE}
            isSelected={true}
            onSelect={vi.fn()}
            updateArrow={vi.fn()}
            resolvedArrow={resolvedArrow}
          />
        </Layer>
      </Stage>,
    );

    const stage = stageRef.current;
    const circles = stage?.find('Circle') ?? [];
    const endCircle = circles[1];
    const arrowNode = stage?.findOne('Arrow') as Konva.Arrow | undefined;
    expect(arrowNode).toBeDefined();

    act(() => {
      endCircle.position({ x: 520, y: 300 });
      endCircle.fire('dragmove', { target: endCircle });
    });

    const pts = arrowNode?.points() ?? [];
    expect(pts.length).toBeGreaterThan(4);
  });

  it('offsets handle coordinates by (dxPx, dyPx) during ArrowLineNode body dragmove', () => {
    const stageRef = React.createRef<Konva.Stage>();
    const arrow = makeArrow();
    const resolvedArrow = makeResolvedCurvedArrow();

    render(
      <Stage ref={stageRef} width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
        <Layer>
          <ArrowObject
            arrow={arrow}
            stageSize={STAGE_SIZE}
            isSelected={true}
            onSelect={vi.fn()}
            updateArrow={vi.fn()}
            resolvedArrow={resolvedArrow}
          />
        </Layer>
      </Stage>,
    );

    const stage = stageRef.current;
    const arrowNode = stage?.findOne('Arrow') as Konva.Arrow | undefined;
    const circles = stage?.find('Circle') ?? [];
    const startCircle = circles[0];
    const endCircle = circles[1];
    const controlCircle = circles[2];
    expect(arrowNode).toBeDefined();

    act(() => {
      arrowNode?.position({ x: 25, y: -15 });
      arrowNode?.fire('dragmove', { target: arrowNode });
    });

    expect(startCircle.x()).toBeCloseTo(resolvedArrow.startPointPx.x + 25, 5);
    expect(startCircle.y()).toBeCloseTo(resolvedArrow.startPointPx.y - 15, 5);
    expect(endCircle.x()).toBeCloseTo(resolvedArrow.endPointPx.x + 25, 5);
    expect(endCircle.y()).toBeCloseTo(resolvedArrow.endPointPx.y - 15, 5);
    expect(controlCircle.x()).toBeCloseTo(
      (resolvedArrow.controlHandlePx?.x ?? 0) + 25,
      5,
    );
    expect(controlCircle.y()).toBeCloseTo(
      (resolvedArrow.controlHandlePx?.y ?? 0) - 15,
      5,
    );
  });
});
