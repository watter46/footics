import type Konva from 'konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { createDefaultSlide } from '@/lib/types/tactical-unified';
import {
  calculatePitchDimensions,
  createTacticalTimeline,
  pausePlayback,
  seekPlayback,
  stopPlayback,
} from '../tactical-animation-canvas';

describe('calculatePitchDimensions', () => {
  it('stage が registry にある場合、Stage の幅と高さをそのままピッチ実サイズ (x: 0, y: 0) として返す', () => {
    // 任意のStage寸法（レターボックス計算を通すと縮小されてしまうような値）
    const mockStage = {
      width: () => 1000,
      height: () => 600,
    } as Konva.Stage;

    const registryRef = {
      current: {
        stage: mockStage,
      } as CanvasNodesRegistry,
    };

    const dims = calculatePitchDimensions(undefined, registryRef);
    expect(dims).toEqual({
      width: 1000,
      height: 600,
      x: 0,
      y: 0,
    });
  });

  it('pitchSize が明示的に渡された場合、その寸法をそのまま返す', () => {
    const custom = { width: 640, height: 480, x: 10, y: 20 };
    const dims = calculatePitchDimensions(custom);
    expect(dims).toEqual({
      width: 640,
      height: 480,
      x: 10,
      y: 20,
    });
  });

  it('stage も pitchSize もない場合、デフォルトの 800x450 (x: 0, y: 0) を返す', () => {
    const dims = calculatePitchDimensions();
    expect(dims).toEqual({
      width: 800,
      height: 450,
      x: 0,
      y: 0,
    });
  });
});

describe('createTacticalTimeline (GSAP integration)', () => {
  const slide1 = createDefaultSlide(0, 'slide-1');
  slide1.transitionDurationMs = 1000;
  slide1.pauseMs = 500;
  const slide2 = createDefaultSlide(1, 'slide-2');
  slide2.transitionDurationMs = 1000;
  slide2.pauseMs = 500;
  const slides = [slide1, slide2];

  it('GSAP Timeline インスタンスを生成し、シーク時に onUpdate(timeMs) を呼び出す', () => {
    const onUpdate = vi.fn();
    const tl = createTacticalTimeline(slides, onUpdate);

    expect(tl).toBeDefined();
    expect(typeof tl.play).toBe('function');
    expect(typeof tl.pause).toBe('function');
    expect(typeof tl.seek).toBe('function');
    expect(typeof tl.kill).toBe('function');

    // Total duration: slide1 transition(1000) + pause(500) = 1500ms = 1.5s
    expect(tl.duration()).toBe(1.5);

    // シークテスト (0.75秒 = 750ms)
    tl.seek(0.75, false);
    expect(onUpdate).toHaveBeenCalledWith(expect.closeTo(750, 0));

    // クリーンアップ
    tl.kill();
  });

  it('loop: true の場合、タイムラインが repeat 設定される', () => {
    const onUpdate = vi.fn();
    const tl = createTacticalTimeline(slides, onUpdate, { loop: true });

    expect(tl.repeat()).toBe(-1);
    tl.kill();
  });

  it('スライド数が 1枚以下の場合、duration 0 のタイムラインを返す', () => {
    const onUpdate = vi.fn();
    const tl = createTacticalTimeline([slide1], onUpdate);

    expect(tl.duration()).toBe(0);
    tl.kill();
  });
});

describe('playback control helpers with GSAP Timeline', () => {
  it('pausePlayback pauses the timeline and sets isPlaying to false', () => {
    const mockPause = vi.fn();
    const refs = {
      timelineRef: { current: { pause: mockPause } as any },
      currentPlaybackTimeRef: { current: 500 },
      lastActiveSlideIndexRef: { current: 0 },
    };
    const setIsPlaying = vi.fn();

    pausePlayback(refs, setIsPlaying);

    expect(mockPause).toHaveBeenCalled();
    expect(setIsPlaying).toHaveBeenCalledWith(false);
  });

  it('stopPlayback pauses timeline at 0, resets refs, and resets slide', () => {
    const mockPause = vi.fn();
    const refs = {
      timelineRef: { current: { pause: mockPause } as any },
      currentPlaybackTimeRef: { current: 500 },
      lastActiveSlideIndexRef: { current: 1 },
    };
    const setIsPlaying = vi.fn();
    const setActiveSlide = vi.fn();
    const applyFrameToCanvas = vi.fn();

    stopPlayback({
      refs,
      registry: undefined,
      pitchDimensions: { width: 800, height: 450 },
      applyFrameToCanvas,
      setIsPlaying,
      setActiveSlide,
    });

    expect(mockPause).toHaveBeenCalledWith(0);
    expect(refs.currentPlaybackTimeRef.current).toBe(0);
    expect(refs.lastActiveSlideIndexRef.current).toBe(0);
    expect(setIsPlaying).toHaveBeenCalledWith(false);
  });

  it('seekPlayback updates currentPlaybackTimeRef and seeks the timeline', () => {
    const mockSeek = vi.fn();
    const refs = {
      timelineRef: { current: { seek: mockSeek } as any },
      currentPlaybackTimeRef: { current: 0 },
      lastActiveSlideIndexRef: { current: 0 },
    };
    const applyFrameToCanvas = vi.fn();

    seekPlayback({
      timeMs: 600,
      totalDurationMs: 1500,
      refs,
      registry: undefined,
      pitchDimensions: { width: 800, height: 450 },
      applyFrameToCanvas,
    });

    expect(refs.currentPlaybackTimeRef.current).toBe(600);
    expect(mockSeek).toHaveBeenCalledWith(0.6, false);
    expect(applyFrameToCanvas).toHaveBeenCalledWith(
      600,
      undefined,
      800,
      450,
      false,
      0,
      0,
    );
  });
});
