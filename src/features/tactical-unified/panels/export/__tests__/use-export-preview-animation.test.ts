import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as frameRendererModule from '@/lib/tactical/export/tactical-frame-renderer';
import {
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_1_1,
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  type PitchTransform,
  type Slide,
  SlideSchema,
} from '@/lib/types/tactical-unified';
import {
  CINEMATIC_MASK_FILL,
  useExportPreviewAnimation,
} from '../use-export-preview-animation';

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
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
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

  it('maintains canvas crop during playback when boundaryBox is enabled and does not draw cinematic mask', () => {
    const boundaryBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      visible: false,
      fitTarget: 'pitch' as const,
    };

    const { result } = renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1],
        aspectRatio: '16:9',
        boundaryBox,
        externalIsPlaying: true,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    // 再生中も境界線領域にクロップされること (1920*0.8=1536, 1080*0.8=864)
    expect(result.current.previewWidth).toBe(1536);
    expect(result.current.previewHeight).toBe(864);
    expect(result.current.previewAspectStyle).toBe('1536 / 864');

    const calls = vi.mocked(frameRendererModule.renderTacticalFrameToCanvas)
      .mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    // renderTacticalFrameToCanvas に boundaryBox が渡されること
    expect(lastCall[1].boundaryBox).toEqual(boundaryBox);

    // キャンバス自体がクロップされているため、外側シネマティックマスクの fillRect は呼ばれないこと
    expect(mockContext.fillRect).not.toHaveBeenCalled();
  });

  it('does not crop canvas when boundaryBox is disabled', () => {
    const boundaryBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: false,
      visible: false,
      fitTarget: 'pitch' as const,
    };

    const { result } = renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1],
        aspectRatio: '16:9',
        boundaryBox,
        externalIsPlaying: true,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    // enabled: false なのでクロップされない
    expect(result.current.previewWidth).toBe(1920);
    expect(result.current.previewHeight).toBe(1080);
    expect(result.current.previewAspectStyle).toBeUndefined();
    expect(mockContext.fillRect).not.toHaveBeenCalled();
  });

  it('does not draw cinematic mask when boundaryBox is full screen', () => {
    const boundaryBox = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch' as const,
    };

    renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1],
        aspectRatio: '16:9',
        boundaryBox,
        externalIsPlaying: true,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    expect(mockContext.fillRect).not.toHaveBeenCalled();
  });

  it('DEFAULT_BOUNDARY_BOX_* and createXBoundaryBox use fitTarget "canvas"', () => {
    expect(DEFAULT_BOUNDARY_BOX_16_9.fitTarget).toBe('canvas');
    expect(DEFAULT_BOUNDARY_BOX_9_16.fitTarget).toBe('canvas');
    expect(DEFAULT_BOUNDARY_BOX_4_5.fitTarget).toBe('canvas');
    expect(DEFAULT_BOUNDARY_BOX_1_1.fitTarget).toBe('canvas');
    expect(DEFAULT_BOUNDARY_BOX_SCREENSHOT.fitTarget).toBe('canvas');
    expect(createXBoundaryBox('4:5', '16:9').fitTarget).toBe('canvas');
  });

  it('correctly calculates preview dimensions and 4:5 aspect ratio without distortion when 4:5 preset boundary is set', () => {
    const boundaryBox = createXBoundaryBox('4:5', '16:9');

    const { result } = renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1],
        aspectRatio: '16:9',
        boundaryBox,
        externalIsPlaying: false,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    expect(result.current.previewWidth).toBe(864);
    expect(result.current.previewHeight).toBe(1080);
    expect(result.current.previewAspectStyle).toBe('864 / 1080');
    expect(
      result.current.previewWidth / result.current.previewHeight,
    ).toBeCloseTo(4 / 5, 2);
  });

  it('correctly calculates preview dimensions 864x1080 when slide project aspectRatio is 4:5 with 4:5 boundary preset', () => {
    const boundaryBox = createXBoundaryBox('4:5', '16:9');

    const { result } = renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1],
        aspectRatio: '4:5',
        boundaryBox,
        externalIsPlaying: false,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    expect(result.current.previewWidth).toBe(864);
    expect(result.current.previewHeight).toBe(1080);
    expect(result.current.previewAspectStyle).toBe('864 / 1080');
    expect(
      result.current.previewWidth / result.current.previewHeight,
    ).toBeCloseTo(4 / 5, 2);
  });

  it('passes baseWidth and baseHeight to renderTacticalFrameToCanvas for canonical reference frame', () => {
    const boundaryBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      visible: false,
      fitTarget: 'pitch' as const,
    };

    renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1],
        aspectRatio: '16:9',
        boundaryBox,
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
    expect(lastCall[1].baseWidth).toBe(1920);
    expect(lastCall[1].baseHeight).toBe(1080);
  });
});
