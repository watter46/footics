import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
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
} from '@/lib/types/tactical/slide';
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

  it('DEFAULT_BOUNDARY_BOX_* use fitTarget "pitch" and createXBoundaryBox uses "canvas"', () => {
    expect(DEFAULT_BOUNDARY_BOX_16_9.fitTarget).toBe('pitch');
    expect(DEFAULT_BOUNDARY_BOX_9_16.fitTarget).toBe('pitch');
    expect(DEFAULT_BOUNDARY_BOX_4_5.fitTarget).toBe('pitch');
    expect(DEFAULT_BOUNDARY_BOX_1_1.fitTarget).toBe('pitch');
    expect(DEFAULT_BOUNDARY_BOX_SCREENSHOT.fitTarget).toBe('pitch');
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

    expect(result.current.previewWidth).toBe(1080);
    expect(result.current.previewHeight).toBe(1352);
    expect(result.current.previewAspectStyle).toBe('1080 / 1352');
    expect(
      result.current.previewWidth / result.current.previewHeight,
    ).toBeCloseTo(4 / 5, 2);
  });

  it('correctly calculates preview dimensions 1080x1352 when slide project aspectRatio is 4:5 with 4:5 boundary preset', () => {
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

    expect(result.current.previewWidth).toBe(1080);
    expect(result.current.previewHeight).toBe(1352);
    expect(result.current.previewAspectStyle).toBe('1080 / 1352');
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

  it('notifies seekTo throttled during playback and on stop in director mode', () => {
    const sessionStore = createSessionStore({ workspaceMode: 'director' });
    const playbackStore = createPlaybackStore();
    const seekSpy = vi.spyOn(playbackStore.getState(), 'seekTo');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        TacticalStoreProvider,
        { stores: { sessionStore, playbackStore } },
        children,
      );

    let externalIsPlaying = true;
    const { rerender, result } = renderHook(
      () =>
        useExportPreviewAnimation({
          slides: [mockSlide1, mockSlide2],
          aspectRatio: '16:9',
          externalIsPlaying,
          canvasRef,
          timeLabelRef,
          sliderRef,
        }),
      { wrapper },
    );

    // 再生中に handleSeek などの呼び出しでフレームが進んだ時、スロットル間隔で seekTo が呼ばれること
    act(() => {
      result.current.handleSeek(100);
    });

    expect(seekSpy).toHaveBeenCalledWith(100);
    seekSpy.mockClear();

    // 60ms未満の小さな変化ではスロットルされて seekTo は呼ばれないこと
    act(() => {
      result.current.handleSeek(120);
    });
    expect(seekSpy).not.toHaveBeenCalled();

    // 60ms以上の変化では seekTo が呼ばれること
    act(() => {
      result.current.handleSeek(200);
    });
    expect(seekSpy).toHaveBeenCalledWith(200);
    seekSpy.mockClear();

    // 再生停止時（true -> false）、最終時刻で seekTo が確実に1回呼ばれること
    externalIsPlaying = false;
    rerender();

    expect(seekSpy).toHaveBeenCalledWith(200);
  });

  it('renders initial frame with directorCamera and screenBackground passed via props without store provider', () => {
    const directorCamera = {
      enabled: true,
      globalKeyframes: [
        {
          id: 'k1',
          timeMs: 0,
          tilt: 25,
          yaw: 15,
          zoom: 1.1,
          panX: 0,
          panY: 0,
        },
      ],
      actionCues: [],
    };
    const screenBackground = {
      type: 'cinematic' as const,
      color: '#1a1a2e',
    };

    renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1],
        aspectRatio: '16:9',
        directorCamera,
        screenBackground,
        teamVisibility: 'home',
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
    expect(lastCall[1].directorCamera).toEqual(directorCamera);
    expect(lastCall[1].screenBackground).toEqual(screenBackground);
    expect(lastCall[1].teamVisibility).toBe('home');
  });

  it('runs requestAnimationFrame idle effect loop when paused with active frame effects and cancels on unmount', () => {
    let rafCallback: FrameRequestCallback | null = null;
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        rafCallback = cb;
        return 12345;
      });
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

    const slideWithEffect: Slide = {
      ...mockSlide1,
      arrows: [
        {
          id: 'a1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 50 },
          ],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          arrowHead: true,
          effect: {
            type: 'grow',
            duration: 0.8,
            delay: 0,
            holdDuration: 1,
            exitAction: 'keep',
            fadeDuration: 0.3,
            easing: 'linear',
          },
        },
      ],
    };

    const { unmount } = renderHook(() =>
      useExportPreviewAnimation({
        slides: [slideWithEffect],
        aspectRatio: '16:9',
        externalIsPlaying: false,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    expect(rafSpy).toHaveBeenCalled();
    expect(rafCallback).not.toBeNull();

    // 1 tick of rAF
    act(() => {
      rafCallback?.(1500);
    });

    const calls = vi.mocked(frameRendererModule.renderTacticalFrameToCanvas)
      .mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1].timeMs).toBe(0);
    expect(lastCall[1].effectTimeMs).toBeDefined();

    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(12345);

    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it('passes normalized phase to renderTacticalFrameToCanvas', () => {
    renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1, mockSlide2],
        aspectRatio: '16:9',
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
    expect(lastCall[1].phase).toBeDefined();
    expect(lastCall[1].phase?.slides.length).toBe(2);
  });
});
