import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileZones } from '@/lib/tactical/compiler/compile-zones';
import { interpolateZones } from '@/lib/tactical/engine/slide-entity-interpolators';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

type DomainZoneAnnotation = DomainSlide['zones'][number];

import {
  DomainZoneAnnotationSchema,
  RectZoneSchema,
} from '@/lib/types/tactical/domain-entities';

describe('tactical-unified Zone Features', () => {
  let docStore: DocumentStore;
  let phaseId: string;
  let slideId: string;

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    docStore = createDocumentStore(project);
    phaseId = project.phases[0]?.id ?? '';
    slideId = project.phases[0]?.slides[0]?.id ?? '';
  });

  it('DomainZoneAnnotationSchema parses with strokeWidth default 3 and strokeOpacity default 1', () => {
    const parsed = DomainZoneAnnotationSchema.parse({
      id: 'z-test-default',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    });
    expect(parsed.strokeWidth).toBe(3);
    expect(parsed.strokeOpacity).toBe(1);

    const custom = RectZoneSchema.parse({
      id: 'z-test-custom',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
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
      easedProgress: 0,
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

  it('interpolateZones interpolates rect geometry, opacity, strokeWidth and fades out missing zones', () => {
    const zoneA: DomainZoneAnnotation = {
      id: 'z-a',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: toScreenNormCoord(10),
      y: toScreenNormCoord(10),
      width: 20,
      height: 20,
      color: '#10b981',
      strokeColor: '#059669',
      strokeWidth: 2,
      strokeOpacity: 0.2,
      opacity: 0.5,
    };
    const zoneB: DomainZoneAnnotation = {
      id: 'z-a',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'rect',
      x: toScreenNormCoord(30),
      y: toScreenNormCoord(30),
      width: 40,
      height: 40,
      color: '#3b82f6',
      strokeColor: '#2563eb',
      strokeWidth: 4,
      strokeOpacity: 0.8,
      opacity: 0.5,
    };

    const { interpolatedZones, zoneOpacityMap } = interpolateZones(
      [zoneA],
      [zoneB],
      0.5,
    );
    expect(interpolatedZones).toHaveLength(1);
    const mid = interpolatedZones[0];
    expect(mid?.shapeType).toBe('rect');
    if (mid?.shapeType === 'rect') {
      expect(mid.x).toBeCloseTo(20);
      expect(mid.width).toBeCloseTo(30);
    }
    expect(mid?.strokeWidth).toBeCloseTo(3);
    expect(zoneOpacityMap['z-a']?.visible).toBe(true);

    const fadeOut = interpolateZones([zoneA], [], 0.5);
    expect(fadeOut.interpolatedZones).toHaveLength(1);
    expect(fadeOut.zoneOpacityMap['z-a']?.opacity).toBeCloseTo(0.25);
    expect(fadeOut.zoneOpacityMap['z-a']?.visible).toBe(true);
  });

  it('四角形ゾーン (Rect) を作成・更新できる (strokeWidth/strokeColor含む)', () => {
    const zoneId = 'zone-rect-1';

    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'ADD_ZONE',
      zone: {
        id: zoneId,
        annotationType: 'zone',
        zoneType: 'generic',
        shapeType: 'rect',
        x: toScreenNormCoord(20),
        y: toScreenNormCoord(30),
        width: 40,
        height: 25,
        rotation: 0,
        color: '#22c55e',
        opacity: 0.35,
        strokeWidth: 2,
      },
    });

    let slide = docStore
      .getState()
      .project.phases.find((p) => p.id === phaseId)
      ?.slides.find((s) => s.id === slideId);
    let zone = slide?.zones.find((z) => z.id === zoneId);
    expect(zone).toBeDefined();
    expect(zone?.shapeType).toBe('rect');
    if (zone?.shapeType === 'rect') {
      expect(zone.x).toBe(20);
      expect(zone.width).toBe(40);
    }

    // 形状・枠線色・枠線太さを更新
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_ZONE',
      id: zoneId,
      patch: {
        shapeType: 'ellipse',
        rotation: 45,
        strokeWidth: 4,
        strokeColor: '#15803d',
      },
    });

    slide = docStore
      .getState()
      .project.phases.find((p) => p.id === phaseId)
      ?.slides.find((s) => s.id === slideId);
    zone = slide?.zones.find((z) => z.id === zoneId);
    expect(zone?.shapeType).toBe('ellipse');
    if (zone?.shapeType === 'ellipse') {
      expect(zone.rotation).toBe(45);
    }
    expect(zone?.strokeWidth).toBe(4);
    expect(zone?.strokeColor).toBe('#15803d');
  });

  it('フリーゾーン (Polygon) の頂点追加と更新ができる', () => {
    const polyId = 'zone-poly-1';

    // 1点目
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'ADD_ZONE',
      zone: {
        id: polyId,
        annotationType: 'zone',
        zoneType: 'danger',
        shapeType: 'polygon',
        points: [toScreenNormPoint(10, 10)],
        color: '#ef4444',
        opacity: 0.3,
        strokeWidth: 2,
      },
    });

    // 2点目・3点目を追加
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_ZONE',
      id: polyId,
      patch: {
        points: [
          toScreenNormPoint(10, 10),
          toScreenNormPoint(40, 15),
          toScreenNormPoint(30, 50),
        ],
      },
    });

    const slide = docStore
      .getState()
      .project.phases.find((p) => p.id === phaseId)
      ?.slides.find((s) => s.id === slideId);
    const polyZone = slide?.zones.find((z) => z.id === polyId);
    expect(polyZone?.shapeType).toBe('polygon');
    if (polyZone?.shapeType === 'polygon') {
      expect(polyZone.points.length).toBe(3);
    }
  });
});
