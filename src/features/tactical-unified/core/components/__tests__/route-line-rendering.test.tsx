import { render } from '@testing-library/react';
import type Konva from 'konva';
import React from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { compileArrows } from '@/lib/tactical/compiler/compile-arrows';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';
import { ArrowObject } from '../annotations/ArrowObject';

const VIEWPORT: StageViewport = {
  width: 1200,
  height: 800,
};

function createArrow(
  overrides: Partial<DomainArrowAnnotation> = {},
): DomainArrowAnnotation {
  return {
    id: 'arrow-1',
    annotationType: 'arrow',
    arrowType: 'route_line',
    curveType: 'straight',
    points: [
      toScreenNormPoint(20, 50, false),
      toScreenNormPoint(80, 50, false),
    ],
    color: '#ffffff',
    strokeWidth: 4,
    dashArray: [],
    startMarker: 'dot',
    endMarker: 'dot',
    ...overrides,
  };
}

function createFrame(arrows: DomainArrowAnnotation[]): EvaluatedTimelineFrame {
  return {
    slide: {
      id: 'slide-1',
      index: 0,
      players: [],
      arrows,
      zones: [],
      texts: [],
    } as unknown as EvaluatedTimelineFrame['slide'],
    arrowProgressMap: {},
    playerFocusMap: {},
    playerVisionMap: {},
  } as unknown as EvaluatedTimelineFrame;
}

function renderArrowObject(arrow: DomainArrowAnnotation) {
  const frame = createFrame([arrow]);
  const [resolvedArrow] = compileArrows(frame, null, VIEWPORT, new Map());
  const stageRef = React.createRef<Konva.Stage>();

  render(
    <Stage ref={stageRef} width={VIEWPORT.width} height={VIEWPORT.height}>
      <Layer>
        <ArrowObject
          arrow={arrow}
          stageSize={VIEWPORT}
          isSelected={false}
          isInteractive={false}
          onSelect={vi.fn()}
          updateArrow={vi.fn()}
          resolvedArrow={resolvedArrow}
        />
      </Layer>
    </Stage>,
  );

  return {
    stage: stageRef.current!,
    resolvedArrow,
  };
}

describe('route-line Konva rendering', () => {
  it('case 1: places start/end Circles at marker points and offsets Arrow line endpoints by dotRadiusPx', () => {
    const arrow = createArrow();
    const { stage, resolvedArrow } = renderArrowObject(arrow);

    const circles = stage
      .find<Konva.Circle>('Circle')
      .filter((c) => c.visible());
    expect(circles).toHaveLength(2);

    const startCircle = circles[0];
    const endCircle = circles[1];
    expect(startCircle.x()).toBeCloseTo(resolvedArrow.startMarkerPointPx!.x);
    expect(startCircle.y()).toBeCloseTo(resolvedArrow.startMarkerPointPx!.y);
    expect(endCircle.x()).toBeCloseTo(resolvedArrow.endMarkerPointPx!.x);
    expect(endCircle.y()).toBeCloseTo(resolvedArrow.endMarkerPointPx!.y);

    const konvaArrow = stage.findOne<Konva.Arrow>('Arrow');
    expect(konvaArrow).toBeDefined();
    const points = konvaArrow!.points();
    expect(points[0]).toBeCloseTo(
      resolvedArrow.startMarkerPointPx!.x + resolvedArrow.dotRadiusPx,
    );
    expect(points[2]).toBeCloseTo(
      resolvedArrow.endMarkerPointPx!.x - resolvedArrow.dotRadiusPx,
    );
  });

  it('case 2: renders only 1 Circle at end when startMarker is none and endMarker is dot', () => {
    const arrow = createArrow({
      startMarker: 'none',
      endMarker: 'dot',
    });
    const { stage, resolvedArrow } = renderArrowObject(arrow);

    const circles = stage
      .find<Konva.Circle>('Circle')
      .filter((c) => c.visible());
    expect(circles).toHaveLength(1);
    expect(circles[0].x()).toBeCloseTo(resolvedArrow.endMarkerPointPx!.x);
    expect(circles[0].y()).toBeCloseTo(resolvedArrow.endMarkerPointPx!.y);
  });

  it('case 3: renders solid Arrow (dash undefined) when dashArray is [] and dashed when dashArray is [6, 4]', () => {
    const solidArrow = createArrow({ dashArray: [] });
    const { stage: solidStage } = renderArrowObject(solidArrow);
    const solidKonvaArrow = solidStage.findOne<Konva.Arrow>('Arrow');
    expect(solidKonvaArrow!.dash()).toBeUndefined();

    const dashedArrow = createArrow({ dashArray: [6, 4] });
    const { stage: dashedStage } = renderArrowObject(dashedArrow);
    const dashedKonvaArrow = dashedStage.findOne<Konva.Arrow>('Arrow');
    expect(dashedKonvaArrow!.dash()).toEqual([6, 4]);
  });
});
