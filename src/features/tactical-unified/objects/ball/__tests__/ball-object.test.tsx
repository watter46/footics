import { render } from '@testing-library/react';
import Konva from 'konva';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it } from 'vitest';
import { createCanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ResolvedBillboardBallItem } from '@/lib/tactical/compiler/scene-graph-dto';
import {
  clampToScreenNorm,
  type StagePixel,
} from '@/lib/types/tactical/branded';
import type { DomainBallState } from '@/lib/types/tactical/domain-entities';
import { BallObject } from '../components/ball-object';
import type { BallObjectProps } from '../types';

const STAGE_SIZE = { width: 800, height: 1000 };

function createTestBall(overrides?: Partial<DomainBallState>): DomainBallState {
  return {
    x: clampToScreenNorm(50),
    y: clampToScreenNorm(50),
    visible: true,
    ...overrides,
  };
}

function createResolvedBall(
  overrides?: Partial<ResolvedBillboardBallItem>,
): ResolvedBillboardBallItem {
  return {
    kind: 'ball',
    visible: true,
    positionPx: { x: 400 as StagePixel, y: 500 as StagePixel },
    radiusPx: 14,
    depthSortKey: 0,
    opacity: 1,
    ...overrides,
  };
}

function createNodesRegistry(): NonNullable<
  BallObjectProps['nodesRegistryRef']
> {
  return {
    current: {
      ballNode: null,
    } as unknown as NonNullable<BallObjectProps['nodesRegistryRef']>['current'],
  };
}

describe('BallObject 3-frequency store integration', () => {
  it('does not render Konva Group when resolvedBall.visible is false', () => {
    const project = createDefaultTacticalProject();
    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({
      activePhaseId: project.phases[0].id,
      activeSlideId: project.phases[0].slides[0].id,
    });
    const registryRef = { current: createCanvasNodesRegistry() };

    render(
      <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
        <Stage width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
          <Layer>
            <BallObject
              ball={createTestBall({ visible: false })}
              resolvedBall={createResolvedBall({ visible: false })}
              stageSize={STAGE_SIZE}
              nodesRegistryRef={registryRef}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    expect(registryRef.current.ballNode).toBeNull();
  });

  it('selects ball in sessionStore on click', () => {
    const project = createDefaultTacticalProject();
    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({
      activePhaseId: project.phases[0].id,
      activeSlideId: project.phases[0].slides[0].id,
    });
    const registryRef = { current: createCanvasNodesRegistry() };

    render(
      <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
        <Stage width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
          <Layer>
            <BallObject
              ball={createTestBall()}
              resolvedBall={createResolvedBall()}
              stageSize={STAGE_SIZE}
              nodesRegistryRef={registryRef}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const ballNode = registryRef.current.ballNode as Konva.Group;
    expect(ballNode).not.toBeNull();

    ballNode.fire('click', { evt: { shiftKey: false }, cancelBubble: false });

    expect(sessionStore.getState().selectedObjects).toEqual([
      { id: 'ball', kind: 'ball' },
    ]);
  });

  it('syncs ghost trajectory Konva nodes during dragmove without updating documentStore.past', () => {
    const project = createDefaultTacticalProject();
    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({
      activePhaseId: project.phases[0].id,
      activeSlideId: project.phases[0].slides[0].id,
    });
    const registryRef = { current: createCanvasNodesRegistry() };
    const ghostGroup = new Konva.Group({ visible: false });
    const ghostArrow = new Konva.Arrow({ points: [400, 500, 400, 500] });
    registryRef.current.trajectoryArrowNodes.set('ball', {
      groupNode: ghostGroup,
      arrowNode: ghostArrow,
      startPx: { x: 400, y: 500 },
      startPos: { x: 50, y: 50 },
    });

    render(
      <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
        <Stage width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
          <Layer>
            <BallObject
              ball={createTestBall()}
              resolvedBall={createResolvedBall()}
              stageSize={STAGE_SIZE}
              nodesRegistryRef={registryRef}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const ballNode = registryRef.current.ballNode as Konva.Group;
    ballNode.fire('dragstart', {});
    ballNode.position({ x: 480, y: 600 });
    ballNode.fire('dragmove', {});

    expect(documentStore.getState().past).toHaveLength(0);
    expect(ghostGroup.visible()).toBe(true);
    const pts = ghostArrow.points();
    expect(pts[pts.length - 2]).toBeCloseTo(480, 0);
    expect(pts[pts.length - 1]).toBeCloseTo(600, 0);
  });

  it('updates documentStore ball coordinates with past.length === 1 on dragend', () => {
    const project = createDefaultTacticalProject();
    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({
      activePhaseId: project.phases[0].id,
      activeSlideId: project.phases[0].slides[0].id,
    });
    const registryRef = { current: createCanvasNodesRegistry() };

    render(
      <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
        <Stage width={STAGE_SIZE.width} height={STAGE_SIZE.height}>
          <Layer>
            <BallObject
              ball={createTestBall()}
              resolvedBall={createResolvedBall()}
              stageSize={STAGE_SIZE}
              nodesRegistryRef={registryRef}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const ballNode = registryRef.current.ballNode as Konva.Group;
    ballNode.fire('dragstart', {});
    ballNode.position({ x: 560, y: 700 });
    ballNode.fire('dragend', {});

    expect(documentStore.getState().past).toHaveLength(1);
    const updatedBall =
      documentStore.getState().project.phases[0].slides[0].ball;
    expect(updatedBall.x).toBeCloseTo(70, 5);
    expect(updatedBall.y).toBeCloseTo(70, 5);
  });
});
