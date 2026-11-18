import { act, render } from '@testing-library/react';
import type Konva from 'konva';
import React from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { ArrowObject } from '@/features/tactical-unified/core/components/annotations/ArrowObject';
import {
  TacticalStoreProvider,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  generateWavyLinePoints,
  subdivideQuadraticBezier,
} from '@/lib/tactical/compiler/geometry-primitives';
import type { ResolvedArrowPrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';

const STAGE_SIZE = { width: 800, height: 500 };
type StagePixelPoint = ResolvedArrowPrimitive['startPointPx'];
const px = (x: number, y: number): StagePixelPoint =>
  ({ x, y }) as StagePixelPoint;

function makeArrow(
  overrides: Partial<DomainArrowAnnotation> = {},
): DomainArrowAnnotation {
  return {
    id: 'arrow-1',
    annotationType: 'arrow',
    points: [toScreenNormPoint(10, 50), toScreenNormPoint(60, 50)],
    arrowType: 'pass',
    curveType: 'curved',
    controlPoint: toScreenNormPoint(35, 20),
    color: '#ffffff',
    strokeWidth: 3,
    dashArray: [],
    startMarker: 'none',
    endMarker: 'arrow',
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
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={STAGE_SIZE.width}
          height={STAGE_SIZE.height}
        >
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
        </Stage>
      </TacticalStoreProvider>,
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
    const onRender = vi.fn();

    render(
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={STAGE_SIZE.width}
          height={STAGE_SIZE.height}
        >
          <Layer>
            <React.Profiler id="arrow-control-drag" onRender={onRender}>
              <ArrowObject
                arrow={arrow}
                stageSize={STAGE_SIZE}
                isSelected={true}
                onSelect={vi.fn()}
                updateArrow={vi.fn()}
                resolvedArrow={resolvedArrow}
              />
            </React.Profiler>
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const stage = stageRef.current;
    const circles = stage?.find('Circle') ?? [];
    const controlCircle = circles[2];
    const arrowNode = stage?.findOne('Arrow') as Konva.Arrow | undefined;
    expect(arrowNode).toBeDefined();
    const renderCountBeforeDrag = onRender.mock.calls.length;

    act(() => {
      controlCircle.position({ x: 300, y: 120 });
      controlCircle.fire('dragmove', { target: controlCircle });
    });

    expect(onRender.mock.calls.length).toBe(renderCountBeforeDrag);
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
    const onRender = vi.fn();

    render(
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={STAGE_SIZE.width}
          height={STAGE_SIZE.height}
        >
          <Layer>
            <React.Profiler id="arrow-wavy-drag" onRender={onRender}>
              <ArrowObject
                arrow={arrow}
                stageSize={STAGE_SIZE}
                isSelected={true}
                onSelect={vi.fn()}
                updateArrow={vi.fn()}
                resolvedArrow={resolvedArrow}
              />
            </React.Profiler>
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const stage = stageRef.current;
    const circles = stage?.find('Circle') ?? [];
    const endCircle = circles[1];
    const arrowNode = stage?.findOne('Arrow') as Konva.Arrow | undefined;
    expect(arrowNode).toBeDefined();
    const renderCountBeforeDrag = onRender.mock.calls.length;

    act(() => {
      endCircle.position({ x: 520, y: 300 });
      endCircle.fire('dragmove', { target: endCircle });
    });

    expect(onRender.mock.calls.length).toBe(renderCountBeforeDrag);
    const pts = arrowNode?.points() ?? [];
    expect(pts.length).toBeGreaterThan(4);
  });

  it('offsets handle coordinates by (dxPx, dyPx) during ArrowLineNode body dragmove', () => {
    const stageRef = React.createRef<Konva.Stage>();
    const arrow = makeArrow();
    const resolvedArrow = makeResolvedCurvedArrow();
    const onRender = vi.fn();

    render(
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={STAGE_SIZE.width}
          height={STAGE_SIZE.height}
        >
          <Layer>
            <React.Profiler id="arrow-body-drag" onRender={onRender}>
              <ArrowObject
                arrow={arrow}
                stageSize={STAGE_SIZE}
                isSelected={true}
                onSelect={vi.fn()}
                updateArrow={vi.fn()}
                resolvedArrow={resolvedArrow}
              />
            </React.Profiler>
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const stage = stageRef.current;
    const arrowNode = stage?.findOne('Arrow') as Konva.Arrow | undefined;
    const circles = stage?.find('Circle') ?? [];
    const startCircle = circles[0];
    const endCircle = circles[1];
    const controlCircle = circles[2];
    expect(arrowNode).toBeDefined();
    const renderCountBeforeDrag = onRender.mock.calls.length;

    act(() => {
      arrowNode?.position({ x: 25, y: -15 });
      arrowNode?.fire('dragmove', { target: arrowNode });
    });

    expect(onRender.mock.calls.length).toBe(renderCountBeforeDrag);

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

  it('case 5: transitions isDragging and isHudOpen and calls onSelect when dragging unselected ArrowObject body', () => {
    const stageRef = React.createRef<Konva.Stage>();
    const arrow = makeArrow();
    const resolvedArrow = makeResolvedCurvedArrow();
    const onSelect = vi.fn();
    let latestState = { isDragging: false, isHudOpen: true };

    function SessionObserver() {
      const isDragging = useSessionStore((s) => s.isDragging);
      const isHudOpen = useSessionStore((s) => s.isHudOpen);
      latestState = { isDragging, isHudOpen };
      return null;
    }

    render(
      <TacticalStoreProvider>
        <SessionObserver />
        <Stage
          ref={stageRef}
          width={STAGE_SIZE.width}
          height={STAGE_SIZE.height}
        >
          <Layer>
            <ArrowObject
              arrow={arrow}
              stageSize={STAGE_SIZE}
              isSelected={false}
              onSelect={onSelect}
              updateArrow={vi.fn()}
              resolvedArrow={resolvedArrow}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const arrowNode = stageRef.current?.findOne('Arrow') as
      | Konva.Arrow
      | undefined;
    expect(arrowNode).toBeDefined();

    act(() => {
      arrowNode?.fire('dragstart', { target: arrowNode });
    });

    expect(latestState.isDragging).toBe(true);
    expect(latestState.isHudOpen).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);

    act(() => {
      arrowNode?.position({ x: 20, y: 10 });
      arrowNode?.fire('dragend', { target: arrowNode });
    });

    expect(latestState.isDragging).toBe(false);
    expect(latestState.isHudOpen).toBe(false);
  });
});
