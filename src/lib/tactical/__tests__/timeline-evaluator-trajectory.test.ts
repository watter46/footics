import { describe, expect, it } from 'vitest';
import {
  evaluateStaticSlideFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
import {
  toMilliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';

function createSlide(
  id: string,
  index: number,
  overrides: Partial<DomainSlide> = {},
): DomainSlide {
  return {
    id,
    index,
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: toScreenNormCoord(50),
      y: toScreenNormCoord(50),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'ease-out',
    ...overrides,
  };
}

function createPhase(slides: DomainSlide[]): DomainTacticalPhase {
  return {
    id: 'phase-1',
    name: 'Test Phase',
    aspectRatio: '16:9',
    boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
    backgroundType: 'pitch',
    slides,
  };
}

describe('evaluateTimelineFrame - trajectory metadata', () => {
  it('case 1: ポーズ区間では isPaused: true, easedProgress: 0, transitionSourceSlide: null を返す', () => {
    const slide0 = createSlide('s0', 0, {
      pauseMs: 500,
      transitionDurationMs: 1000,
    });
    const slide1 = createSlide('s1', 1);
    const phase = createPhase([slide0, slide1]);

    const frame = evaluateTimelineFrame(phase, toMilliseconds(250));

    expect(frame.isPaused).toBe(true);
    expect(frame.easedProgress).toBe(0);
    expect(frame.transitionSourceSlide).toBeNull();
    expect(frame.transitionTargetSlide).toBeNull();
  });

  it('case 2: 遷移中間では isPaused: false, 0 < easedProgress < 1, transitionSourceSlide/TargetSlide が設定される', () => {
    const slide0 = createSlide('s0', 0, {
      pauseMs: 500,
      transitionDurationMs: 1000,
      easing: 'ease-out',
    });
    const slide1 = createSlide('s1', 1);
    const phase = createPhase([slide0, slide1]);

    const frame = evaluateTimelineFrame(phase, toMilliseconds(1000));

    expect(frame.isPaused).toBe(false);
    expect(frame.progress).toBeCloseTo(0.5, 5);
    expect(frame.easedProgress).toBeGreaterThan(0.5);
    expect(frame.easedProgress).toBeLessThan(1);
    expect(frame.transitionSourceSlide).toBe(slide0);
    expect(frame.transitionTargetSlide).toBe(slide1);
  });

  it('case 3: 最終到達後は isPaused: true, easedProgress: 1, transitionSourceSlide: null を返す', () => {
    const slide0 = createSlide('s0', 0, {
      pauseMs: 500,
      transitionDurationMs: 1000,
    });
    const slide1 = createSlide('s1', 1);
    const phase = createPhase([slide0, slide1]);

    const frame = evaluateTimelineFrame(phase, toMilliseconds(1500));

    expect(frame.isPaused).toBe(true);
    expect(frame.easedProgress).toBe(1);
    expect(frame.transitionSourceSlide).toBeNull();
    expect(frame.transitionTargetSlide).toBeNull();
  });

  it('evaluateStaticSlideFrame は easedProgress: 0, transitionSourceSlide: null を返す', () => {
    const slide0 = createSlide('s0', 0);
    const frame = evaluateStaticSlideFrame(slide0, 0);

    expect(frame.isPaused).toBe(true);
    expect(frame.easedProgress).toBe(0);
    expect(frame.transitionSourceSlide).toBeNull();
    expect(frame.transitionTargetSlide).toBeNull();
  });
});
