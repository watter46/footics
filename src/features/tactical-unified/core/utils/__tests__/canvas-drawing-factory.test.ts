import { describe, expect, it, vi } from 'vitest';
import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  commitDrawingShape,
  createRingFadeMarker,
  createRingMarker,
  getDrawingToolBehavior,
  registerDrawingToolBehavior,
  resolveToolPreviewColor,
} from '../canvas-drawing-factory';

describe('canvas-drawing-factory', () => {
  it('createRingFadeMarker が背番号なし・ラベル非表示・markerType: "ring-fade" で生成されること', () => {
    const marker = createRingFadeMarker(50, 50, '#38bdf8');
    expect(marker.shirtNo).toBe('');
    expect(marker.style.markerType).toBe('ring-fade');
    expect(marker.style.insideContent).toBe('none');
    expect(marker.style.bottomLabel).toBe('none');
  });

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
        color: '#38bdf8',
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
        color: '#ffffff',
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
        color: '#ffffff',
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
        color: '#eab308',
      }),
    );
  });

  it('commitDrawingShape がゾーンを赤色(#ef4444)・透明度0.25でコミットすること', () => {
    const addArrow = vi.fn<(a: ArrowAnnotation) => void>();
    const addZone = vi.fn<(z: ZoneAnnotation) => void>();

    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'zone',
        startX: 10,
        startY: 10,
        currentX: 60,
        currentY: 60,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );

    expect(addZone).toHaveBeenCalledWith(
      expect.objectContaining({
        annotationType: 'zone',
        color: '#ef4444',
        opacity: 0.25,
      }),
    );
  });

  it('resolveToolPreviewColor がツールの既定色およびユーザー選択色を正しく解決すること', () => {
    expect(resolveToolPreviewColor('route_line')).toBe('#38bdf8');
    expect(resolveToolPreviewColor('arrow_wavy')).toBe('#eab308');
    expect(resolveToolPreviewColor('zone')).toBe('#ef4444');
    expect(resolveToolPreviewColor('line')).toBe('#ffffff');
    expect(resolveToolPreviewColor('line', '#10b981')).toBe('#10b981');
    expect(resolveToolPreviewColor('route_line', '#10b981')).toBe('#10b981');
  });

  it('registerDrawingToolBehavior でカスタムツールを登録し commitDrawingShape に委譲されること', () => {
    const customCommit = vi.fn();
    registerDrawingToolBehavior('custom_star', {
      interactionKind: 'drag-shape',
      previewKind: 'line',
      defaultPreviewColor: '#a855f7',
      commitDrag: customCommit,
    });

    expect(getDrawingToolBehavior('custom_star')).toBeDefined();
    expect(resolveToolPreviewColor('custom_star')).toBe('#a855f7');

    const addArrow = vi.fn<(a: ArrowAnnotation) => void>();
    const addZone = vi.fn<(z: ZoneAnnotation) => void>();
    const preview = {
      isDrawing: true,
      tool: 'custom_star' as never,
      startX: 0,
      startY: 0,
      currentX: 10,
      currentY: 10,
    };

    commitDrawingShape(preview, '#a855f7', 2, addArrow, addZone);
    expect(customCommit).toHaveBeenCalledWith(
      preview,
      '#a855f7',
      2,
      expect.objectContaining({
        addArrow,
        addZone,
      }),
    );
  });
});
