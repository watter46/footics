import { describe, expect, it } from 'vitest';
import {
  toMilliseconds,
  toScreenNormCoord,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import { computeBillboardDepthKey } from '../engine/projection-3d';
import {
  evaluateStaticSlideFrame,
  evaluateTimelineFrame,
} from '../engine/timeline-evaluator';

describe('projection-3d', () => {
  it('computes billboard depth key with correct ordering for identical Y', () => {
    const point = toStagePixelPoint(100, 200);
    const tiltDeg = 45;

    const playerDepth = computeBillboardDepthKey(point, 'player', tiltDeg);
    const textDepth = computeBillboardDepthKey(point, 'text', tiltDeg);
    const ballDepth = computeBillboardDepthKey(point, 'ball', tiltDeg);

    expect(playerDepth).toBeCloseTo(200, 5);
    expect(textDepth).toBeCloseTo(200.1, 5);
    expect(ballDepth).toBeCloseTo(200.2, 5);
    expect(playerDepth).toBeLessThan(textDepth);
    expect(textDepth).toBeLessThan(ballDepth);
  });
});

describe('timeline-evaluator', () => {
  const baseSlide: DomainSlide = {
    id: 's0',
    index: 0,
    players: [
      {
        id: 'p1',
        team: 'home',
        area: 'pitch',
        x: toScreenNormCoord(20),
        y: toScreenNormCoord(50),
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#034694',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1,
          numberSizeScale: 1,
          labelSizeScale: 1,
        },
        connectLines: [],
        badges: [],
      },
    ],
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
    easing: 'linear',
  };

  const slide1: DomainSlide = {
    ...baseSlide,
    id: 's1',
    index: 1,
    players: [
      {
        ...baseSlide.players[0],
        x: toScreenNormCoord(80),
        y: toScreenNormCoord(50),
      },
    ],
  };

  const phase: DomainTacticalPhase = {
    id: 'phase-1',
    name: 'Phase 1',
    aspectRatio: '4:5',
    boundaryBox: {
      enabled: false,
      x: toScreenNormCoord(0),
      y: toScreenNormCoord(0),
      width: 100,
      height: 100,
    },
    backgroundType: 'pitch',
    slides: [baseSlide, slide1],
  };

  it('interpolates player position at concrete test values (pause 500ms + transition 500ms = progress 0.5)', () => {
    // スライド0 (p1: x=20, y=50, transitionDurationMs: 1000, pauseMs: 500, easing: 'linear')
    // からスライド1 (p1: x=80, y=50) への遷移で timeMs = 1000 as Milliseconds (pause 500ms + transition 500ms = 進捗 0.5)
    // ➔ frame.slide.players[0].x === 50
    const frame = evaluateTimelineFrame(phase, toMilliseconds(1000));

    expect(frame.slideIndex).toBe(0);
    expect(frame.nextSlideIndex).toBe(1);
    expect(frame.progress).toBeCloseTo(0.5, 4);
    expect(frame.isPaused).toBe(false);
    expect(frame.timeInSlideMs).toBe(1000);
    expect(frame.slide.players[0].x).toBeCloseTo(50, 4);
  });

  it('stays paused during the initial pause duration (timeMs = 300ms)', () => {
    const frame = evaluateTimelineFrame(phase, toMilliseconds(300));

    expect(frame.slideIndex).toBe(0);
    expect(frame.nextSlideIndex).toBe(1);
    expect(frame.progress).toBe(0);
    expect(frame.isPaused).toBe(true);
    expect(frame.timeInSlideMs).toBe(300);
    expect(frame.slide.players[0].x).toBeCloseTo(20, 4);
  });

  it('approaches final destination near end of transition (timeMs = 1400ms)', () => {
    const frame = evaluateTimelineFrame(phase, toMilliseconds(1400));

    expect(frame.slideIndex).toBe(0);
    expect(frame.nextSlideIndex).toBe(1);
    expect(frame.progress).toBeCloseTo(0.9, 4);
    expect(frame.isPaused).toBe(false);
    expect(frame.slide.players[0].x).toBeCloseTo(74, 4);
  });

  it('returns last slide frame when timeMs reaches or exceeds total duration', () => {
    const frameAtTotal = evaluateTimelineFrame(phase, toMilliseconds(1500));

    expect(frameAtTotal.slideIndex).toBe(1);
    expect(frameAtTotal.nextSlideIndex).toBe(1);
    expect(frameAtTotal.progress).toBe(1);
    expect(frameAtTotal.isPaused).toBe(true);
    expect(frameAtTotal.slide.players[0].x).toBeCloseTo(80, 4);

    const framePastTotal = evaluateTimelineFrame(phase, toMilliseconds(2000));

    expect(framePastTotal.slideIndex).toBe(1);
    expect(framePastTotal.nextSlideIndex).toBe(1);
    expect(framePastTotal.progress).toBe(1);
    expect(framePastTotal.isPaused).toBe(true);
    expect(framePastTotal.slide.players[0].x).toBeCloseTo(80, 4);
  });

  it('evaluates static slide frame correctly', () => {
    const frame = evaluateStaticSlideFrame(baseSlide);

    expect(frame.slideIndex).toBe(0);
    expect(frame.nextSlideIndex).toBe(0);
    expect(frame.progress).toBe(0);
    expect(frame.isPaused).toBe(true);
    expect(frame.timeInSlideMs).toBe(0);
    expect(frame.slide.players[0].x).toBe(20);
    expect(frame.playerOpacityMap.p1.visible).toBe(true);
    expect(frame.playerOpacityMap.p1.opacity).toBe(1);
  });
});
