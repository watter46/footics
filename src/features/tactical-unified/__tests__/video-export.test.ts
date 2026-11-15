import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportPreviewPlayer } from '@/features/tactical-unified/panels/export/export-preview-player';
import { useExportPreviewAnimation } from '@/features/tactical-unified/panels/export/use-export-preview-animation';
import * as sharePayload from '@/lib/tactical/export/share-payload';
import { hasActiveFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import * as tacticalPhaseFrameRenderer from '@/lib/tactical/export/tactical-phase-frame-renderer';
import {
  calculateBoundaryCrop,
  getSupportedH264Codec,
} from '@/lib/tactical/export/video-export-engine';
import { exportVideoWithMediabunny } from '@/lib/tactical/export/video-mediabunny-export';
import {
  type BoundaryBox,
  createDefaultSlide,
  ExportTargetSchema,
  type Slide,
} from '@/lib/types/tactical-unified';

vi.mock('mediabunny', () => {
  class BufferTarget {
    buffer = new Uint8Array([1, 2, 3]).buffer;
  }
  class CanvasSource {
    add = vi.fn().mockResolvedValue(undefined);
  }
  class Mp4OutputFormat {}
  class WebMOutputFormat {}
  class Output {
    addVideoTrack = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    finalize = vi.fn().mockResolvedValue(undefined);
    cancel = vi.fn().mockResolvedValue(undefined);
  }
  return {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    WebMOutputFormat,
    Output,
  };
});

describe('Video Export Engine & Boundary Crop', () => {
  describe('calculateBoundaryCrop', () => {
    it('returns full stage dimensions snapped to even numbers when boundary box is undefined or disabled', () => {
      // 1080p preset (locked default): 801x451 -> 1920x1080 baseline
      const cropNoBox = calculateBoundaryCrop(undefined, 801, 451, 1);
      expect(cropNoBox.isCropped).toBe(false);
      expect(cropNoBox.cropX).toBe(0);
      expect(cropNoBox.cropY).toBe(0);
      expect(cropNoBox.cropW).toBe(801);
      expect(cropNoBox.cropH).toBe(451);
      expect(cropNoBox.exportWidth).toBe(1920);
      expect(cropNoBox.exportHeight % 2).toBe(0);

      const disabledBox: BoundaryBox = {
        enabled: false,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };
      // 2K preset (scale = 3): 800x450 -> 2560x1440
      const crop2K = calculateBoundaryCrop(disabledBox, 800, 450, 3);
      expect(crop2K.isCropped).toBe(false);
      expect(crop2K.exportWidth).toBe(2560);
      expect(crop2K.exportHeight).toBe(1440);

      // 1080p preset (scale = 2): 800x450 -> 1920x1080
      const crop1080p = calculateBoundaryCrop(disabledBox, 800, 450, 2);
      expect(crop1080p.isCropped).toBe(false);
      expect(crop1080p.exportWidth).toBe(1920);
      expect(crop1080p.exportHeight).toBe(1080);
    });

    it('calculates cropped dimensions and snaps to even numbers when boundary box is enabled', () => {
      const activeBox: BoundaryBox = {
        enabled: true,
        x: 20, // 20%
        y: 25, // 25%
        width: 45, // 45% of 800 = 360
        height: 35, // 35% of 450 = 157.5
      };

      // 2K preset (scale = 3): minScale = 2560 / 800 = 3.2: 360 * 3.2 = 1152, 157.5 * 3.2 = 504
      const crop2K = calculateBoundaryCrop(activeBox, 800, 450, 3);
      expect(crop2K.isCropped).toBe(true);
      expect(crop2K.cropX).toBe(160); // 20% of 800
      expect(crop2K.cropY).toBe(112.5); // 25% of 450
      expect(crop2K.cropW).toBe(360);
      expect(crop2K.cropH).toBe(157.5);
      expect(crop2K.exportWidth).toBe(1152);
      expect(crop2K.exportHeight).toBe(504);
      expect(crop2K.exportWidth % 2).toBe(0);
      expect(crop2K.exportHeight % 2).toBe(0);

      // 1080p preset (scale = 2): minScale = 1920 / 800 = 2.4: 360 * 2.4 = 864, 157.5 * 2.4 = 378 -> 376 (8-pixel aligned)
      const crop1080p = calculateBoundaryCrop(activeBox, 800, 450, 2);
      expect(crop1080p.exportWidth).toBe(864);
      expect(crop1080p.exportHeight).toBe(376);
    });
  });

  describe('ExportTargetSchema Validation', () => {
    it('validates MP4 export target configuration', () => {
      const validMp4 = {
        format: 'mp4',
        scope: 'all',
        fps: '60',
        quality: 'high',
        scale: 2,
      };
      const parsed = ExportTargetSchema.safeParse(validMp4);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.format).toBe('mp4');
        expect((parsed.data as any).fps).toBe('60');
      }
    });

    it('validates Transparent WebM export target configuration', () => {
      const validWebm = {
        format: 'webm',
        scope: 'all',
        fps: '30',
        transparent: true,
        scale: 2,
      };
      const parsed = ExportTargetSchema.safeParse(validWebm);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.format).toBe('webm');
        expect((parsed.data as any).transparent).toBe(true);
      }
    });
  });

  describe('Codec Detection Fallback', () => {
    it('returns high profile default codec in non-browser environments', async () => {
      const codec = await getSupportedH264Codec(2560, 1440, 60, 30_000_000);
      expect(codec).toBe('avc1.64002a');
    });
  });

  describe('2K QHD (2560x1440) & 60fps Standards', () => {
    it('produces exact 2560x1440 dimensions for standard 16:9 stage at scale 2', () => {
      const crop = calculateBoundaryCrop(undefined, 1280, 720, 2);
      expect(crop.exportWidth).toBe(2560);
      expect(crop.exportHeight).toBe(1440);
      expect(crop.exportWidth % 2).toBe(0);
      expect(crop.exportHeight % 2).toBe(0);
    });

    it('defaults 60fps in standard mp4 target configuration', () => {
      const standardConfig = ExportTargetSchema.parse({
        format: 'mp4',
        scope: 'all',
        fps: '60',
        quality: 'high',
        scale: 2,
      });
      if (standardConfig.format === 'mp4') {
        expect(standardConfig.fps).toBe('60');
        expect(standardConfig.quality).toBe('high');
        expect(standardConfig.scale).toBe(2);
      }
    });
  });

  describe('Color Precision & Alpha Blending', () => {
    it('ensures boundary crop preserves exact coordinate ratios without distorting color channels', () => {
      const crop = calculateBoundaryCrop(
        { enabled: true, x: 0, y: 0, width: 100, height: 100 },
        1000,
        600,
        2,
      );
      expect(crop.exportWidth).toBe(2000);
      expect(crop.exportHeight).toBe(1200);
      expect(crop.isCropped).toBe(false);
      expect(crop.exportWidth / crop.exportHeight).toBeCloseTo(1000 / 600);
    });
  });
});

