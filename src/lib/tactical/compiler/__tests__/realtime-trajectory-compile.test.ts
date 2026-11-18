import { describe, expect, it } from 'vitest';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { compileSceneGraph } from '../compile-scene-graph';

const viewport: StageViewport = {
  width: 1000,
  height: 500,
};

function makePitchPlayer(
  id: string,
  x: number,
  y: number,
  overrides: Partial<PitchPlayer> = {},
): PitchPlayer {
  return {
    id,
    team: 'home',
    area: 'pitch',
    x: toScreenNormCoord(x),
    y: toScreenNormCoord(y),
    name: 'Player',
    badges: [],
    connectLines: [],
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'none',
      color: '#3b82f6',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1,
      numberSizeScale: 1,
      labelSizeScale: 1,
    },
    ...overrides,
  };
}

function makeBall(
  x: number,
  y: number,
  overrides: Partial<DomainSlide['ball']> = {},
): DomainSlide['ball'] {
  return {
    x: toScreenNormCoord(x),
    y: toScreenNormCoord(y),
    visible: true,
    ...overrides,
  };
}

function makeSlide(
  id: string,
  players: PitchPlayer[],
  ball: DomainSlide['ball'],
): DomainSlide {
  return {
    id,
    index: 0,
    pauseMs: 500,
    transitionDurationMs: 1000,
    easing: 'linear',
    players,
    ball,
    arrows: [],
    zones: [],
    texts: [],
  };
}

