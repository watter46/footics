// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import type Konva from 'konva';
import { useEffect } from 'react';
import { Stage } from 'react-konva';
import { describe, expect, it } from 'vitest';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import type { EphemeralDragDelta } from '@/lib/tactical/compiler/scene-graph-dto';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import { evaluateTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toMilliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
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

function DragDeltaSetter({ delta }: { delta: EphemeralDragDelta | null }) {
  const setActiveDragDelta = useSessionStore((s) => s.setActiveDragDelta);
  useEffect(() => {
    setActiveDragDelta(delta);
  }, [delta, setActiveDragDelta]);
  return null;
}

describe('PitchGroundLayer drag ghost trajectory', () => {
  const stageSize = { width: 1000, height: 600 };
  const pitchRect = { x: 0, y: 0, width: 1000, height: 600 };
  const viewport: StageViewport = {
    width: stageSize.width,
    height: stageSize.height,
  };

  it('case 1: renders ghost-trajectory-<id> during drag when effective distance >= 1.0 even before drop', () => {
    const project = createTwoSlideProjectWithPlayer('p-1', 50, 50);
    const phase = project.phases[0];
    const slide1 = phase.slides[0];
    const slide2 = phase.slides[1];
    const stageRef: { current: Konva.Stage | null } = { current: null };

    const activeDragDelta: EphemeralDragDelta = {
      entityIds: ['p-1'],
      deltaScreenNormX: 15,
      deltaScreenNormY: 0,
    };

    const frame = evaluateTimelineFrame(phase, toMilliseconds(2000));
    const sceneGraph = compileSceneGraph(
      frame,
      {
        activePhaseId: phase.id,
        activeSlideId: slide2.id,
        selectedIds: [],
        activeDragDelta,
      },
      viewport,
      slide1,
    );

    act(() => {
      render(
        <TacticalStoreProvider
          initialProject={project}
          initialSession={{
            activePhaseId: phase.id,
            activeSlideId: slide2.id,
          }}
        >
          <DragDeltaSetter delta={activeDragDelta} />
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

    // 矢印の終点が (65, 50) 相当 (x = 650, y = 300) であることを確認
    const lines = ghostGroup?.find<Konva.Line>('Line, Arrow') ?? [];
    const arrowLine = lines.find((line) => (line.points()?.length ?? 0) >= 4);
    expect(arrowLine).toBeDefined();
    const pts = arrowLine?.points() ?? [];
    const endX = pts[pts.length - 2];
    const endY = pts[pts.length - 1];
    expect(endX).toBeCloseTo(650, 0);
    expect(endY).toBeCloseTo(300, 0);
  });

  it('case 2: does not render ghost-trajectory-<id> when drag distance < 1.0', () => {
    const project = createTwoSlideProjectWithPlayer('p-1', 50, 50);
    const phase = project.phases[0];
    const slide1 = phase.slides[0];
    const slide2 = phase.slides[1];
    const stageRef: { current: Konva.Stage | null } = { current: null };

    const activeDragDelta: EphemeralDragDelta = {
      entityIds: ['p-1'],
      deltaScreenNormX: 0.5,
      deltaScreenNormY: 0,
    };

    const frame = evaluateTimelineFrame(phase, toMilliseconds(2000));
    const sceneGraph = compileSceneGraph(
      frame,
      {
        activePhaseId: phase.id,
        activeSlideId: slide2.id,
        selectedIds: [],
        activeDragDelta,
      },
      viewport,
      slide1,
    );

    act(() => {
      render(
        <TacticalStoreProvider
          initialProject={project}
          initialSession={{
            activePhaseId: phase.id,
            activeSlideId: slide2.id,
          }}
        >
          <DragDeltaSetter delta={activeDragDelta} />
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
            />
          </Stage>
        </TacticalStoreProvider>,
      );
    });

    expect(stageRef.current).not.toBeNull();
    expect(stageRef.current?.findOne('#ghost-trajectory-p-1')).toBeUndefined();
  });
});
