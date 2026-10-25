import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportPngBlob } from '@/features/tactical-unified/hooks/konva-export-helpers';
import type { Slide } from '@/lib/types/tactical-unified';
import {
  type AnyCanvasRenderingContext2D,
  renderTacticalFrameToCanvas,
} from '../export/tactical-frame-renderer';
import {
  calculateBoundaryCrop,
  createVideoExportWorker,
  exportTacticalVideo,
  exportVideoDirect,
  exportVideoWithMediabunny,
  getSupportedH264Codec,
  getSupportedH264EncoderConfig,
  getSupportedVP9Codec,
  getSupportedVP9EncoderConfig,
} from '../export/video-export-engine';

vi.mock('mediabunny', () => {
  class MockBufferTarget {
    buffer: ArrayBuffer | null = null;
  }

  class MockOutput {
    options: any;
    tracks: any[] = [];
    state = 'pending';

    constructor(options: any) {
      this.options = options;
    }

    addVideoTrack(track: any) {
      this.tracks.push(track);
      return track;
    }

    async start() {
      this.state = 'started';
      return Promise.resolve();
    }

    async finalize() {
      this.state = 'finalized';
      this.options.target.buffer = new Uint8Array([0, 1, 2, 3]).buffer;
      return Promise.resolve();
    }

    async cancel() {
      this.state = 'canceled';
      return Promise.resolve();
    }
  }

  class MockCanvasSource {
    canvas: any;
    config: any;
    frames: Array<{ timestamp: number; duration?: number }> = [];

    constructor(canvas: any, config: any) {
      this.canvas = canvas;
      this.config = config;
    }

    async add(timestamp: number, duration?: number) {
      this.frames.push({ timestamp, duration });
      return Promise.resolve();
    }
  }

  class MockMp4OutputFormat {}
  class MockWebMOutputFormat {}

  return {
    BufferTarget: MockBufferTarget,
    Output: MockOutput,
    CanvasSource: MockCanvasSource,
    Mp4OutputFormat: MockMp4OutputFormat,
    WebMOutputFormat: MockWebMOutputFormat,
  };
});

