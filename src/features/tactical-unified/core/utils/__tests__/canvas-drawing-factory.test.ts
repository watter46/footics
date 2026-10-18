import { describe, expect, it, vi } from 'vitest';
import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  commitDrawingShape,
  createRingMarker,
} from '../canvas-drawing-factory';

describe('canvas-drawing-factory', () => {
  it('createRingMarker が背番号なし・ラベル非表示で生成されること', () => {
    const marker = createRingMarker(50, 50, '#38bdf8');
    expect(marker.shirtNo).toBe('');
    expect(marker.style.markerType).toBe('ring');
    expect(marker.style.insideContent).toBe('none');
    expect(marker.style.bottomLabel).toBe('none');
  });

  it('commitDrawingShape が直線・ルートラインをコミットすること', () => {
    const addArrow = vi.fn<(a: ArrowAnnotation) => void>();
    const addZone = vi.fn<(z: ZoneAnnotation) => void>();

    // Straight Line (line)
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'line',
        startX: 10,
        startY: 10,
        currentX: 50,
        currentY: 50,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addArrow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        arrowType: 'line',
        arrowHead: false,
        dashArray: [],
        endMarker: 'none',
      }),
    );

    // Route Line (route_line)
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'route_line',
        startX: 10,
        startY: 10,
        currentX: 50,
        currentY: 50,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addArrow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        arrowType: 'route_line',
        arrowHead: false,
        dashArray: [],
        endMarker: 'dot',
      }),
    );
  });

  it('commitDrawingShape が矢印ツール群を正確にコミットすること', () => {
    const addArrow = vi.fn<(a: ArrowAnnotation) => void>();
    const addZone = vi.fn<(z: ZoneAnnotation) => void>();

    // Solid Arrow (arrow_solid)
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'arrow_solid',
        startX: 10,
        startY: 10,
        currentX: 50,
        currentY: 50,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addArrow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        arrowType: 'pass',
        arrowHead: true,
        dashArray: [],
        endMarker: 'arrow',
      }),
    );

    // Dashed Arrow (arrow_dash)
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'arrow_dash',
        startX: 10,
        startY: 10,
        currentX: 50,
        currentY: 50,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addArrow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        arrowType: 'pass',
        arrowHead: true,
        dashArray: [6, 4],
        endMarker: 'arrow',
      }),
    );

    // Wavy Arrow (arrow_wavy)
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'arrow_wavy',
        startX: 10,
        startY: 10,
        currentX: 50,
        currentY: 50,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addArrow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        arrowType: 'dribble',
        arrowHead: true,
        dashArray: [],
        endMarker: 'arrow',
      }),
    );
  });
});
