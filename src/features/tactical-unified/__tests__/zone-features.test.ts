import { beforeEach, describe, expect, it } from 'vitest';
import { getZoneStyle } from '@/features/tactical-unified/core/components/zones/zone-geometry';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { interpolateZone } from '@/lib/tactical/interpolation-annotation';
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

  it('ZoneAnnotationSchema parses with strokeWidth default 2', () => {
    const parsed = ZoneAnnotationSchema.parse({
      id: 'z-test-default',
      annotationType: 'zone',
      zoneType: 'generic',
    });
    expect(parsed.strokeWidth).toBe(2);
  });

  it('getZoneStyle reflects strokeColor and strokeWidth with default 2', () => {
    const customZone: ZoneAnnotation = {
      id: 'z-custom',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      color: '#ef4444',
      opacity: 0.3,
      strokeColor: '#3b82f6',
      strokeWidth: 5,
      points: [],
    };
    const customStyle = getZoneStyle(customZone);
    expect(customStyle.strokeColor).toBe('#3b82f6');
    expect(customStyle.strokeWidth).toBe(5);

    const defaultZone: ZoneAnnotation = {
      id: 'z-default',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      color: '#f59e0b',
      opacity: 0.25,
      points: [],
      strokeWidth: undefined as unknown as number,
    };
    const defaultStyle = getZoneStyle(defaultZone);
    expect(defaultStyle.strokeColor).toBe('#f59e0b');
    expect(defaultStyle.strokeWidth).toBe(2);
  });

  it('interpolateZone preserves strokeWidth fallback of 2 and interpolates strokeColor', () => {
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
      opacity: 0.5,
    };

    const mid = interpolateZone(zoneA, zoneB, 0.5);
    expect(mid).not.toBeNull();
    expect(mid?.strokeWidth).toBe(2);
    expect(mid?.strokeColor).toBeDefined();

    const fadeMid = interpolateZone(zoneA, undefined, 0.5);
    expect(fadeMid?.strokeWidth).toBe(2);
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