describe('video-export-engine & pipeline', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => {
        return createMockCanvasContext() as unknown as RenderingContext;
      },
    );
    if (typeof OffscreenCanvas !== 'undefined') {
      vi.spyOn(OffscreenCanvas.prototype, 'getContext').mockImplementation(
        () => {
          return createMockCanvasContext() as unknown as OffscreenCanvasRenderingContext2D;
        },
      );
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateBoundaryCrop', () => {
    it('returns full stage dimensions snapped to even numbers when boundary box is disabled', () => {
      const crop = calculateBoundaryCrop(null, 2560, 1440, 1);
      expect(crop.isCropped).toBe(false);
      expect(crop.exportWidth).toBe(2560);
      expect(crop.exportHeight).toBe(1440);
      expect(crop.exportWidth % 2).toBe(0);
      expect(crop.exportHeight % 2).toBe(0);
    });

    it('calculates cropped dimensions and snaps odd numbers to even integers', () => {
      const crop = calculateBoundaryCrop(
        {
          enabled: true,
          x: 10,
          y: 20,
          width: 50,
          height: 33,
        },
        2560,
        1441,
        1,
      );

      expect(crop.isCropped).toBe(true);
      expect(crop.cropX).toBe(256);
      expect(crop.exportWidth % 2).toBe(0);
      expect(crop.exportHeight % 2).toBe(0);
      expect(crop.exportHeight).toBe(480);
    });

    it('enforces minimum dimension safeguard of 64px even', () => {
      const crop = calculateBoundaryCrop(
        {
          enabled: true,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
        100,
        100,
        1,
      );
      expect(crop.exportWidth).toBe(64);
      expect(crop.exportHeight).toBe(64);
    });

    it('maintains 4:5 aspect ratio dimensions without stretching to 9:16', () => {
      // 4:5 with stageWidth=1080, stageHeight=1350, scale=2
      const crop = calculateBoundaryCrop(null, 1080, 1350, 2);
      expect(crop.exportWidth).toBe(2160);
      expect(crop.exportHeight).toBe(2704);
      expect(crop.exportWidth / crop.exportHeight).toBeCloseTo(4 / 5, 2);

      // small stage 540x675: baseline guarantees 720x904 (snapped to 8px) for scale=1, 1080x1352 for scale=1.5, 1440x1800 for scale=2.5
      const cropSmall1 = calculateBoundaryCrop(null, 540, 675, 1);
      expect(cropSmall1.exportWidth).toBe(720);
      expect(cropSmall1.exportHeight).toBe(904);

      const cropSmall15 = calculateBoundaryCrop(null, 540, 675, 1.5);
      expect(cropSmall15.exportWidth).toBe(1080);
      expect(cropSmall15.exportHeight).toBe(1352);

      const cropSmall25 = calculateBoundaryCrop(null, 540, 675, 2.5);
      expect(cropSmall25.exportWidth).toBe(1440);
      expect(cropSmall25.exportHeight).toBe(1800);
    });
  });

  describe('getSupportedH264EncoderConfig', () => {
    it('returns null in non-browser or non-WebCodecs environment', async () => {
      const config = await getSupportedH264EncoderConfig(
        1920,
        1080,
        60,
        16_000_000,
      );
      expect(config).toBeNull();
    });

    it('prioritizes prefer-hardware acceleration when VideoEncoder is available', async () => {
      const mockIsConfigSupported = vi
        .fn()
        .mockImplementation((cfg: VideoEncoderConfig) => {
          if (cfg.hardwareAcceleration === 'prefer-hardware') {
            return Promise.resolve({ supported: true, config: cfg });
          }
          return Promise.resolve({ supported: false });
        });

      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder = {
        isConfigSupported: mockIsConfigSupported,
      };

      const result = await getSupportedH264EncoderConfig(
        1920,
        1080,
        60,
        16_000_000,
      );

      expect(result).not.toBeNull();
      expect(result?.hardwareAcceleration).toBe('prefer-hardware');
      expect(result?.latencyMode).toBe('quality');
      expect(result?.bitrateMode).toBe('variable');

      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
    });

    it('returns default fallback codec string when WebCodecs is not supported', async () => {
      const codec = await getSupportedH264Codec(1920, 1080, 60, 16_000_000);
      expect(codec).toBe('avc1.64002a');
    });
  });

  describe('getSupportedVP9EncoderConfig', () => {
    it('returns null when VideoEncoder is not available', async () => {
      delete (globalThis as any).VideoEncoder;
      const config = await getSupportedVP9EncoderConfig(
        1920,
        1080,
        60,
        16_000_000,
        true,
      );
      expect(config).toBeNull();
    });

    it('detects VP9 encoder configuration and preserves alpha: keep when requested', async () => {
      const mockIsConfigSupported = vi
        .fn()
        .mockImplementation((cfg: VideoEncoderConfig) => {
          if (cfg.hardwareAcceleration === 'prefer-hardware') {
            return Promise.resolve({ supported: true, config: cfg });
          }
          return Promise.resolve({ supported: false });
        });

      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder = {
        isConfigSupported: mockIsConfigSupported,
      };

      const result = await getSupportedVP9EncoderConfig(
        1920,
        1080,
        60,
        16_000_000,
        true,
      );

      expect(result).not.toBeNull();
      expect(result?.alpha).toBe('keep');
      expect(result?.hardwareAcceleration).toBe('prefer-hardware');

      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
    });

    it('returns fallback VP9 codec string when WebCodecs is not present', async () => {
      const codec = await getSupportedVP9Codec(
        1920,
        1080,
        60,
        16_000_000,
        true,
      );
      expect(codec).toBe('vp09.00.10.08');
    });
  });

  describe('renderTacticalFrameToCanvas', () => {
    const mockSlide: Slide = {
      id: 'slide-1',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'ease-in-out',
      players: [
        {
          id: 'p-1',
          name: 'Palmer',
          shirtNo: '20',
          team: 'home',
          area: 'pitch',
          x: 45,
          y: 40,
          style: {
            markerType: 'circle',
            insideContent: 'number',
            bottomLabel: 'name',
            color: '#2563eb',
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
      ball: {
        x: 46,
        y: 41,
        visible: true,
      },
      arrows: [
        {
          id: 'a-1',
          annotationType: 'arrow',
          arrowType: 'run',
          curveType: 'straight',
          points: [
            { x: 45, y: 40 },
            { x: 55, y: 30 },
          ],
          color: '#38bdf8',
          strokeWidth: 2,
          dashArray: [],
          arrowHead: true,
        },
      ],
      zones: [
        {
          id: 'z-1',
          label: 'Half Space',
          annotationType: 'zone',
          zoneType: 'space',
          shapeType: 'rect',
          x: 30,
          y: 20,
          width: 25,
          height: 30,
          points: [],
          color: '#22c55e',
          opacity: 0.3,
          strokeWidth: 2,
        },
      ],
      texts: [
        {
          id: 't-1',
          annotationType: 'text',
          content: 'Key Space',
          x: 32,
          y: 22,
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ],
    };

    it('renders tactical frame onto 2D canvas context without errors in 16:9 and 9:16', () => {
      const ctx = createMockCanvasContext();

      // 16:9 Opaque
      expect(() => {
        renderTacticalFrameToCanvas(ctx, {
          slides: [mockSlide],
          timeMs: 500,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          transparent: false,
        });
      }).not.toThrow();

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();

      // 9:16 Transparent with Boundary Box
      const transparentCtx = createMockCanvasContext();
      expect(() => {
        renderTacticalFrameToCanvas(transparentCtx, {
          slides: [mockSlide],
          timeMs: 500,
          width: 1080,
          height: 1920,
          aspectRatio: '9:16',
          boundaryBox: {
            enabled: true,
            x: 20,
            y: 20,
            width: 60,
            height: 60,
          },
          transparent: true,
        });
      }).not.toThrow();
      expect(transparentCtx.clearRect).toHaveBeenCalledWith(0, 0, 1080, 1920);
    });

    describe('Mediabunny Pipeline & Backward Compatibility', () => {
      const mockSlideItem: Slide = {
        id: 'slide-1',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        easing: 'ease-in-out',
        players: [],
        ball: { x: 46, y: 41, visible: true },
        arrows: [],
        zones: [],
        texts: [],
      };

      describe('createVideoExportWorker', () => {
        it('returns null safely without throwing', () => {
          const worker = createVideoExportWorker();
          expect(worker).toBeNull();
        });
      });

      describe('exportVideoDirect', () => {
        it('throws error when slides are empty in exportVideoDirect', async () => {
          await expect(
            exportVideoDirect({
              format: 'mp4',
              fps: 30,
              totalDurationMs: 1000,
              stageWidth: 1920,
              stageHeight: 1080,
              slides: [],
            }),
          ).rejects.toThrow(
            'Slides data is required for Web Worker video export.',
          );
        });

        it('executes direct Mediabunny pipeline and generates MP4 Blob', async () => {
          const progressEvents: number[] = [];
          const blob = await exportVideoDirect({
            format: 'mp4',
            fps: 30,
            scale: 1,
            quality: 'high',
            totalDurationMs: 300,
            stageWidth: 1920,
            stageHeight: 1080,
            slides: [mockSlideItem],
            aspectRatio: '16:9',
            onProgress: (p) => progressEvents.push(p.percent),
          });

          expect(blob).toBeInstanceOf(Blob);
          expect(blob.type).toBe('video/mp4');
          expect(progressEvents.length).toBeGreaterThan(0);
        });

        it('exportTacticalVideo outputs video via Mediabunny', async () => {
          const blob = await exportTacticalVideo({
            format: 'mp4',
            fps: 30,
            scale: 1,
            quality: 'high',
            totalDurationMs: 300,
            stageWidth: 1920,
            stageHeight: 1080,
            slides: [mockSlideItem],
            aspectRatio: '16:9',
          });

          expect(blob).toBeInstanceOf(Blob);
          expect(blob.type).toBe('video/mp4');
        });

        it('cancels video export immediately when checkCancelled returns true', async () => {
          await expect(
            exportVideoDirect({
              format: 'mp4',
              fps: 30,
              scale: 1,
              quality: 'high',
              totalDurationMs: 1000,
              stageWidth: 1920,
              stageHeight: 1080,
              slides: [mockSlideItem],
              aspectRatio: '16:9',
              checkCancelled: () => true,
            }),
          ).rejects.toThrow('Export cancelled');
        });
      });
    });
  });

  describe('Phase 4: Mediabunny Video Export & stage.toBlob Static Export', () => {
    it('exports mp4 video using Mediabunny Output and CanvasSource', async () => {
      const mockSlide: Slide = {
        id: 'slide-1',
        index: 0,
        transitionDurationMs: 500,
        pauseMs: 200,
        easing: 'ease-in-out',
        players: [],
        ball: { x: 50, y: 50, visible: true },
        arrows: [],
        zones: [],
        texts: [],
      };

      const blob = await exportVideoWithMediabunny({
        format: 'mp4',
        fps: 30,
        scale: 1,
        totalDurationMs: 300,
        stageWidth: 1280,
        stageHeight: 720,
        slides: [mockSlide],
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('video/mp4');
    });

    it('exports webm video using Mediabunny Output and CanvasSource', async () => {
      const mockSlide: Slide = {
        id: 'slide-1',
        index: 0,
        transitionDurationMs: 500,
        pauseMs: 200,
        easing: 'ease-in-out',
        players: [],
        ball: { x: 50, y: 50, visible: true },
        arrows: [],
        zones: [],
        texts: [],
      };

      const blob = await exportVideoWithMediabunny({
        format: 'webm',
        fps: 30,
        scale: 1,
        totalDurationMs: 300,
        stageWidth: 1280,
        stageHeight: 720,
        slides: [mockSlide],
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('video/webm');
    });

    it('exports png blob using exportPngBlob helper', async () => {
      const dummyBlob = new Blob(['dummy-image'], { type: 'image/png' });
      const mockStage = {
        width: () => 1280,
        height: () => 720,
        toBlob: vi.fn(
          ({ callback }: { callback: (b: Blob | null) => void }) => {
            callback(dummyBlob);
          },
        ),
      } as unknown as Parameters<typeof exportPngBlob>[0];

      const blob = await exportPngBlob(mockStage);
      expect(blob).toBe(dummyBlob);
      expect(mockStage.toBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: 'image/png',
          pixelRatio: 2,
        }),
      );
    });

    it('exports cropped png blob with boundary box', async () => {
      const dummyBlob = new Blob(['dummy-crop'], { type: 'image/png' });
      const mockStage = {
        width: () => 1000,
        height: () => 1000,
        toBlob: vi.fn(
          ({ callback }: { callback: (b: Blob | null) => void }) => {
            callback(dummyBlob);
          },
        ),
      } as unknown as Parameters<typeof exportPngBlob>[0];

      const blob = await exportPngBlob(mockStage, {
        crop: true,
        boundaryBox: {
          enabled: true,
          x: 10,
          y: 10,
          width: 50,
          height: 50,
        },
      });

      expect(blob).toBe(dummyBlob);
      expect(mockStage.toBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 100,
          width: 500,
          height: 500,
          mimeType: 'image/png',
          pixelRatio: 2,
        }),
      );
    });
  });
});

function createMockCanvasContext(): AnyCanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  } as unknown as AnyCanvasRenderingContext2D;
}