describe('compileTrajectories realtime playback & ball default OFF', () => {
  it('case 1: 遷移中 (easedProgress = 0.5, trajectoryEffect.enabled = true) で最終座標が移動中間位置と一致する', () => {
    const sourceSlide = makeSlide(
      's0',
      [makePitchPlayer('p1', 10, 20)],
      makeBall(20, 40),
    );
    const targetSlide = makeSlide(
      's1',
      [
        makePitchPlayer('p1', 50, 60, {
          trajectory: { type: 'straight' },
          trajectoryEffect: {
            enabled: true,
            lineStyle: 'solid',
            exitAction: 'keep',
          },
        }),
      ],
      makeBall(60, 80, {
        trajectory: { type: 'straight' },
        trajectoryEffect: {
          enabled: true,
          lineStyle: 'solid',
          exitAction: 'keep',
        },
      }),
    );
    const interpolatedSlide = makeSlide(
      's0',
      [makePitchPlayer('p1', 30, 40)],
      makeBall(40, 60),
    );

    const frame: EvaluatedTimelineFrame = {
      slideIndex: 0,
      nextSlideIndex: 1,
      progress: 0.5,
      easedProgress: 0.5,
      isPaused: false,
      timeInSlideMs: 1000,
      slide: interpolatedSlide,
      transitionSourceSlide: sourceSlide,
      transitionTargetSlide: targetSlide,
      arrowProgressMap: {},
      zoneOpacityMap: {},
      playerOpacityMap: {},
    };

    const scene = compileSceneGraph(frame, null, viewport, null);
    const p1Traj = scene.trajectories.find((t) => t.playerId === 'p1');
    const ballTraj = scene.trajectories.find((t) => t.playerId === 'ball');

    expect(p1Traj).toBeDefined();
    expect(ballTraj).toBeDefined();
    // p1: (10%, 20%) -> (50%, 60%) at t=0.5 => (30%, 40%) => (300px, 200px)
    const p1Pts = p1Traj?.flatPointsPx ?? [];
    expect(p1Pts[p1Pts.length - 2]).toBeCloseTo(300, 1);
    expect(p1Pts[p1Pts.length - 1]).toBeCloseTo(200, 1);
    // ball: (20%, 40%) -> (60%, 80%) at t=0.5 => (40%, 60%) => (400px, 300px)
    const ballPts = ballTraj?.flatPointsPx ?? [];
    expect(ballPts[ballPts.length - 2]).toBeCloseTo(400, 1);
    expect(ballPts[ballPts.length - 1]).toBeCloseTo(300, 1);
  });

  it('case 2: ポーズ中かつ exitAction が auto-hide なら非表示、keep なら全長含まれる', () => {
    const prevSlide = makeSlide(
      's0',
      [makePitchPlayer('p-hide', 10, 20), makePitchPlayer('p-keep', 10, 50)],
      makeBall(20, 40),
    );
    const currSlide = makeSlide(
      's1',
      [
        makePitchPlayer('p-hide', 50, 20, {
          trajectoryEffect: {
            enabled: true,
            lineStyle: 'solid',
            exitAction: 'auto-hide',
          },
        }),
        makePitchPlayer('p-keep', 50, 50, {
          trajectoryEffect: {
            enabled: true,
            lineStyle: 'solid',
            exitAction: 'keep',
          },
        }),
      ],
      makeBall(60, 80, {
        trajectoryEffect: {
          enabled: true,
          lineStyle: 'solid',
          exitAction: 'auto-hide',
        },
      }),
    );

    const frame: EvaluatedTimelineFrame = {
      slideIndex: 1,
      nextSlideIndex: 1,
      progress: 1,
      easedProgress: 1,
      isPaused: true,
      timeInSlideMs: 0,
      slide: currSlide,
      transitionSourceSlide: null,
      transitionTargetSlide: null,
      arrowProgressMap: {},
      zoneOpacityMap: {},
      playerOpacityMap: {},
    };

    const scene = compileSceneGraph(frame, null, viewport, prevSlide);
    expect(scene.trajectories.some((t) => t.playerId === 'p-hide')).toBe(false);
    expect(scene.trajectories.some((t) => t.playerId === 'ball')).toBe(false);

    const keepTraj = scene.trajectories.find((t) => t.playerId === 'p-keep');
    expect(keepTraj).toBeDefined();
    const pts = keepTraj?.flatPointsPx ?? [];
    expect(pts[pts.length - 2]).toBeCloseTo(500, 1);
    expect(pts[pts.length - 1]).toBeCloseTo(250, 1);
  });

  it('case 3: ボールに trajectory のみ設定・trajectoryEffect 未設定かつ非選択時は trajectories が空', () => {
    const prevSlide = makeSlide('s0', [], makeBall(20, 40));
    const currSlide = makeSlide(
      's1',
      [],
      makeBall(60, 80, {
        trajectory: { type: 'arc_left' },
      }),
    );

    const frame: EvaluatedTimelineFrame = {
      slideIndex: 1,
      nextSlideIndex: 1,
      progress: 0,
      easedProgress: 0,
      isPaused: true,
      timeInSlideMs: 0,
      slide: currSlide,
      transitionSourceSlide: null,
      transitionTargetSlide: null,
      arrowProgressMap: {},
      zoneOpacityMap: {},
      playerOpacityMap: {},
    };

    const scene = compileSceneGraph(frame, null, viewport, prevSlide);
    expect(scene.trajectories).toHaveLength(0);
  });

  it('case 4: ボールに trajectoryEffect 設定時、指定色・点線でコンパイルされる', () => {
    const prevSlide = makeSlide('s0', [], makeBall(20, 40));
    const currSlide = makeSlide(
      's1',
      [],
      makeBall(60, 80, {
        trajectoryEffect: {
          enabled: true,
          lineStyle: 'dashed',
          exitAction: 'keep',
          color: '#ef4444',
        },
      }),
    );

    const frame: EvaluatedTimelineFrame = {
      slideIndex: 1,
      nextSlideIndex: 1,
      progress: 0,
      easedProgress: 0,
      isPaused: true,
      timeInSlideMs: 0,
      slide: currSlide,
      transitionSourceSlide: null,
      transitionTargetSlide: null,
      arrowProgressMap: {},
      zoneOpacityMap: {},
      playerOpacityMap: {},
    };

    const scene = compileSceneGraph(frame, null, viewport, prevSlide);
    expect(scene.trajectories).toHaveLength(1);
    expect(scene.trajectories[0]).toMatchObject({
      playerId: 'ball',
      color: '#ef4444',
      dashArrayPx: [6, 4],
      visible: true,
    });
  });
});
