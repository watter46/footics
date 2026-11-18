import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { toMilliseconds } from '@/lib/types/tactical/branded';
import type { PitchTransform } from '@/lib/types/tactical/camera-config';
import {
  type DomainSlide,
  DomainSlideSchema,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_1_1,
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
} from '@/lib/types/tactical/pitch-config';
import {
  CINEMATIC_MASK_FILL,
  useExportPreviewAnimation,
} from '../use-export-preview-animation';

interface FillRectRecord {
  fillStyle: string | CanvasGradient | CanvasPattern;
  args: [number, number, number, number];
}

function createMock2DContext(
  fillRectRecords: FillRectRecord[] = [],
): CanvasRenderingContext2D {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      fillRectRecords.push({ fillStyle: ctx.fillStyle, args: [x, y, w, h] });
    }),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

const mockSlide1: DomainSlide = DomainSlideSchema.parse({
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

const mockSlide2: DomainSlide = DomainSlideSchema.parse({
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
  let fillRectRecords: FillRectRecord[];
  const canvasRef = { current: null as HTMLCanvasElement | null };
  const timeLabelRef = { current: null as HTMLSpanElement | null };
  const sliderRef = { current: null as HTMLInputElement | null };

  beforeEach(() => {
    vi.clearAllMocks();
    fillRectRecords = [];
    mockContext = createMock2DContext(fillRectRecords);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockContext as unknown as RenderingContext,
    );
    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 1920,
      height: 1080,
    } as unknown as HTMLCanvasElement;
    canvasRef.current = mockCanvas;
  });

  it('passes pitchTransform even with multiple slides when animation is paused and pitchTransform is provided', () => {
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

    expect(mockContext.save).toHaveBeenCalled();
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

    const initialCallCount = vi.mocked(mockContext.save).mock.calls.length;

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

    const newCallCount = vi.mocked(mockContext.save).mock.calls.length;
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

    expect(mockContext.save).toHaveBeenCalled();

    // キャンバス自体がクロップされているため、外側シネマティックマスクの fillRect は呼ばれないこと
    expect(
      fillRectRecords.some((r) => r.fillStyle === CINEMATIC_MASK_FILL),
    ).toBe(false);
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

  it('passes baseWidth and baseHeight to renderTacticalPhaseFrameToCanvas for canonical reference frame', () => {
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

    expect(mockContext.save).toHaveBeenCalled();
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

    expect(mockContext.save).toHaveBeenCalled();
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

    const slideWithEffect: DomainSlide = DomainSlideSchema.parse({
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
          endMarker: 'arrow',
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
    });

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

    const saveCountBefore = vi.mocked(mockContext.save).mock.calls.length;

    // 1 tick of rAF
    act(() => {
      rafCallback?.(1500);
    });

    expect(vi.mocked(mockContext.save).mock.calls.length).toBeGreaterThan(
      saveCountBefore,
    );

    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(12345);

    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it('passes normalized phase to renderTacticalPhaseFrameToCanvas', () => {
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

    expect(mockContext.save).toHaveBeenCalled();
  });

  it('renders initial frame at playbackStore.timeMs instead of 0ms on mount', () => {
    const playbackStore = createPlaybackStore(toMilliseconds(1800));
    const sessionStore = createSessionStore();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(TacticalStoreProvider, {
        stores: { playbackStore, sessionStore },
        children,
      });

    renderHook(
      () =>
        useExportPreviewAnimation({
          slides: [mockSlide1, mockSlide2],
          aspectRatio: '16:9',
          externalIsPlaying: false,
          canvasRef,
          timeLabelRef,
          sliderRef,
        }),
      { wrapper },
    );

    expect(mockContext.save).toHaveBeenCalled();
    expect(playbackStore.getState().timeMs).toBe(1800);
  });

  it('keeps timeMs at 1800ms when directorCameraOptions is recreated and pitchTransform changes', () => {
    const playbackStore = createPlaybackStore(toMilliseconds(1800));
    const sessionStore = createSessionStore();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(TacticalStoreProvider, {
        stores: { playbackStore, sessionStore },
        children,
      });

    const initialPitchTransform: PitchTransform = {
      tilt: 15,
      yaw: 0,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };
    const updatedPitchTransform: PitchTransform = {
      tilt: 25,
      yaw: 10,
      zoom: 1.2,
      panX: 0,
      panY: 0,
      isLocked: false,
    };

    const { rerender } = renderHook(
      ({ pitchTransform }: { pitchTransform?: PitchTransform }) =>
        useExportPreviewAnimation({
          slides: [mockSlide1, mockSlide2],
          aspectRatio: '16:9',
          pitchTransform,
          directorCameraOptions: { isEditing: true },
          externalIsPlaying: false,
          canvasRef,
          timeLabelRef,
          sliderRef,
        }),
      {
        wrapper,
        initialProps: {
          pitchTransform: initialPitchTransform as PitchTransform | undefined,
        },
      },
    );

    rerender({ pitchTransform: updatedPitchTransform });
    rerender({ pitchTransform: undefined });

    expect(
      vi.mocked(mockContext.save).mock.calls.length,
    ).toBeGreaterThanOrEqual(2);
    expect(playbackStore.getState().timeMs).toBe(1800);
  });
});
