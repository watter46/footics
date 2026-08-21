import { describe, expect, it } from 'vitest';
import type { TacticalScene } from '@/stores/tactical-animation-store';
import {
  calculateTotalDuration,
  getInterpolatedFrameState,
} from '../interpolation';

describe('interpolation logic', () => {
  const mockScenes: TacticalScene[] = [
    {
      id: 'scene-1',
      durationMs: 2000,
      pauseMs: 600,
      easing: 'linear',
      players: {
        '1': {
          playerId: '1',
          name: 'Player 1',
          shirtNo: '10',
          x: 10,
          y: 20,
          team: 'home',
          area: 'pitch',
          options: {
            insideContent: 'number',
            bottomLabel: 'name',
            color: '#3b82f6',
          },
        },
      },
      ballPos: { x: 10, y: 20 },
    },
    {
      id: 'scene-2',
      durationMs: 1000,
      pauseMs: 300,
      easing: 'linear',
      players: {
        '1': {
          playerId: '1',
          name: 'Player 1',
          shirtNo: '10',
          x: 50,
          y: 60,
          team: 'home',
          area: 'pitch',
          options: {
            insideContent: 'number',
            bottomLabel: 'name',
            color: '#3b82f6',
          },
        },
      },
      ballPos: { x: 50, y: 60 },
    },
  ];

  it('calculates total duration correctly using scene-1 settings', () => {
    const total = calculateTotalDuration(mockScenes);
    expect(total).toBe(2600); // 2000ms duration + 600ms pause of scene 0
  });

  it('interpolates positions at 50% progress (1000ms of 2000ms)', () => {
    const state = getInterpolatedFrameState(mockScenes, 1000); // halfway of 2000ms
    expect(state.players['1'].x).toBeCloseTo(30, 1);
    expect(state.players['1'].y).toBeCloseTo(40, 1);
    expect(state.ballPos.x).toBeCloseTo(30, 1);
    expect(state.ballPos.y).toBeCloseTo(40, 1);
  });

  it('holds position during pause period (2200ms of 2600ms)', () => {
    const state = getInterpolatedFrameState(mockScenes, 2200); // during 600ms pause
    expect(state.players['1'].x).toBeCloseTo(50, 1);
    expect(state.players['1'].y).toBeCloseTo(60, 1);
    expect(state.ballPos.x).toBeCloseTo(50, 1);
    expect(state.ballPos.y).toBeCloseTo(60, 1);
  });

  it('interpolates curved trajectory correctly when end scene has arc_left', () => {
    const curvedScenes: TacticalScene[] = [
      {
        ...mockScenes[0],
        players: {
          '1': {
            ...mockScenes[0].players['1'],
            x: 0,
            y: 0,
            trajectory: { type: 'straight' },
          },
        },
      },
      {
        ...mockScenes[1],
        players: {
          '1': {
            ...mockScenes[1].players['1'],
            x: 100,
            y: 0,
            trajectory: { type: 'arc_left', curveOffset: 30 },
          },
        },
      },
    ];

    const state = getInterpolatedFrameState(curvedScenes, 1000); // 50%
    expect(state.players['1'].x).toBeCloseTo(50, 1);
    // arc_left (dx > 0) creates an upward/negative-Y displacement on control point
    expect(state.players['1'].y).not.toBe(0);
    expect(state.players['1'].y).toBeLessThan(0);
  });

  it('interpolates curved ball trajectory correctly with arc_right', () => {
    const ballCurvedScenes: TacticalScene[] = [
      {
        ...mockScenes[0],
        ballPos: { x: 0, y: 0 },
        ballTrajectory: { type: 'straight' },
      },
      {
        ...mockScenes[1],
        ballPos: { x: 100, y: 0 },
        ballTrajectory: { type: 'arc_right', curveOffset: 40 },
      },
    ];

    const state = getInterpolatedFrameState(ballCurvedScenes, 1000); // 50%
    expect(state.ballPos.x).toBeCloseTo(50, 1);
    // arc_right (dx > 0) creates a downward/positive-Y displacement
    expect(state.ballPos.y).toBeGreaterThan(0);
  });

  it('interpolates custom ball trajectory with custom controlPoint on destination scene', () => {
    const customScenes: TacticalScene[] = [
      {
        ...mockScenes[0],
        ballPos: { x: 0, y: 0 },
        ballTrajectory: { type: 'straight' },
      },
      {
        ...mockScenes[1],
        ballPos: { x: 100, y: 0 },
        ballTrajectory: {
          type: 'custom',
          controlPoint: { x: 50, y: -80 },
        },
      },
    ];

    const state = getInterpolatedFrameState(customScenes, 1000); // t = 0.5
    // Quadratic bezier at t=0.5 with p0=(0,0), cp=(50,-80), p1=(100,0):
    // x = 0.25*0 + 0.5*50 + 0.25*100 = 50
    // y = 0.25*0 + 0.5*(-80) + 0.25*0 = -40
    expect(state.ballPos.x).toBeCloseTo(50, 1);
    expect(state.ballPos.y).toBeCloseTo(-40, 1);
  });

  it('does not leak custom trajectory from scene N to scene N+1 when scene N+1 is straight', () => {
    const multiScenes: TacticalScene[] = [
      {
        ...mockScenes[0], // Scene 0
        durationMs: 1000,
        pauseMs: 0,
        ballPos: { x: 0, y: 0 },
        ballTrajectory: { type: 'straight' },
      },
      {
        ...mockScenes[1], // Scene 1 (custom trajectory from scene 0)
        durationMs: 1000,
        pauseMs: 0,
        ballPos: { x: 100, y: 0 },
        ballTrajectory: {
          type: 'custom',
          controlPoint: { x: 50, y: -80 },
        },
      },
      {
        id: 'scene-3', // Scene 2 (straight trajectory from scene 1)
        durationMs: 1000,
        pauseMs: 0,
        easing: 'linear',
        players: {},
        ballPos: { x: 100, y: 100 },
        ballTrajectory: { type: 'straight' },
      },
    ];

    // Transition from Scene 1 to Scene 2 (at time 1500ms = halfway between scene 1 and 2)
    const state = getInterpolatedFrameState(multiScenes, 1500); // halfway from (100,0) to (100,100)
    // Should be strictly linear: x=100, y=50 without any Y displacement towards -80
    expect(state.ballPos.x).toBeCloseTo(100, 1);
    expect(state.ballPos.y).toBeCloseTo(50, 1);
  });
});
