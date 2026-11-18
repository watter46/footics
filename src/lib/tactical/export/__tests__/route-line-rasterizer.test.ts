import { describe, expect, it, vi } from 'vitest';
import { normalizeArrows } from '@/lib/tactical/acl/arrow-normalizer';
import { compileDrawingPreview } from '@/lib/tactical/compiler/compile-zones';
import type { ResolvedSceneGraphDTO } from '@/lib/tactical/compiler/scene-graph-dto';
import { rasterizeSceneGraphToCanvas2D } from '@/lib/tactical/export/scene-graph-canvas2d-rasterizer';
import { toScreenNormPoint, toStagePixel } from '@/lib/types/tactical/branded';

describe('Phase 3: RouteLine preview, ACL normalizer, and Canvas2D rasterizer', () => {
  it('case 1: normalizeArrows corrects legacy route_line with startMarker: "none" and endMarker: "dot" to startMarker: "dot"', () => {
    const result = normalizeArrows([
      {
        id: 'arrow-1',
        arrowType: 'route_line',
        points: [
          { x: 10, y: 20 },
          { x: 50, y: 60 },
        ],
        startMarker: 'none',
        endMarker: 'dot',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.arrowType).toBe('route_line');
    expect(result[0]?.startMarker).toBe('dot');
    expect(result[0]?.endMarker).toBe('dot');
  });

  it('case 2: compileDrawingPreview offsets route_line flatPointsPx inward by dotRadiusPx from startMarkerPointPx and endMarkerPointPx', () => {
    const preview = compileDrawingPreview(
      {
        tool: 'route_line',
        startPoint: toScreenNormPoint(10, 50),
        currentPoint: toScreenNormPoint(60, 50),
      },
      { width: 1200, height: 675 },
      { color: '#38bdf8', strokeWidth: 3 },
    );

    expect(preview).not.toBeNull();
    expect(preview && 'startMarker' in preview).toBe(true);
    if (preview && 'startMarker' in preview) {
      expect(preview.startMarker).toBe('dot');
      expect(preview.endMarker).toBe('dot');
      expect(preview.startMarkerPointPx).toEqual(preview.startPointPx);
      expect(preview.endMarkerPointPx).toEqual(preview.endPointPx);

      const [sx, sy, ex, ey] = preview.flatPointsPx;
      expect(sx).toBeCloseTo(
        (preview.startMarkerPointPx?.x ?? 0) + preview.dotRadiusPx,
        4,
      );
      expect(sy).toBeCloseTo(preview.startMarkerPointPx?.y ?? 0, 4);
      expect(ex).toBeCloseTo(
        (preview.endMarkerPointPx?.x ?? 0) - preview.dotRadiusPx,
        4,
      );
      expect(ey).toBeCloseTo(preview.endMarkerPointPx?.y ?? 0, 4);
    }
  });

  it('case 3: rasterizeSceneGraphToCanvas2D draws arc twice at startMarkerPointPx and endMarkerPointPx for dual-dot arrows', () => {
    const arcCalls: Array<[number, number, number, number, number]> = [];
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      setLineDash: vi.fn(),
      arc: vi.fn(
        (x: number, y: number, r: number, start: number, end: number) => {
          arcCalls.push([x, y, r, start, end]);
        },
      ),
      globalAlpha: 1,
      strokeStyle: '#ffffff',
      fillStyle: '#ffffff',
      lineWidth: 1,
      lineDashOffset: 0,
    } as unknown as CanvasRenderingContext2D;

    const sceneGraph = {
      viewport: { width: 1200, height: 675 },
      players: [],
      balls: [],
      arrows: [
        {
          id: 'route-1',
          flatPointsPx: [108, 200, 392, 200],
          startPointPx: { x: toStagePixel(100), y: toStagePixel(200) },
          endPointPx: { x: toStagePixel(400), y: toStagePixel(200) },
          startMarkerPointPx: { x: toStagePixel(100), y: toStagePixel(200) },
          endMarkerPointPx: { x: toStagePixel(400), y: toStagePixel(200) },
          color: '#38bdf8',
          strokeWidthPx: 3,
          dashArrayPx: [],
          dashOffsetPx: 0,
          opacity: 1,
          visible: true,
          startMarker: 'dot',
          endMarker: 'dot',
          pointerLengthPx: 12,
          pointerWidthPx: 10,
          dotRadiusPx: 8,
          endAngleRad: 0,
          selected: false,
        },
      ],
      zones: [],
      connectLines: [],
      trajectories: [],
      billboardItems: [],
      texts: [],
      drawingPreview: null,
      selectionBox: null,
    } as unknown as ResolvedSceneGraphDTO;

    rasterizeSceneGraphToCanvas2D({ ctx: mockCtx, sceneGraph });

    expect(arcCalls).toHaveLength(2);
    expect(arcCalls[0]).toEqual([400, 200, 8, 0, Math.PI * 2]);
    expect(arcCalls[1]).toEqual([100, 200, 8, 0, Math.PI * 2]);
  });
});
