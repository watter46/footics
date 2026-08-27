import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

describe('tactical-unified Zone Features', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.setState((state) => ({
      ...state,
      selectedObjects: [],
      activeTool: 'select',
    }));
  });

  it('四角形ゾーン (Rect) を作成・更新できる', () => {
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

    // 形状を楕円 (Ellipse) に変更し、回転角を更新
    store.updateZone(slideId, zoneId, {
      shapeType: 'ellipse',
      rotation: 45,
    });

    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    zone = slide?.zones.find((z) => z.id === zoneId);
    expect(zone?.shapeType).toBe('ellipse');
    expect(zone?.rotation).toBe(45);
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
