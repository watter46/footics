import Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import type { ResolvedSceneGraphDTO } from '@/lib/tactical/compiler/scene-graph-dto';
import type { StagePixel, StagePixelPoint } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import { createCanvasNodesRegistry } from '../canvas-registry';
import { syncSceneGraphToKonva } from '../playback-konva-sync';

const px = (n: number) => n as StagePixel;
const pt = (x: number, y: number): StagePixelPoint => ({
  x: px(x),
  y: px(y),
});

function createBaseSceneGraph(
  overrides: Partial<ResolvedSceneGraphDTO> = {},
): ResolvedSceneGraphDTO {
  return {
    viewport: {
      width: 1000,
      height: 600,
    },
    zones: [],
    connectLines: [],
    trajectories: [],
    arrows: [],
    billboardItems: [],
    ...overrides,
  };
}

describe('syncSceneGraphToKonva', () => {
  it('case 1: updates playerNodes, ballNode, textNodes position/opacity/visible and calls layer.batchDraw() once per dirty layer', () => {
    const container = document.createElement('div');
    const stage = new Konva.Stage({ container, width: 1000, height: 600 });
    const playerLayer = new Konva.Layer();
    const ballLayer = new Konva.Layer();
    const unusedLayer = new Konva.Layer();
    stage.add(playerLayer, ballLayer, unusedLayer);

    const playerNode = new Konva.Group({ x: 0, y: 0 });
    const textNode = new Konva.Text({ x: 0, y: 0, text: 'Press' });
    const ballNode = new Konva.Group({ x: 0, y: 0 });

    playerLayer.add(playerNode, textNode);
    ballLayer.add(ballNode);

    const playerBatchDrawSpy = vi.spyOn(playerLayer, 'batchDraw');
    const ballBatchDrawSpy = vi.spyOn(ballLayer, 'batchDraw');
    const unusedBatchDrawSpy = vi.spyOn(unusedLayer, 'batchDraw');

    const registry = createCanvasNodesRegistry();
    registry.stage = stage;
    registry.playerLayer = playerLayer;
    registry.ballLayer = ballLayer;
    registry.playerNodes.set('p1', playerNode);
    registry.textNodes.set('t1', textNode);
    registry.ballNode = ballNode;

    const sceneGraph = createBaseSceneGraph({
      billboardItems: [
        {
          kind: 'player',
          id: 'p1',
          positionPx: pt(120, 240),
          radiusPx: 18,
          depthSortKey: 240,
          opacity: 0.75,
          visible: true,
          selected: false,
          player: { id: 'p1' } as PitchPlayer,
          rippleRingsPx: [],
        },
        {
          kind: 'ball',
          positionPx: pt(500, 300),
          radiusPx: 10,
          depthSortKey: 300,
          opacity: 0.9,
          visible: false,
        },
        {
          kind: 'text',
          id: 't1',
          positionPx: pt(310, 150),
          depthSortKey: 150,
          content: 'Press',
          fontSizePx: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
          opacity: 0.5,
          visible: true,
          selected: false,
        },
      ],
    });

    syncSceneGraphToKonva(registry, sceneGraph);

    expect(playerNode.position()).toEqual({ x: 120, y: 240 });
    expect(playerNode.opacity()).toBe(0.75);
    expect(playerNode.visible()).toBe(true);

    expect(ballNode.position()).toEqual({ x: 500, y: 300 });
    expect(ballNode.opacity()).toBe(0.9);
    expect(ballNode.visible()).toBe(false);

    expect(textNode.position()).toEqual({ x: 310, y: 150 });
    expect(textNode.opacity()).toBe(0.5);
    expect(textNode.visible()).toBe(true);

    expect(playerBatchDrawSpy).toHaveBeenCalled();
    expect(ballBatchDrawSpy).toHaveBeenCalled();
    expect(unusedBatchDrawSpy).not.toHaveBeenCalled();

    stage.destroy();
  });

  it('case 2: updates arrowNodes, connectLineNodes, zoneNodes (rect and polygon) and ignores missing IDs', () => {
    const container = document.createElement('div');
    const stage = new Konva.Stage({ container, width: 1000, height: 600 });
    const annotationLayer = new Konva.Layer();
    stage.add(annotationLayer);

    const arrowNode = new Konva.Arrow({ points: [0, 0, 10, 10] });
    const startDotNode = new Konva.Circle({ x: 0, y: 0, radius: 4 });
    const endDotNode = new Konva.Circle({ x: 0, y: 0, radius: 4 });

    const glowNode = new Konva.Line({ points: [0, 0, 0, 0] });
    const highlightNode = new Konva.Line({ points: [0, 0, 0, 0] });
    const coreNode = new Konva.Line({ points: [0, 0, 0, 0] });

    const rectZoneNode = new Konva.Rect({ x: 0, y: 0, width: 100, height: 80 });
    const polygonZoneNode = new Konva.Line({ points: [0, 0, 10, 10, 20, 0] });

    annotationLayer.add(
      arrowNode,
      startDotNode,
      endDotNode,
      glowNode,
      highlightNode,
      coreNode,
      rectZoneNode,
      polygonZoneNode,
    );

    const batchDrawSpy = vi.spyOn(annotationLayer, 'batchDraw');

    const registry = createCanvasNodesRegistry();
    registry.stage = stage;
    registry.annotationLayer = annotationLayer;
    registry.arrowNodes.set('a1', {
      node: arrowNode,
      startDotNode,
      endDotNode,
    });
    registry.connectLineNodes.set('cl1', {
      glowNode,
      highlightNode,
      coreNode,
    });
    registry.zoneNodes.set('z-rect', rectZoneNode);
    registry.zoneNodes.set('z-poly', polygonZoneNode);

    const sceneGraph = createBaseSceneGraph({
      arrows: [
        {
          id: 'a1',
          flatPointsPx: [10, 20, 110, 120],
          startPointPx: pt(10, 20),
          endPointPx: pt(110, 120),
          startMarkerPointPx: pt(12, 22),
          endMarkerPointPx: pt(108, 118),
          color: '#ff0000',
          strokeWidthPx: 2,
          dashArrayPx: [],
          dashOffsetPx: 0,
          opacity: 0.8,
          visible: true,
          startMarker: 'dot',
          endMarker: 'dot',
          pointerLengthPx: 10,
          pointerWidthPx: 10,
          dotRadiusPx: 4,
          endAngleRad: 0,
          selected: false,
        },
        {
          id: 'missing-arrow',
          flatPointsPx: [0, 0, 1, 1],
          startPointPx: pt(0, 0),
          endPointPx: pt(1, 1),
          color: '#000',
          strokeWidthPx: 2,
          dashArrayPx: [],
          dashOffsetPx: 0,
          opacity: 1,
          visible: true,
          startMarker: 'none',
          endMarker: 'arrow',
          pointerLengthPx: 10,
          pointerWidthPx: 10,
          dotRadiusPx: 4,
          endAngleRad: 0,
          selected: false,
        },
      ],
      connectLines: [
        {
          id: 'cl1',
          fromPlayerId: 'p1',
          toPlayerId: 'p2',
          flatPointsPx: [50, 60, 150, 160],
          color: '#00ff00',
          strokeWidthPx: 2,
          dashArrayPx: [],
          visible: false,
        },
        {
          id: 'missing-cl',
          fromPlayerId: 'p3',
          toPlayerId: 'p4',
          flatPointsPx: [0, 0, 10, 10],
          color: '#00ff00',
          strokeWidthPx: 2,
          dashArrayPx: [],
          visible: true,
        },
      ],
      zones: [
        {
          id: 'z-rect',
          shapeType: 'rect',
          xPx: px(40),
          yPx: px(80),
          widthPx: 100,
          heightPx: 80,
          color: '#0000ff',
          opacity: 0.3,
          strokeColor: '#0000ff',
          strokeOpacity: 1,
          strokeWidthPx: 2,
          visible: true,
          selected: false,
        },
        {
          id: 'z-poly',
          shapeType: 'polygon',
          flatPointsPx: [10, 10, 50, 10, 30, 60],
          color: '#0000ff',
          opacity: 0.6,
          strokeColor: '#0000ff',
          strokeOpacity: 1,
          strokeWidthPx: 2,
          visible: false,
          selected: false,
        },
        {
          id: 'missing-zone',
          shapeType: 'ellipse',
          xPx: px(0),
          yPx: px(0),
          color: '#000',
          opacity: 1,
          strokeColor: '#000',
          strokeOpacity: 1,
          strokeWidthPx: 1,
          visible: true,
          selected: false,
        },
      ],
    });

    expect(() => syncSceneGraphToKonva(registry, sceneGraph)).not.toThrow();

    expect(arrowNode.points()).toEqual([10, 20, 110, 120]);
    expect(arrowNode.opacity()).toBe(0.8);
    expect(arrowNode.visible()).toBe(true);
    expect(startDotNode.position()).toEqual({ x: 12, y: 22 });
    expect(startDotNode.visible()).toBe(true);
    expect(endDotNode.position()).toEqual({ x: 108, y: 118 });
    expect(endDotNode.visible()).toBe(true);

    expect(glowNode.points()).toEqual([50, 60, 150, 160]);
    expect(glowNode.visible()).toBe(false);
    expect(highlightNode.points()).toEqual([50, 60, 150, 160]);
    expect(highlightNode.visible()).toBe(false);
    expect(coreNode.points()).toEqual([50, 60, 150, 160]);
    expect(coreNode.visible()).toBe(false);

    expect(rectZoneNode.position()).toEqual({ x: 40, y: 80 });
    expect(rectZoneNode.opacity()).toBe(0.3);
    expect(rectZoneNode.visible()).toBe(true);

    expect(polygonZoneNode.points()).toEqual([10, 10, 50, 10, 30, 60]);
    expect(polygonZoneNode.opacity()).toBe(0.6);
    expect(polygonZoneNode.visible()).toBe(false);

    expect(batchDrawSpy).toHaveBeenCalled();

    stage.destroy();
  });
});
