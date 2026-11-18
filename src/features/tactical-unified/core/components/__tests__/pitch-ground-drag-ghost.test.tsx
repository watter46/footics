// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import type Konva from 'konva';
import { Stage } from 'react-konva';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import { evaluateTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toMilliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import {
  type CanvasNodesRegistry,
  createCanvasNodesRegistry,
} from '../../utils/canvas-registry';
import { syncPlayerDragKonvaNodes } from '../../utils/drag-konva-sync';
import { PitchGroundLayer } from '../PitchGroundLayer';

function createTwoSlideProjectWithPlayer(
  playerId: string,
  x: number,
  y: number,
) {
  const project = createDefaultTacticalProject();
  const phase = project.phases[0];
  const slide1 = phase.slides[0];
  const baseStyle = slide1.players[0]?.style ?? {
    markerType: 'circle' as const,
    insideContent: 'number' as const,
    bottomLabel: 'number' as const,
    color: '#ef4444',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    sizeScale: 1,
    photoScale: 1,
    photoOffsetX: 0,
    photoOffsetY: 0,
  };
  const player1: DomainPlayer = {
    id: playerId,
    area: 'pitch',
    team: 'home',
    shirtNo: '10',
    name: 'Test Player',
    x: toScreenNormCoord(x),
    y: toScreenNormCoord(y),
    style: baseStyle,
    connectLines: [],
    badges: [],
  };
  const slide2 = {
    ...slide1,
    id: 'slide-2',
    players: [{ ...player1 }],
  };
  return {
    ...project,
    phases: [
      {
        ...phase,
        slides: [{ ...slide1, players: [player1] }, slide2],
      },
    ],
  };
}

describe('PitchGroundLayer drag ghost trajectory', () => {
  const stageSize = { width: 1000, height: 600 };
  const pitchRect = { x: 0, y: 0, width: 1000, height: 600 };
  const viewport: StageViewport = {
    width: stageSize.width,
    height: stageSize.height,
  };

  it('case 1: pre-mounts ghost-trajectory-<id> for selected player at same position with groupNode.visible() === false', () => {
    const project = createTwoSlideProjectWithPlayer('p-1', 50, 50);
    const phase = project.phases[0];
    const slide1 = phase.slides[0];
    const slide2 = phase.slides[1];
    const stageRef: { current: Konva.Stage | null } = { current: null };
    const nodesRegistryRef: { current: CanvasNodesRegistry } = {
      current: createCanvasNodesRegistry(),
    };

    const frame = evaluateTimelineFrame(phase, toMilliseconds(2000));
    const sceneGraph = compileSceneGraph(
      frame,
      {
        activePhaseId: phase.id,
        activeSlideId: slide2.id,
        selectedIds: ['p-1'],
      },
      viewport,
      slide1,
    );

    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({
      activePhaseId: phase.id,
      activeSlideId: slide2.id,
    });
    sessionStore.getState().selectObject({ kind: 'player', id: 'p-1' });

    act(() => {
      render(
        <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={(node) => {
              stageRef.current = node;
            }}
          >
            <PitchGroundLayer
              stageSize={stageSize}
              pitchRect={pitchRect}
              sceneGraph={sceneGraph}
              nodesRegistryRef={nodesRegistryRef}
            />
          </Stage>
        </TacticalStoreProvider>,
      );
    });

    expect(stageRef.current).not.toBeNull();
    const ghostGroup = stageRef.current?.findOne<Konva.Group>(
      '#ghost-trajectory-p-1',
    );
    expect(ghostGroup).toBeDefined();

    const entry = nodesRegistryRef.current.trajectoryArrowNodes.get('p-1');
    expect(entry).toBeDefined();
    expect(entry?.groupNode?.visible()).toBe(false);
  });

  it('case 2: syncPlayerDragKonvaNodes shows ghost-trajectory-<id> and updates arrowNode.points() when distance >= 4px', () => {
    const project = createTwoSlideProjectWithPlayer('p-1', 50, 50);
    const phase = project.phases[0];
    const slide1 = phase.slides[0];
    const slide2 = phase.slides[1];
    const stageRef: { current: Konva.Stage | null } = { current: null };
    const nodesRegistryRef: { current: CanvasNodesRegistry } = {
      current: createCanvasNodesRegistry(),
    };

    const frame = evaluateTimelineFrame(phase, toMilliseconds(2000));
    const sceneGraph = compileSceneGraph(
      frame,
      {
        activePhaseId: phase.id,
        activeSlideId: slide2.id,
        selectedIds: ['p-1'],
      },
      viewport,
      slide1,
    );

    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({
      activePhaseId: phase.id,
      activeSlideId: slide2.id,
    });
    sessionStore.getState().selectObject({ kind: 'player', id: 'p-1' });

    act(() => {
      render(
        <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={(node) => {
              stageRef.current = node;
            }}
          >
            <PitchGroundLayer
              stageSize={stageSize}
              pitchRect={pitchRect}
              sceneGraph={sceneGraph}
              nodesRegistryRef={nodesRegistryRef}
            />
          </Stage>
        </TacticalStoreProvider>,
      );
    });

    const entry = nodesRegistryRef.current.trajectoryArrowNodes.get('p-1');
    expect(entry).toBeDefined();
    expect(entry?.groupNode?.visible()).toBe(false);

    syncPlayerDragKonvaNodes({
      registry: nodesRegistryRef.current,
      movedPlayers: new Map([['p-1', { xPx: 650, yPx: 300 }]]),
      primaryPlayerId: 'p-1',
      stageSize,
    });

    expect(entry?.groupNode?.visible()).toBe(true);
    const pts = entry?.arrowNode?.points() ?? [];
    expect(pts.length).toBeGreaterThanOrEqual(4);
    expect(pts[pts.length - 2]).toBeCloseTo(650, 0);
    expect(pts[pts.length - 1]).toBeCloseTo(300, 0);
  });
});
