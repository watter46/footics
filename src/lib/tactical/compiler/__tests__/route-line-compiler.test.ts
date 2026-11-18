import { describe, expect, it } from 'vitest';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import { compileArrows } from '../compile-arrows';
import type { ResolvedPlayerInternal } from '../compile-billboards';
import { offsetArrowEndpoints } from '../geometry-primitives';

const VIEWPORT: StageViewport = {
  width: 1200,
  height: 800,
};

function createFrame(
  arrows: EvaluatedTimelineFrame['slide']['arrows'],
): EvaluatedTimelineFrame {
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

describe('route-line compiler & geometry', () => {
  it('case 1: arrowType route_line with empty dashArray produces solid dashArrayPx []', () => {
    const frame = createFrame([
      {
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
      },
    ]);

    const [compiled] = compileArrows(frame, null, VIEWPORT, new Map());
    expect(compiled.dashArrayPx).toEqual([]);
  });

  it('case 2: arrowType route_line with dashArray [6, 4] produces scaled dashArrayPx', () => {
    const frame = createFrame([
      {
        id: 'arrow-2',
        annotationType: 'arrow',
        arrowType: 'route_line',
        curveType: 'straight',
        points: [
          toScreenNormPoint(20, 50, false),
          toScreenNormPoint(80, 50, false),
        ],
        color: '#ffffff',
        strokeWidth: 4,
        dashArray: [6, 4],
        startMarker: 'dot',
        endMarker: 'dot',
      },
    ]);

    const [compiled] = compileArrows(frame, null, VIEWPORT, new Map());
    expect(compiled.dashArrayPx).toEqual([6, 4]);
  });

  it('case 3: unattached dot markers keep marker center at raw points and offset line endpoints inward by dotRadiusPx', () => {
    const frame = createFrame([
      {
        id: 'arrow-3',
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
      },
    ]);

    const [compiled] = compileArrows(frame, null, VIEWPORT, new Map());
    expect(compiled.startMarkerPointPx).toMatchObject({ x: 240, y: 400 });
    expect(compiled.endMarkerPointPx).toMatchObject({ x: 960, y: 400 });
    expect(compiled.flatPointsPx[0]).toBeCloseTo(240 + compiled.dotRadiusPx, 5);
    expect(compiled.flatPointsPx[1]).toBeCloseTo(400, 5);
    expect(compiled.flatPointsPx[2]).toBeCloseTo(960 - compiled.dotRadiusPx, 5);
    expect(compiled.flatPointsPx[3]).toBeCloseTo(400, 5);
  });

  it('case 4: player-attached dot markers place marker at playerRadius+dotRadius, line at playerRadius+dotRadius*2, and clamp short distances', () => {
    const playersMap = new Map<string, ResolvedPlayerInternal>([
      [
        'p1',
        {
          screenNormPos: toScreenNormPoint(20, 50, false),
          radiusPx: 20,
        } as unknown as ResolvedPlayerInternal,
      ],
      [
        'p2',
        {
          screenNormPos: toScreenNormPoint(80, 50, false),
          radiusPx: 20,
        } as unknown as ResolvedPlayerInternal,
      ],
    ]);
    const frame = createFrame([
      {
        id: 'arrow-4',
        annotationType: 'arrow',
        arrowType: 'route_line',
        curveType: 'straight',
        sourcePlayerId: 'p1',
        targetPlayerId: 'p2',
        points: [
          toScreenNormPoint(20, 50, false),
          toScreenNormPoint(80, 50, false),
        ],
        color: '#ffffff',
        strokeWidth: 4,
        dashArray: [],
        startMarker: 'dot',
        endMarker: 'dot',
      },
    ]);

    const [compiled] = compileArrows(frame, null, VIEWPORT, playersMap);
    const r = compiled.dotRadiusPx;
    expect(compiled.startMarkerPointPx?.x).toBeCloseTo(240 + 20 + r, 5);
    expect(compiled.endMarkerPointPx?.x).toBeCloseTo(960 - (20 + r), 5);
    expect(compiled.flatPointsPx[0]).toBeCloseTo(240 + 20 + r * 2, 5);
    expect(compiled.flatPointsPx[2]).toBeCloseTo(960 - (20 + r * 2), 5);

    const short = offsetArrowEndpoints({
      startX: 100,
      startY: 100,
      endX: 130,
      endY: 100,
      sourcePlayerRadius: 20,
      targetPlayerRadius: 20,
      startMarker: 'dot',
      endMarker: 'dot',
      dotRadius: 6,
    });
    expect(short.startX).toBe(115);
    expect(short.endX).toBe(115);
  });
});
