import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as frameRendererModule from '@/lib/tactical/export/tactical-frame-renderer';
import {
  type PitchTransform,
  type Slide,
  SlideSchema,
} from '@/lib/types/tactical-unified';
import { useExportPreviewAnimation } from '../use-export-preview-animation';

vi.mock('@/lib/tactical/export/tactical-frame-renderer', () => ({
  renderTacticalFrameToCanvas: vi.fn(),
}));

const mockSlide1: Slide = SlideSchema.parse({
  id: 'slide-1',
  index: 0,
  transitionDurationMs: 1000,
  pauseMs: 500,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: 50, y: 50, visible: true },
});

const mockSlide2: Slide = SlideSchema.parse({
  id: 'slide-2',
  index: 1,
  transitionDurationMs: 1000,
  pauseMs: 500,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: 60, y: 50, visible: true },
});

describe('useExportPreviewAnimation', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  const canvasRef = { current: null as HTMLCanvasElement | null };
  const timeLabelRef = { current: null as HTMLSpanElement | null };
  const sliderRef = { current: null as HTMLInputElement | null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {} as CanvasRenderingContext2D;
    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 1920,
      height: 1080,
    } as unknown as HTMLCanvasElement;
    canvasRef.current = mockCanvas;
  });

  it('calculates mvpMatrix even with multiple slides when animation is paused and pitchTransform is provided', () => {
    const pitchTransform: PitchTransform = {
      tilt: 30,
      yaw: 90,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };

    renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1, mockSlide2],
        aspectRatio: '16:9',
        pitchTransform,
        externalIsPlaying: false,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    const calls = vi.mocked(frameRendererModule.renderTacticalFrameToCanvas)
      .mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1].mvpMatrix).toBeInstanceOf(Float32Array);
    expect(lastCall[1].mvpMatrix?.length).toBe(16);
  });

  it('reactively redraws frame when pitchTransform changes while paused', () => {
    const initialTransform: PitchTransform = {
      tilt: 0,
      yaw: 90,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };

    let transform = initialTransform;
    const { rerender } = renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1, mockSlide2],
        aspectRatio: '16:9',
        pitchTransform: transform,
        externalIsPlaying: false,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    const initialCallCount = vi.mocked(
      frameRendererModule.renderTacticalFrameToCanvas,
    ).mock.calls.length;

    // カメラワーク（pitchTransform）を変更
    transform = {
      tilt: 45,
      yaw: 120,
      zoom: 1.2,
      panX: 10,
      panY: -10,
      isLocked: false,
    };

    rerender();

    const newCallCount = vi.mocked(
      frameRendererModule.renderTacticalFrameToCanvas,
    ).mock.calls.length;
    expect(newCallCount).toBeGreaterThan(initialCallCount);
  });
});