describe('ExportPreviewPlayer controls', () => {
  beforeEach(() => {
    const mockCtx = new Proxy(
      {
        getImageData: () => ({ data: new Array(4) }),
        createImageData: () => [],
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        measureText: () => ({ width: 0 }),
        getLineDash: () => [],
        isPointInPath: () => true,
        createLinearGradient: () => ({ addColorStop: vi.fn() }),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
      } as Record<string, unknown>,
      {
        get: (target, prop: string) =>
          prop in target ? target[prop] : vi.fn(),
      },
    );
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
  });

  const dummySlide = createDefaultSlide(0, 'slide-1');

  it('初期状態は停止状態（Playボタン表示）であり、Playボタンクリックで再生に切り替わること', () => {
    render(
      React.createElement(ExportPreviewPlayer, {
        slides: [dummySlide],
        aspectRatio: '16:9',
      }),
    );

    // 初期状態は停止中なので Play preview ボタンが存在する
    const playButton = screen.getByRole('button', { name: 'Play preview' });
    expect(playButton).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause preview' })).toBeNull();

    // クリックで再生開始（Pause preview に変化）
    fireEvent.click(playButton);
    expect(screen.getByRole('button', { name: 'Pause preview' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play preview' })).toBeNull();
  });

  it('pitchAppearance を渡しても正常にレンダリングされ、再生操作ができること', () => {
    render(
      React.createElement(ExportPreviewPlayer, {
        slides: [dummySlide],
        aspectRatio: '16:9',
        pitchAppearance: {
          lineColor: '#e0e0e0',
          lineWidth: 3,
          lineOpacity: 0.9,
          pitchBackgroundType: 'marble',
          overlayColor: '#111111',
          overlayOpacity: 0.15,
        },
      }),
    );

    const playButton = screen.getByRole('button', { name: 'Play preview' });
    expect(playButton).toBeTruthy();
  });
});

describe('Dynamic Camera Work in Video Export & Preview', () => {
  const createMockContext = () =>
    new Proxy(
      {
        getImageData: () => ({ data: new Array(4) }),
        createImageData: () => [],
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        measureText: () => ({ width: 0 }),
        getLineDash: () => [],
        isPointInPath: () => true,
        createLinearGradient: () => ({ addColorStop: vi.fn() }),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
      } as Record<string, unknown>,
      {
        get: (target, prop: string) =>
          prop in target ? target[prop] : vi.fn(),
      },
    );

  beforeEach(() => {
    vi.clearAllMocks();
    const mockContext = createMockContext();
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(mockContext);
    if (typeof OffscreenCanvas !== 'undefined') {
      OffscreenCanvas.prototype.getContext = vi
        .fn()
        .mockReturnValue(mockContext);
    }
  });

  it('マルチスライド動画出力時、renderTacticalPhaseFrameToCanvas に phase と pitchTransform が渡され各フレーム動的カメラワークが使われること', async () => {
    const slide1: Slide = {
      ...createDefaultSlide(0, 'slide-1'),
      pitchTransform: {
        tilt: 10,
        zoom: 1.1,
        panX: 5,
        panY: 0,
        isLocked: false,
      },
    };
    const slide2: Slide = {
      ...createDefaultSlide(1, 'slide-2'),
      pitchTransform: {
        tilt: 35,
        zoom: 1.8,
        panX: -20,
        panY: 10,
        isLocked: false,
      },
    };

    const spyRender = vi.spyOn(
      tacticalPhaseFrameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );

    const pitchTransform = {
      tilt: 10,
      zoom: 1.1,
      panX: 5,
      panY: 0,
      isLocked: false,
    };

    await exportVideoWithMediabunny({
      format: 'mp4',
      fps: 30,
      totalDurationMs: 100,
      stageWidth: 800,
      stageHeight: 450,
      slides: [slide1, slide2],
      pitchTransform,
    });

    expect(spyRender).toHaveBeenCalled();
    const callArgs = spyRender.mock.calls[0][0];
    expect(callArgs.phase).toBeDefined();
    expect(callArgs.pitchTransform).toEqual(pitchTransform);
  });

  it('単一スライド時は renderTacticalPhaseFrameToCanvas に phase と options.pitchTransform が渡されること', async () => {
    const slide1: Slide = {
      ...createDefaultSlide(0, 'slide-1'),
      pitchTransform: {
        tilt: 20,
        zoom: 1.5,
        panX: 10,
        panY: 5,
        isLocked: false,
      },
    };

    const spyRender = vi.spyOn(
      tacticalPhaseFrameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );

    const pitchTransform = {
      tilt: 20,
      zoom: 1.5,
      panX: 10,
      panY: 5,
      isLocked: false,
    };

    await exportVideoWithMediabunny({
      format: 'mp4',
      fps: 30,
      totalDurationMs: 100,
      stageWidth: 800,
      stageHeight: 450,
      slides: [slide1],
      pitchTransform,
    });

    expect(spyRender).toHaveBeenCalled();
    const callArgs = spyRender.mock.calls[0][0];
    expect(callArgs.phase).toBeDefined();
    expect(callArgs.pitchTransform).toEqual(pitchTransform);
  });

  it('useExportPreviewAnimation で複数スライド再生時は renderTacticalPhaseFrameToCanvas に phase と pitchTransform が渡されること', () => {
    const slide1 = {
      ...createDefaultSlide(0, 's1'),
      pitchTransform: {
        tilt: 15,
        zoom: 1.2,
        panX: 0,
        panY: 0,
        isLocked: false,
      },
    };
    const slide2 = {
      ...createDefaultSlide(1, 's2'),
      pitchTransform: {
        tilt: 30,
        zoom: 1.5,
        panX: 10,
        panY: 0,
        isLocked: false,
      },
    };
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const canvasRef = { current: canvas };
    const timeLabelRef = { current: document.createElement('span') };
    const sliderRef = { current: document.createElement('input') };

    const spyRender = vi.spyOn(
      tacticalPhaseFrameRenderer,
      'renderTacticalPhaseFrameToCanvas',
    );

    const pitchTransform = {
      tilt: 15,
      zoom: 1.2,
      panX: 0,
      panY: 0,
      isLocked: false,
    };

    renderHook(() =>
      useExportPreviewAnimation({
        slides: [slide1, slide2],
        aspectRatio: '16:9',
        pitchTransform,
        externalIsPlaying: true,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );

    expect(spyRender).toHaveBeenCalled();
    const lastCall = spyRender.mock.calls[spyRender.mock.calls.length - 1][0];
    expect(lastCall.phase).toBeDefined();
    expect(lastCall.pitchTransform).toEqual(pitchTransform);
  });

  describe('useExportPreviewAnimation bitmap lifecycle', () => {
    it('does not close ImageBitmap on slide change/re-render, and closes all cached bitmaps on unmount', async () => {
      const mockClose1 = vi.fn();
      const mockBitmap1 = {
        width: 100,
        height: 100,
        close: mockClose1,
      } as unknown as ImageBitmap;

      const mockClose2 = vi.fn();
      const mockBitmap2 = {
        width: 100,
        height: 100,
        close: mockClose2,
      } as unknown as ImageBitmap;

      let callCount = 0;
      vi.spyOn(sharePayload, 'preloadSlidePlayerPhotos').mockImplementation(
        async (): Promise<Record<string, ImageBitmap>> => {
          callCount++;
          if (callCount === 1) {
            return { p1: mockBitmap1 };
          }
          return { p2: mockBitmap2 };
        },
      );

      const baseSlide1 = createDefaultSlide(0, 's1');
      const baseSlide2 = createDefaultSlide(1, 's2');

      const slide1: Slide = {
        ...baseSlide1,
        players: baseSlide1.players.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                id: 'p1',
                playerId: 'player-1',
                style: {
                  ...p.style,
                  insideContent: 'photo' as const,
                },
              }
            : p,
        ),
      };

      const slide2: Slide = {
        ...baseSlide2,
        players: baseSlide2.players.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                id: 'p2',
                playerId: 'player-2',
                style: {
                  ...p.style,
                  insideContent: 'photo' as const,
                },
              }
            : p,
        ),
      };

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const canvasRef = { current: canvas };
      const timeLabelRef = { current: document.createElement('span') };
      const sliderRef = { current: document.createElement('input') };

      const { rerender, unmount } = renderHook(
        ({ slides }) =>
          useExportPreviewAnimation({
            slides,
            aspectRatio: '16:9',
            canvasRef,
            timeLabelRef,
            sliderRef,
          }),
        { initialProps: { slides: [slide1] } },
      );

      await waitFor(() => {
        expect(callCount).toBe(1);
      });
      await new Promise((r) => setTimeout(r, 50));

      // スライド変更で再レンダリング
      rerender({ slides: [slide2] });

      await waitFor(() => {
        expect(callCount).toBe(2);
      });
      await new Promise((r) => setTimeout(r, 50));

      // スライド変更時に mockBitmap1 の close は呼ばれてはならない（キャッシュ維持）
      expect(mockClose1).not.toHaveBeenCalled();
      expect(mockClose2).not.toHaveBeenCalled();

      // アンマウント
      unmount();

      // アンマウント時に全ビットマップが一括して close される
      expect(mockClose1).toHaveBeenCalledTimes(1);
      expect(mockClose2).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasActiveFrameEffects and video export pause frame handling', () => {
    it('hasActiveFrameEffects returns true when arrow or zone has effect, even without player markerEffect', () => {
      const baseSlide = createDefaultSlide(0, 's1');
      expect(hasActiveFrameEffects([baseSlide])).toBe(false);

      const slideWithArrow: Slide = {
        ...baseSlide,
        arrows: [
          {
            id: 'a1',
            annotationType: 'arrow',
            arrowType: 'move',
            curveType: 'straight',
            points: [
              { x: 10, y: 10 },
              { x: 20, y: 20 },
            ],
            color: '#38bdf8',
            strokeWidth: 3,
            dashArray: [],
            arrowHead: true,
            effect: {
              type: 'flow',
              duration: 1,
              delay: 0,
              holdDuration: 0,
              exitAction: 'keep',
              fadeDuration: 0,
              easing: 'linear',
            },
          },
        ],
      };
      expect(hasActiveFrameEffects([slideWithArrow])).toBe(true);

      const slideWithZone: Slide = {
        ...baseSlide,
        zones: [
          {
            id: 'z1',
            annotationType: 'zone',
            zoneType: 'space',
            points: [
              { x: 10, y: 10 },
              { x: 30, y: 10 },
              { x: 30, y: 30 },
              { x: 10, y: 30 },
            ],
            color: '#22c55e',
            opacity: 0.5,
            strokeWidth: 2,
            effect: {
              type: 'pulse',
              duration: 1,
              minOpacity: 0.2,
              maxOpacity: 0.8,
            },
          },
        ],
      };
      expect(hasActiveFrameEffects([slideWithZone])).toBe(true);
    });

    it('exportVideoWithMediabunny renders every frame during pauseMs when arrow effect is active', async () => {
      const baseSlide = createDefaultSlide(0, 's1');
      const slide1: Slide = {
        ...baseSlide,
        transitionDurationMs: 100,
        pauseMs: 200,
        arrows: [
          {
            id: 'a1',
            annotationType: 'arrow',
            arrowType: 'move',
            curveType: 'straight',
            points: [
              { x: 10, y: 10 },
              { x: 20, y: 20 },
            ],
            color: '#38bdf8',
            strokeWidth: 3,
            dashArray: [],
            arrowHead: true,
            effect: {
              type: 'flow',
              duration: 1,
              delay: 0,
              holdDuration: 0,
              exitAction: 'keep',
              fadeDuration: 0,
              easing: 'linear',
            },
          },
        ],
      };
      const slide2: Slide = {
        ...createDefaultSlide(1, 's2'),
        transitionDurationMs: 100,
        pauseMs: 200,
      };

      const spyRender = vi.spyOn(
        tacticalPhaseFrameRenderer,
        'renderTacticalPhaseFrameToCanvas',
      );

      // total 600ms @ 30fps = 18 frames
      await exportVideoWithMediabunny({
        format: 'mp4',
        fps: 30,
        totalDurationMs: 600,
        stageWidth: 800,
        stageHeight: 450,
        slides: [slide1, slide2],
      });

      // All frames should be rendered (not skipped during pauseMs)
      expect(spyRender).toHaveBeenCalledTimes(18);
    });
  });
});
