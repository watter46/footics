import Konva from 'konva';
import { describe, expect, it } from 'vitest';
import {
  getBezierControlPoint,
  getBezierMidpoint,
} from '@/lib/tactical/engine/trajectory';
import { createCanvasNodesRegistry } from '../canvas-registry';
import {
  syncBallDragKonvaNodes,
  syncPlayerDragKonvaNodes,
  syncTrajectoryEntryKonva,
} from '../drag-konva-sync';

function createTestStage() {
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: 800, height: 500 });
  const layer = new Konva.Layer();
  stage.add(layer);
  return { stage, layer };
}

describe('drag-konva-sync', () => {
  it('case 1: toggles group/ghostGroup visibility at 4px threshold and updates straight arrow points', () => {
    const { layer } = createTestStage();
    const groupNode = new Konva.Group({ visible: true });
    const ghostGroupNode = new Konva.Group({ visible: true });
    const arrowNode = new Konva.Arrow({ points: [100, 100, 100, 100] });
    groupNode.add(arrowNode);
    layer.add(groupNode, ghostGroupNode);

    const entry = {
      groupNode,
      ghostGroupNode,
      arrowNode,
      startPx: { x: 100, y: 100 },
      startPos: { x: 10, y: 20 },
    };

    const returnedLayerShort = syncTrajectoryEntryKonva(
      entry,
      { x: 102, y: 102 },
      { width: 800, height: 500 },
    );
    expect(returnedLayerShort).toBe(layer);
    expect(groupNode.visible()).toBe(false);
    expect(ghostGroupNode.visible()).toBe(false);

    syncTrajectoryEntryKonva(
      entry,
      { x: 200, y: 150 },
      { width: 800, height: 500 },
    );
    expect(groupNode.visible()).toBe(true);
    expect(ghostGroupNode.visible()).toBe(true);
    const pts = arrowNode.points();
    expect(pts[pts.length - 2]).toBe(200);
    expect(pts[pts.length - 1]).toBe(150);
  });

  it('case 2: computes bezier points and controlHandle midpoint for arc_left trajectory', () => {
    const { layer } = createTestStage();
    const groupNode = new Konva.Group({ visible: false });
    const arrowNode = new Konva.Arrow({ points: [100, 100, 100, 100] });
    const controlHandleNode = new Konva.Circle({ x: 100, y: 100, radius: 5 });
    groupNode.add(arrowNode, controlHandleNode);
    layer.add(groupNode);

    const startPx = { x: 100, y: 100 };
    const endPx = { x: 300, y: 100 };
    const trajectory = { type: 'arc_left' as const };

    syncTrajectoryEntryKonva(
      {
        groupNode,
        arrowNode,
        controlHandleNode,
        startPx,
        startPos: { x: 10, y: 20 },
        trajectory,
      },
      endPx,
      { width: 800, height: 500 },
    );

    const pts = arrowNode.points();
    expect(pts.length).toBeGreaterThan(4);
    expect(pts[pts.length - 2]).toBeCloseTo(endPx.x);
    expect(pts[pts.length - 1]).toBeCloseTo(endPx.y);

    const expectedCp = getBezierControlPoint(startPx, endPx, trajectory);
    const expectedMid = getBezierMidpoint(startPx, endPx, expectedCp);
    expect(controlHandleNode.position().x).toBeCloseTo(expectedMid.x);
    expect(controlHandleNode.position().y).toBeCloseTo(expectedMid.y);
  });

  it('case 3: syncs connectLineNodes and tracking arrowNodes with sourcePlayerRadius offset', () => {
    const { layer } = createTestStage();
    const registry = createCanvasNodesRegistry();

    const p1Node = new Konva.Group({ x: 100, y: 100 });
    const p2Node = new Konva.Group({ x: 300, y: 100 });
    const coreLine = new Konva.Line({ points: [100, 100, 300, 100] });
    const arrowNode = new Konva.Arrow({ points: [120, 100, 300, 200] });
    layer.add(p1Node, p2Node, coreLine, arrowNode);

    registry.playerNodes.set('p1', p1Node);
    registry.playerNodes.set('p2', p2Node);
    registry.connectLineNodes.set('cl-1', {
      coreNode: coreLine,
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
    });
    registry.arrowNodes.set('arr-1', {
      node: arrowNode,
      sourcePlayerId: 'p1',
      startPx: { x: 100, y: 100 },
      endPx: { x: 300, y: 200 },
      sourceRadiusPx: 20,
    });

    const movedPlayers = new Map([['p1', { xPx: 100, yPx: 200 }]]);
    syncPlayerDragKonvaNodes({
      registry,
      movedPlayers,
      primaryPlayerId: 'p1',
      stageSize: { width: 800, height: 500 },
    });

    expect(coreLine.points()).toEqual([100, 200, 300, 100]);
    expect(arrowNode.points()).toEqual([120, 200, 300, 200]);
  });

  it('case 4: moves secondary selected playerNodes while skipping primaryPlayerId, and syncs ball trajectory', () => {
    const { layer } = createTestStage();
    const registry = createCanvasNodesRegistry();

    const p1Node = new Konva.Group({ x: 100, y: 100 });
    const p2Node = new Konva.Group({ x: 200, y: 200 });
    layer.add(p1Node, p2Node);
    registry.playerNodes.set('p1', p1Node);
    registry.playerNodes.set('p2', p2Node);

    const movedPlayers = new Map([
      ['p1', { xPx: 150, yPx: 150 }],
      ['p2', { xPx: 250, yPx: 250 }],
    ]);

    syncPlayerDragKonvaNodes({
      registry,
      movedPlayers,
      primaryPlayerId: 'p1',
      stageSize: { width: 800, height: 500 },
    });

    expect(p1Node.position()).toEqual({ x: 100, y: 100 });
    expect(p2Node.position()).toEqual({ x: 250, y: 250 });

    const ballGroup = new Konva.Group({ visible: false });
    const ballArrow = new Konva.Arrow({ points: [50, 50, 50, 50] });
    ballGroup.add(ballArrow);
    layer.add(ballGroup);
    registry.trajectoryArrowNodes.set('ball', {
      groupNode: ballGroup,
      arrowNode: ballArrow,
      startPx: { x: 50, y: 50 },
      startPos: { x: 5, y: 10 },
    });

    syncBallDragKonvaNodes({
      registry,
      ballPx: { x: 90, y: 80 },
      stageSize: { width: 800, height: 500 },
    });

    expect(ballGroup.visible()).toBe(true);
    expect(ballArrow.points()).toEqual([50, 50, 90, 80]);
  });

  it('case 5: syncs trajectoryEffectLines for ball and player on straight and arc_left trajectories with 4px threshold', () => {
    const { layer } = createTestStage();
    const registry = createCanvasNodesRegistry();

    const ballLine = new Konva.Line({
      points: [50, 50, 50, 50],
      visible: true,
    });
    const p1Line = new Konva.Line({
      points: [100, 100, 100, 100],
      visible: false,
    });
    layer.add(ballLine, p1Line);

    registry.trajectoryEffectLines.set('ball', {
      lineNode: ballLine,
      startPx: { x: 50, y: 50 },
    });
    registry.trajectoryEffectLines.set('p1', {
      lineNode: p1Line,
      startPx: { x: 100, y: 100 },
      trajectory: { type: 'arc_left' },
    });

    // 4px 未満は非表示
    syncBallDragKonvaNodes({
      registry,
      ballPx: { x: 52, y: 52 },
      stageSize: { width: 800, height: 500 },
    });
    expect(ballLine.visible()).toBe(false);

    // 4px 以上（直線）
    syncBallDragKonvaNodes({
      registry,
      ballPx: { x: 120, y: 90 },
      stageSize: { width: 800, height: 500 },
    });
    expect(ballLine.visible()).toBe(true);
    expect(ballLine.points()).toEqual([50, 50, 120, 90]);

    // 選手 arc_left 曲線
    syncPlayerDragKonvaNodes({
      registry,
      movedPlayers: new Map([['p1', { xPx: 300, yPx: 100 }]]),
      primaryPlayerId: 'p1',
      stageSize: { width: 800, height: 500 },
    });
    expect(p1Line.visible()).toBe(true);
    const p1Pts = p1Line.points();
    expect(p1Pts.length).toBeGreaterThan(4);
    expect(p1Pts[0]).toBeCloseTo(100);
    expect(p1Pts[1]).toBeCloseTo(100);
    expect(p1Pts[p1Pts.length - 2]).toBeCloseTo(300);
    expect(p1Pts[p1Pts.length - 1]).toBeCloseTo(100);
  });
});
