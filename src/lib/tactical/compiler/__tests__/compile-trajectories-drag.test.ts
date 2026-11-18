import { describe, expect, it } from 'vitest';
import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { compileSceneGraph } from '../compile-scene-graph';
import { subdivideQuadraticBezier } from '../geometry-primitives';
import type { EphemeralSessionState } from '../scene-graph-dto';

const VIEWPORT: StageViewport = {
  width: 1200,
  height: 800,
};

function createSlide(overrides?: Partial<DomainSlide>): DomainSlide {
  return {
    id: 'slide-1',
    name: 'Slide 1',
    durationMs: 2000,
    players: [
      {
        id: 'p1',
        area: 'pitch',
        team: 'home',
        number: 10,
        name: 'Player 10',
        x: 50,
        y: 50,
        connectLines: [],
        style: { color: '#ef4444' },
        trajectoryEffect: { enabled: true },
      },
    ],
    ball: {
      x: 50,
      y: 60,
      visible: true,
      color: '#ffffff',
    },
    arrows: [],
    zones: [],
    texts: [],
    connectLines: [],
    ...overrides,
  } as DomainSlide;
}

function createFrame(slide: DomainSlide): EvaluatedTimelineFrame {
  return {
    slide,
    timeInSlideMs: 0,
    playerOpacityMap: {},
    arrowDrawProgressMap: {},
    zoneOpacityMap: {},
    textOpacityMap: {},
  } as unknown as EvaluatedTimelineFrame;
}

describe('compileTrajectories with moved slide & pitchTransform', () => {
  it('case 1: currSlide の選手・ボールを dx=10 移動した状態で trajectories を生成し終点が移動先と一致する', () => {
    const prevSlide = createSlide({ id: 'slide-0' });
    const movedPlayerPos = toScreenNormPoint(60, 50, false);
    const movedBallPos = toScreenNormPoint(60, 60, false);
    const currSlide = createSlide({
      id: 'slide-1',
      players: prevSlide.players.map((p) =>
        p.id === 'p1' ? { ...p, x: movedPlayerPos.x } : p,
      ),
      ball: { ...prevSlide.ball, x: movedBallPos.x },
    });
    const frame = createFrame(currSlide);
    const session: EphemeralSessionState = {
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
      selectedIds: ['p1', 'ball'],
    };

    const scene = compileSceneGraph(frame, session, VIEWPORT, prevSlide);
    const playerTraj = scene.trajectories.find((t) => t.playerId === 'p1');
    const ballTraj = scene.trajectories.find((t) => t.playerId === 'ball');

    expect(playerTraj).toBeDefined();
    expect(ballTraj).toBeDefined();

    const expectedPlayerEnd = screenNormToStagePixel(
      toScreenNormPoint(60, 50, false),
      VIEWPORT,
    );
    const pPts = playerTraj!.flatPointsPx;
    expect(pPts[pPts.length - 2]).toBeCloseTo(expectedPlayerEnd.x, 3);
    expect(pPts[pPts.length - 1]).toBeCloseTo(expectedPlayerEnd.y, 3);

    const expectedBallEnd = screenNormToStagePixel(
      toScreenNormPoint(60, 60, false),
      VIEWPORT,
    );
    const bPts = ballTraj!.flatPointsPx;
    expect(bPts[bPts.length - 2]).toBeCloseTo(expectedBallEnd.x, 3);
    expect(bPts[bPts.length - 1]).toBeCloseTo(expectedBallEnd.y, 3);
  });

  it('case 2: pitchTransform.tilt=25 かつ trajectory.type=arc_left のとき投影前平面でオフセット生成された後に 3D 投影される', () => {
    const pitchTransform = {
      tilt: 25,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };
    const prevSlide = createSlide({
      id: 'slide-0',
      players: [
        {
          id: 'p1',
          area: 'pitch',
          team: 'home',
          number: 10,
          name: 'Player 10',
          x: 30,
          y: 50,
          connectLines: [],
          style: { color: '#ef4444' },
        },
      ] as unknown as DomainSlide['players'],
    });
    const currSlide = createSlide({
      id: 'slide-1',
      pitchTransform,
      players: [
        {
          id: 'p1',
          area: 'pitch',
          team: 'home',
          number: 10,
          name: 'Player 10',
          x: 70,
          y: 50,
          connectLines: [],
          style: { color: '#ef4444' },
          trajectoryEffect: { enabled: true },
          trajectory: { type: 'arc_left', curveOffset: 20 },
        },
      ] as unknown as DomainSlide['players'],
    });

    const frame = createFrame(currSlide);
    const scene = compileSceneGraph(frame, null, VIEWPORT, prevSlide);
    const traj = scene.trajectories.find((t) => t.playerId === 'p1');
    expect(traj).toBeDefined();

    // 投影前平面でオフセット生成し、全頂点を 3D 投影した期待値と比較
    const rawStart = screenNormToStagePixel(
      toScreenNormPoint(30, 50, false),
      VIEWPORT,
    );
    const rawEnd = screenNormToStagePixel(
      toScreenNormPoint(70, 50, false),
      VIEWPORT,
    );
    const midX = (rawStart.x + rawEnd.x) / 2;
    const midY = (rawStart.y + rawEnd.y) / 2;
    const dx = rawEnd.x - rawStart.x;
    const dy = rawEnd.y - rawStart.y;
    const dist = Math.hypot(dx, dy);
    const offset = dist * 0.2;
    const cpX = midX + (dy / dist) * offset;
    const cpY = midY + (-dx / dist) * offset;
    const rawCurve = subdivideQuadraticBezier(
      rawStart.x,
      rawStart.y,
      cpX,
      cpY,
      rawEnd.x,
      rawEnd.y,
      30,
    );

    // 中間頂点 (index 15 -> 30, 31)
    const midIdx = 30;
    const expectedMid = projectStagePixelWithPitchTransform(
      toStagePixelPoint(rawCurve[midIdx], rawCurve[midIdx + 1]),
      VIEWPORT,
      pitchTransform,
    );
    expect(traj!.flatPointsPx[midIdx]).toBeCloseTo(expectedMid.x, 3);
    expect(traj!.flatPointsPx[midIdx + 1]).toBeCloseTo(expectedMid.y, 3);
  });
});
