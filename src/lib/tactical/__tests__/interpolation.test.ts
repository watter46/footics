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
});
