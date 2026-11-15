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
import {
  calculateUnifiedTotalDuration,
  isDirectorCameraMoving,
  resolvePlaybackDurationMs,
  resolveSyntheticDirectorCamera,
} from '../engine/director-camera';
import {
  buildExportMVPMatrix,
  computeBillboardDepthKey,
  projectStagePixelWithPitchTransform,
} from '../engine/projection-3d';
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

    const base = 200 * Math.cos((tiltDeg * Math.PI) / 180);
    expect(playerDepth).toBeCloseTo(base, 5);
    expect(ballDepth).toBeCloseTo(base + 0.1, 5);
    expect(textDepth).toBeCloseTo(base + 0.2, 5);
    expect(playerDepth).toBeLessThan(ballDepth);
    expect(ballDepth).toBeLessThan(textDepth);
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

describe('projection-3d 3D yaw/tilt & pan scaling', () => {
  it('projects coordinates with yaw=75 vs yaw=90 and tilt=30 without NaN/Infinity', () => {
    const viewport = { width: 640, height: 360, offsetX: 0, offsetY: 0 };
    const point = toStagePixelPoint(480, 90);

    const proj90 = projectStagePixelWithPitchTransform(point, viewport, {
      zoom: 1,
      panX: 0,
      panY: 0,
      tilt: 30,
      yaw: 90,
      isLocked: false,
    });
    const proj75 = projectStagePixelWithPitchTransform(point, viewport, {
      zoom: 1,
      panX: 0,
      panY: 0,
      tilt: 30,
      yaw: 75,
      isLocked: false,
    });

    expect(Number.isFinite(proj90.x)).toBe(true);
    expect(Number.isFinite(proj90.y)).toBe(true);
    expect(Number.isFinite(proj90.scale)).toBe(true);
    expect(Number.isFinite(proj75.x)).toBe(true);
    expect(Number.isFinite(proj75.y)).toBe(true);
    expect(Number.isFinite(proj75.scale)).toBe(true);
    expect(proj75.x).not.toBeCloseTo(proj90.x, 2);
  });

  it('scales panX/panY by exportHeight / 360 in buildExportMVPMatrix and 2D fast path', () => {
    const mvp360 = buildExportMVPMatrix(
      { zoom: 1, panX: 20, panY: 10, tilt: 30, yaw: 0, isLocked: false },
      640,
      360,
    );
    const mvp720 = buildExportMVPMatrix(
      { zoom: 1, panX: 20, panY: 10, tilt: 30, yaw: 0, isLocked: false },
      1280,
      720,
    );
    expect(mvp360).toHaveLength(16);
    expect(mvp720).toHaveLength(16);
    expect(mvp720[12]).toBeCloseTo(mvp360[12], 5);

    const pt = toStagePixelPoint(640, 360);
    const res720 = projectStagePixelWithPitchTransform(
      pt,
      { width: 1280, height: 720, offsetX: 0, offsetY: 0 },
      { zoom: 1, panX: 20, panY: 10, tilt: 0, yaw: 0, isLocked: false },
    );
    expect(res720.x).toBeCloseTo(640 + 40, 4);
    expect(res720.y).toBeCloseTo(360 + 20, 4);
    expect(res720.scale).toBe(1);
  });
});

describe('director-camera', () => {
  it('calculates unified total duration and single-slide playback duration', () => {
    const single = [{ transitionDurationMs: 2000, pauseMs: 1000 }];
    expect(calculateUnifiedTotalDuration(single)).toBe(0);
    expect(resolvePlaybackDurationMs(single)).toBe(3000);

    const multi = [
      { transitionDurationMs: 1000, pauseMs: 500 },
      { transitionDurationMs: 1200, pauseMs: 300 },
    ];
    expect(calculateUnifiedTotalDuration(multi)).toBe(1500);
    expect(resolvePlaybackDurationMs(multi)).toBe(1500);
  });

  it('resolves synthetic director camera and detects movement', () => {
    const track = {
      enabled: true,
      globalKeyframes: [{ id: 'gk-1', timeMs: 0, tilt: 10, yaw: 90 }],
      actionCues: [
        {
          id: 'cue-1',
          startTimeMs: 1000,
          durationMs: 1000,
          transitionInMs: 200,
          zoom: 1.5,
          panX: 30,
          panY: -20,
          autoReturn: false,
          easing: 'linear' as const,
        },
      ],
    };

    const before = resolveSyntheticDirectorCamera(track, 500);
    expect(before.zoom).toBe(1);
    expect(before.tilt).toBe(10);
    expect(isDirectorCameraMoving(track, 500)).toBe(false);

    const mid = resolveSyntheticDirectorCamera(track, 1100);
    expect(mid.zoom).toBeCloseTo(1.25, 3);
    expect(mid.panX).toBeCloseTo(15, 3);
    expect(isDirectorCameraMoving(track, 1100)).toBe(true);
  });
});
