import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { compileZones } from '@/lib/tactical/compiler/compile-zones';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import { interpolateZone } from '@/lib/tactical/interpolation-annotation';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import {
  type ZoneAnnotation,
  ZoneAnnotationSchema,
} from '@/lib/types/tactical-unified';

describe('tactical-unified Zone Features', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.setState((state) => ({
      ...state,
      selectedObjects: [],
      activeTool: 'select',
    }));
  });

  it('ZoneAnnotationSchema parses with strokeWidth default 3 and strokeOpacity default 1', () => {
    const parsed = ZoneAnnotationSchema.parse({
      id: 'z-test-default',
      annotationType: 'zone',
      zoneType: 'generic',
    });
    expect(parsed.strokeWidth).toBe(3);
    expect(parsed.strokeOpacity).toBe(1);

    const custom = ZoneAnnotationSchema.parse({
      id: 'z-test-custom',
      annotationType: 'zone',
      zoneType: 'generic',
      strokeOpacity: 0.6,
      strokeWidth: 5,
    });
    expect(custom.strokeOpacity).toBe(0.6);
    expect(custom.strokeWidth).toBe(5);
  });

  it('compileZones reflects custom strokeColor, strokeOpacity, strokeWidthPx, and defaults', () => {
    const frame: EvaluatedTimelineFrame = {
      slideIndex: 0,
      nextSlideIndex: 0,
      progress: 0,
      isPaused: false,
      timeInSlideMs: 0,
      arrowProgressMap: {},
      zoneOpacityMap: {},
      playerOpacityMap: {},
      slide: {
        id: 'slide-1',
        index: 0,
        players: [],
        ball: {
          x: toScreenNormCoord(0.5),
          y: toScreenNormCoord(0.5),
          visible: false,
        },
        transitionDurationMs: 1000,
        pauseMs: 0,
        easing: 'ease-in-out',
        arrows: [],
        texts: [],
        zones: [
          {
            id: 'z-custom',
            annotationType: 'zone',
            zoneType: 'generic',
            shapeType: 'rect',
            color: '#ef4444',
            opacity: 0.3,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWidth: 5,
            x: toScreenNormCoord(0.1),
            y: toScreenNormCoord(0.2),
            width: 0.3,
            height: 0.4,
          },
          {
            id: 'z-default',
            annotationType: 'zone',
            zoneType: 'generic',
            shapeType: 'rect',
            color: '#f59e0b',
            opacity: 0.25,
            strokeWidth: 3,
            x: toScreenNormCoord(0.1),
            y: toScreenNormCoord(0.2),
            width: 0.3,
            height: 0.4,
          },
        ],
      },
    };

    const resolved = compileZones(frame, null, { width: 1200, height: 800 });
    expect(resolved).toHaveLength(2);

    const custom = resolved[0];
    expect(custom?.color).toBe('#ef4444');
    expect(custom?.opacity).toBe(0.3);
    expect(custom?.strokeColor).toBe('#3b82f6');
    expect(custom?.strokeOpacity).toBe(0.8);
    expect(custom?.strokeWidthPx).toBe(5);

    const defaults = resolved[1];
    expect(defaults?.color).toBe('#f59e0b');
    expect(defaults?.opacity).toBe(0.25);
    expect(defaults?.strokeColor).toBe('#f59e0b');
    expect(defaults?.strokeOpacity).toBe(1);
    expect(defaults?.strokeWidthPx).toBe(3);
  });

  it('interpolateZone preserves strokeWidth fallback of 3 and interpolates strokeColor and strokeOpacity', () => {
    const zoneA: ZoneAnnotation = {
      id: 'z-a',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      points: [],
      color: '#10b981',
      strokeColor: '#059669',
      strokeWidth: undefined as unknown as number,
      strokeOpacity: 0.2,
      opacity: 0.5,
    };
    const zoneB: ZoneAnnotation = {
      id: 'z-a',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: 30,
      y: 30,
      width: 40,
      height: 40,
      points: [],
      color: '#3b82f6',
      strokeColor: '#2563eb',
      strokeWidth: undefined as unknown as number,
      strokeOpacity: 0.8,
      opacity: 0.5,
    };

    const mid = interpolateZone(zoneA, zoneB, 0.5);
    expect(mid).not.toBeNull();
    expect(mid?.strokeWidth).toBe(3);
    expect(mid?.strokeOpacity).toBeCloseTo(0.5);
    expect(mid?.strokeColor).toBeDefined();

    const fadeMid = interpolateZone(zoneA, undefined, 0.5);
    expect(fadeMid?.strokeWidth).toBe(3);
    expect(fadeMid?.strokeOpacity).toBe(0.2);
  });

  it('四角形ゾーン (Rect) を作成・更新できる (strokeWidth/strokeColor含む)', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const zoneId = 'zone-rect-1';

    store.addZone(slideId, {
      id: zoneId,
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: 20,
      y: 30,
      width: 40,
      height: 25,
      rotation: 0,
      points: [
        { x: 20, y: 30 },
        { x: 60, y: 30 },
        { x: 60, y: 55 },
        { x: 20, y: 55 },
      ],
      color: '#22c55e',
      opacity: 0.35,
      strokeWidth: 2,
    });

    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    let zone = slide?.zones.find((z) => z.id === zoneId);
    expect(zone).toBeDefined();
    expect(zone?.shapeType).toBe('rect');
    expect(zone?.x).toBe(20);
    expect(zone?.width).toBe(40);

    // 形状・枠線色・枠線太さを更新
    store.updateZone(slideId, zoneId, {
      shapeType: 'ellipse',
      rotation: 45,
      strokeWidth: 4,
      strokeColor: '#15803d',
    });

    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    zone = slide?.zones.find((z) => z.id === zoneId);
    expect(zone?.shapeType).toBe('ellipse');
    expect(zone?.rotation).toBe(45);
    expect(zone?.strokeWidth).toBe(4);
    expect(zone?.strokeColor).toBe('#15803d');
  });

  it('フリーゾーン (Polygon) の頂点追加と完了確定ができる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const polyId = 'zone-poly-1';

    // 1点目
    store.addZone(slideId, {
      id: polyId,
      annotationType: 'zone',
      zoneType: 'danger',
      shapeType: 'polygon',
      points: [{ x: 10, y: 10 }],
      color: '#ef4444',
      opacity: 0.3,
      strokeWidth: 2,
      isComplete: false,
    });

    // 2点目・3点目を追加
    store.updateZone(slideId, polyId, {
      points: [
        { x: 10, y: 10 },
        { x: 40, y: 15 },
        { x: 30, y: 50 },
      ],
    });

    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    let polyZone = slide?.zones.find((z) => z.id === polyId);
    expect(polyZone?.points.length).toBe(3);
    expect(polyZone?.isComplete).toBe(false);

    // 確定
    store.updateZone(slideId, polyId, {
      isComplete: true,
    });

    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    polyZone = slide?.zones.find((z) => z.id === polyId);
    expect(polyZone?.isComplete).toBe(true);
    expect(polyZone?.shapeType).toBe('polygon');
  });
});
