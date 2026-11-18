import { describe, expect, it } from 'vitest';
import { normalizeBall } from '@/lib/tactical/acl/annotation-normalizers';
import { hasActiveFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';

type SlideInput = Parameters<typeof hasActiveFrameEffects>[0][number];

describe('ball-trajectory-effect-acl', () => {
  it('normalizeBall returns undefined trajectoryEffect when omitted and preserves valid config', () => {
    const omitted = normalizeBall({ x: 50, y: 50 });
    expect(omitted.trajectoryEffect).toBeUndefined();

    const configured = normalizeBall({
      x: 50,
      y: 50,
      trajectoryEffect: {
        enabled: true,
        lineStyle: 'dashed',
        color: '#38bdf8',
        exitAction: 'auto-hide',
      },
    });
    expect(configured.trajectoryEffect).toEqual({
      enabled: true,
      lineStyle: 'dashed',
      color: '#38bdf8',
      exitAction: 'auto-hide',
    });
  });

  it('normalizeBall preserves unclamped trajectory.controlPoint coordinates', () => {
    const ball = normalizeBall({
      x: 50,
      y: 50,
      trajectory: {
        type: 'custom',
        controlPoint: { x: 50, y: -25 },
      },
    });

    expect(ball.trajectory).toEqual({
      type: 'custom',
      controlPoint: { x: 50, y: -25 },
    });
  });

  it('hasActiveFrameEffects returns true when ball.trajectoryEffect.enabled is true', () => {
    const slide: SlideInput = {
      id: 'slide-1',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 0,
      easing: 'ease-in-out',
      players: [],
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: clampToScreenNorm(50),
        y: clampToScreenNorm(50),
        visible: true,
        trajectoryEffect: {
          enabled: true,
          lineStyle: 'solid',
          exitAction: 'keep',
        },
      },
    };

    expect(hasActiveFrameEffects([slide])).toBe(true);
  });
});
