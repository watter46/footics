import { describe, expect, it, vi } from 'vitest';
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
  getSupportedH264Codec,
  getSupportedH264EncoderConfig,
  getSupportedVP9Codec,
  getSupportedVP9EncoderConfig,
} from '../export/video-export-engine';
import {
  calculateWorkerBoundaryCrop,
  executeOffThreadVideoExport,
  getWorkerH264EncoderConfig,
  getWorkerVP9EncoderConfig,
} from '../export/video-export-worker';

describe('video-export-engine & worker pipeline', () => {
  describe('calculateBoundaryCrop & calculateWorkerBoundaryCrop', () => {
    it('returns full stage dimensions snapped to even numbers when boundary box is disabled', () => {
      const crop = calculateBoundaryCrop(null, 2560, 1440, 1);
      expect(crop.isCropped).toBe(false);
      expect(crop.exportWidth).toBe(2560);
      expect(crop.exportHeight).toBe(1440);
      expect(crop.exportWidth % 2).toBe(0);
      expect(crop.exportHeight % 2).toBe(0);

      const workerCrop = calculateWorkerBoundaryCrop(null, 2560, 1440, 1);
      expect(workerCrop.exportWidth).toBe(2560);
      expect(workerCrop.exportHeight).toBe(1440);
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

      const workerCrop = calculateWorkerBoundaryCrop(
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
      expect(workerCrop.exportHeight).toBe(480);
      expect(workerCrop.isCropped).toBe(true);
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
  });

  describe('getSupportedH264EncoderConfig & getWorkerH264EncoderConfig', () => {
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

      const workerResult = await getWorkerH264EncoderConfig(
        1920,
        1080,
        60,
        16_000_000,
      );
      expect(workerResult).not.toBeNull();
      expect(workerResult?.hardwareAcceleration).toBe('prefer-hardware');
      expect(workerResult?.latencyMode).toBe('quality');

      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
    });

    it('returns default fallback codec string when WebCodecs is not supported', async () => {
      const codec = await getSupportedH264Codec(1920, 1080, 60, 16_000_000);
      expect(codec).toBe('avc1.64002a');
    });
  });

  describe('getSupportedVP9EncoderConfig & getWorkerVP9EncoderConfig', () => {
    it('returns null when VideoEncoder is not available', async () => {
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

      const workerResult = await getWorkerVP9EncoderConfig(
        1920,
        1080,
        60,
        16_000_000,
        true,
      );
      expect(workerResult?.alpha).toBe('keep');

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

  describe('executeOffThreadVideoExport', () => {
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
      arrows: [],
      zones: [],
      texts: [],
    };

    class MockEncodedVideoChunk {
      type: EncodedVideoChunkType;
      timestamp: number;
      duration?: number;
      byteLength: number;
      data: Uint8Array;

      constructor(init: {
        type: EncodedVideoChunkType;
        timestamp: number;
        duration?: number;
        data: BufferSource;
      }) {
        this.type = init.type;
        this.timestamp = init.timestamp;
        this.duration = init.duration;
        this.data = new Uint8Array(init.data as ArrayBuffer);
        this.byteLength = this.data.byteLength;
      }

      copyTo(dest: BufferSource) {
        new Uint8Array(dest as ArrayBuffer).set(this.data);
      }
    }

    it('successfully renders and muxes MP4 video off-thread with mock WebCodecs', async () => {
      let encodedFramesCount = 0;

      class MockVideoEncoder {
        state: CodecState = 'unconfigured';
        encodeQueueSize = 0;
        outputCallback: (chunk: unknown, meta?: unknown) => void;
        errorCallback: (e: Error) => void;

        constructor(init: {
          output: (chunk: unknown, meta?: unknown) => void;
          error: (e: Error) => void;
        }) {
          this.outputCallback = init.output;
          this.errorCallback = init.error;
        }

        static isConfigSupported = vi.fn().mockResolvedValue({
          supported: true,
          config: {
            codec: 'avc1.4d002a',
            width: 1920,
            height: 1080,
            hardwareAcceleration: 'prefer-hardware',
          },
        });

        configure() {
          this.state = 'configured';
        }

        encode() {
          encodedFramesCount++;
          const dummyData = new Uint8Array(1024).fill(1);
          const chunk = new MockEncodedVideoChunk({
            type: 'key',
            timestamp: 0,
            duration: 16666,
            data: dummyData.buffer,
          });

          this.outputCallback(chunk, {
            decoderConfig: {
              codec: 'avc1.4d002a',
              description: new Uint8Array([0, 1, 2, 3]),
            },
          });
        }

        async flush() {
          return Promise.resolve();
        }

        close() {
          this.state = 'closed';
        }
      }

      class MockVideoFrame {
        timestamp: number;
        duration: number;
        constructor(
          _source: unknown,
          init: { timestamp: number; duration: number },
        ) {
          this.timestamp = init.timestamp;
          this.duration = init.duration;
        }
        close() {}
      }

      class MockOffscreenCanvas {
        width: number;
        height: number;
        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
        }
        getContext() {
          return createMockCanvasContext();
        }
      }

      (
        globalThis as unknown as { EncodedVideoChunk: unknown }
      ).EncodedVideoChunk = MockEncodedVideoChunk;
      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
        MockVideoEncoder;
      (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
        MockVideoFrame;
      (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
        MockOffscreenCanvas;

      const progressEvents: number[] = [];
      const result = await executeOffThreadVideoExport(
        {
          id: 'test-exp-1',
          type: 'START_EXPORT',
          format: 'mp4',
          fps: 30,
          scale: 1,
          quality: 'high',
          totalDurationMs: 500, // ~15 frames
          stageWidth: 1920,
          stageHeight: 1080,
          slides: [mockSlide],
          aspectRatio: '16:9',
        },
        (p) => progressEvents.push(p.percent),
      );

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('video/mp4');
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(encodedFramesCount).toBeGreaterThan(0);
      expect(progressEvents.length).toBeGreaterThan(0);

      delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
        .EncodedVideoChunk;
      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
      delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
      delete (globalThis as unknown as { OffscreenCanvas?: unknown })
        .OffscreenCanvas;
    });

    it('successfully renders and muxes VP9 WebM with transparency off-thread', async () => {
      let encodedFramesCount = 0;

      class MockVideoEncoder {
        state: CodecState = 'unconfigured';
        encodeQueueSize = 0;
        outputCallback: (chunk: unknown, meta?: unknown) => void;
        errorCallback: (e: Error) => void;

        constructor(init: {
          output: (chunk: unknown, meta?: unknown) => void;
          error: (e: Error) => void;
        }) {
          this.outputCallback = init.output;
          this.errorCallback = init.error;
        }

        static isConfigSupported = vi.fn().mockResolvedValue({
          supported: true,
          config: {
            codec: 'vp09.00.10.08',
            width: 1920,
            height: 1080,
            alpha: 'keep',
            hardwareAcceleration: 'prefer-hardware',
          },
        });

        configure() {
          this.state = 'configured';
        }

        encode() {
          encodedFramesCount++;
          const dummyData = new Uint8Array(1024).fill(1);
          const chunk = new MockEncodedVideoChunk({
            type: 'key',
            timestamp: 0,
            duration: 16666,
            data: dummyData.buffer,
          });

          this.outputCallback(chunk, {
            decoderConfig: {
              codec: 'vp09.00.10.08',
            },
          });
        }

        async flush() {
          return Promise.resolve();
        }

        close() {
          this.state = 'closed';
        }
      }

      class MockVideoFrame {
        timestamp: number;
        duration: number;
        constructor(
          _source: unknown,
          init: { timestamp: number; duration: number },
        ) {
          this.timestamp = init.timestamp;
          this.duration = init.duration;
        }
        close() {}
      }

      class MockOffscreenCanvas {
        width: number;
        height: number;
        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
        }
        getContext() {
          return createMockCanvasContext();
        }
      }

      (
        globalThis as unknown as { EncodedVideoChunk: unknown }
      ).EncodedVideoChunk = MockEncodedVideoChunk;
      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
        MockVideoEncoder;
      (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
        MockVideoFrame;
      (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
        MockOffscreenCanvas;

      const progressEvents: number[] = [];
      const result = await executeOffThreadVideoExport(
        {
          id: 'test-exp-2',
          type: 'START_EXPORT',
          format: 'webm',
          fps: 30,
          scale: 1,
          quality: 'high',
          transparent: true,
          totalDurationMs: 500,
          stageWidth: 1920,
          stageHeight: 1080,
          slides: [mockSlide],
          aspectRatio: '16:9',
        },
        (p) => progressEvents.push(p.percent),
      );

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('video/webm');
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(encodedFramesCount).toBeGreaterThan(0);

      delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
        .EncodedVideoChunk;
      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
      delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
      delete (globalThis as unknown as { OffscreenCanvas?: unknown })
        .OffscreenCanvas;
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
        expect(transparentCtx.clearRect).toHaveBeenCalledWith(0, 0, 1080, 1920);
      });
    });

    describe('AAWU 3-5-TURBO: Direct Turbo Engine & Robust Worker Pipeline', () => {
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
        arrows: [],
        zones: [],
        texts: [],
      };

      describe('createVideoExportWorker', () => {
        it('returns null safely in non-browser environment without throwing', () => {
          const worker = createVideoExportWorker();
          expect(worker).toBeNull();
        });

        it('returns null safely if Worker constructor throws', () => {
          (globalThis as unknown as { window: unknown }).window = {};
          (globalThis as unknown as { Worker: unknown }).Worker = vi
            .fn()
            .mockImplementation(() => {
              throw new Error(
                'Worker creation denied by CSP or bundler path failure',
              );
            });

          const worker = createVideoExportWorker();
          expect(worker).toBeNull();

          delete (globalThis as unknown as { window?: unknown }).window;
          delete (globalThis as unknown as { Worker?: unknown }).Worker;
        });
      });

      describe('exportVideoDirect', () => {
        class MockEncodedVideoChunk {
          type: EncodedVideoChunkType;
          timestamp: number;
          duration?: number;
          byteLength: number;
          data: Uint8Array;

          constructor(init: {
            type: EncodedVideoChunkType;
            timestamp: number;
            duration?: number;
            data: BufferSource;
          }) {
            this.type = init.type;
            this.timestamp = init.timestamp;
            this.duration = init.duration;
            this.data = new Uint8Array(init.data as ArrayBuffer);
            this.byteLength = this.data.byteLength;
          }

          copyTo(dest: BufferSource) {
            new Uint8Array(dest as ArrayBuffer).set(this.data);
          }
        }

        class MockVideoEncoder {
          state: CodecState = 'unconfigured';
          encodeQueueSize = 0;
          ondequeue: (() => void) | null = null;
          outputCallback: (chunk: unknown, meta?: unknown) => void;
          errorCallback: (e: Error) => void;

          constructor(init: {
            output: (chunk: unknown, meta?: unknown) => void;
            error: (e: Error) => void;
          }) {
            this.outputCallback = init.output;
            this.errorCallback = init.error;
          }

          static isConfigSupported = vi.fn().mockResolvedValue({
            supported: true,
            config: {
              codec: 'avc1.4d002a',
              width: 1920,
              height: 1080,
              hardwareAcceleration: 'prefer-hardware',
            },
          });

          configure() {
            this.state = 'configured';
          }

          encode() {
            const dummyData = new Uint8Array(1024).fill(1);
            const chunk = new MockEncodedVideoChunk({
              type: 'key',
              timestamp: 0,
              duration: 16666,
              data: dummyData.buffer,
            });

            this.outputCallback(chunk, {
              decoderConfig: {
                codec: 'avc1.4d002a',
                description: new Uint8Array([0, 1, 2, 3]),
              },
            });
          }

          async flush() {
            return Promise.resolve();
          }

          close() {
            this.state = 'closed';
          }
        }

        class MockVideoFrame {
          timestamp: number;
          duration: number;
          constructor(
            _source: unknown,
            init: { timestamp: number; duration: number },
          ) {
            this.timestamp = init.timestamp;
            this.duration = init.duration;
          }
          close() {}
        }

        class MockOffscreenCanvas {
          width: number;
          height: number;
          constructor(width: number, height: number) {
            this.width = width;
            this.height = height;
          }
          getContext() {
            return createMockCanvasContext();
          }
        }

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
          ).rejects.toThrow('Slides data is required for direct video export.');
        });

        it('executes direct WebCodecs pipeline with zero-wait async yielding and generates MP4 Blob', async () => {
          (
            globalThis as unknown as { EncodedVideoChunk: unknown }
          ).EncodedVideoChunk = MockEncodedVideoChunk;
          (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
            MockVideoEncoder;
          (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
            MockVideoFrame;
          (
            globalThis as unknown as { OffscreenCanvas: unknown }
          ).OffscreenCanvas = MockOffscreenCanvas;

          const progressEvents: number[] = [];
          const blob = await exportVideoDirect({
            format: 'mp4',
            fps: 30,
            scale: 1,
            quality: 'high',
            totalDurationMs: 500,
            stageWidth: 1920,
            stageHeight: 1080,
            slides: [mockSlide],
            aspectRatio: '16:9',
            onProgress: (p) => progressEvents.push(p.percent),
          });

          expect(blob).toBeInstanceOf(Blob);
          expect(blob.type).toBe('video/mp4');
          expect(progressEvents.length).toBeGreaterThan(0);

          delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
            .EncodedVideoChunk;
          delete (globalThis as unknown as { VideoEncoder?: unknown })
            .VideoEncoder;
          delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
          delete (globalThis as unknown as { OffscreenCanvas?: unknown })
            .OffscreenCanvas;
        });

        it('exportTacticalVideo falls back smoothly to Direct Turbo Engine when Worker is unavailable', async () => {
          (globalThis as unknown as { window: unknown }).window = {
            VideoEncoder: MockVideoEncoder,
          };
          (
            globalThis as unknown as { EncodedVideoChunk: unknown }
          ).EncodedVideoChunk = MockEncodedVideoChunk;
          (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
            MockVideoEncoder;
          (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
            MockVideoFrame;
          (
            globalThis as unknown as { OffscreenCanvas: unknown }
          ).OffscreenCanvas = MockOffscreenCanvas;

          const blob = await exportTacticalVideo({
            format: 'mp4',
            fps: 30,
            scale: 1,
            quality: 'high',
            totalDurationMs: 500,
            stageWidth: 1920,
            stageHeight: 1080,
            slides: [mockSlide],
            aspectRatio: '16:9',
          });

          expect(blob).toBeInstanceOf(Blob);
          expect(blob.type).toBe('video/mp4');

          delete (globalThis as unknown as { window?: unknown }).window;
          delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
            .EncodedVideoChunk;
          delete (globalThis as unknown as { VideoEncoder?: unknown })
            .VideoEncoder;
          delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
          delete (globalThis as unknown as { OffscreenCanvas?: unknown })
            .OffscreenCanvas;
        });

        it('handles backpressure when encodeQueueSize exceeds high watermark and resumes via ondequeue', async () => {
          class MockQueuedVideoEncoder extends MockVideoEncoder {
            override encode() {
              super.encode();
              this.encodeQueueSize = 35; // Trigger MAX_QUEUE_SIZE (30)
              setTimeout(() => {
                this.encodeQueueSize = 10; // Under LOW_QUEUE_SIZE (15)
                this.ondequeue?.();
              }, 10);
            }
          }

          (
            globalThis as unknown as { EncodedVideoChunk: unknown }
          ).EncodedVideoChunk = MockEncodedVideoChunk;
          (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
            MockQueuedVideoEncoder;
          (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
            MockVideoFrame;
          (
            globalThis as unknown as { OffscreenCanvas: unknown }
          ).OffscreenCanvas = MockOffscreenCanvas;

          const blob = await exportVideoDirect({
            format: 'mp4',
            fps: 30,
            scale: 1,
            quality: 'high',
            totalDurationMs: 300,
            stageWidth: 1920,
            stageHeight: 1080,
            slides: [mockSlide],
            aspectRatio: '16:9',
          });

          expect(blob).toBeInstanceOf(Blob);
          expect(blob.type).toBe('video/mp4');

          delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
            .EncodedVideoChunk;
          delete (globalThis as unknown as { VideoEncoder?: unknown })
            .VideoEncoder;
          delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
          delete (globalThis as unknown as { OffscreenCanvas?: unknown })
            .OffscreenCanvas;
        });

        it('cancels video export immediately when checkCancelled returns true', async () => {
          (
            globalThis as unknown as { EncodedVideoChunk: unknown }
          ).EncodedVideoChunk = MockEncodedVideoChunk;
          (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
            MockVideoEncoder;
          (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
            MockVideoFrame;
          (
            globalThis as unknown as { OffscreenCanvas: unknown }
          ).OffscreenCanvas = MockOffscreenCanvas;

          await expect(
            exportVideoDirect({
              format: 'mp4',
              fps: 30,
              scale: 1,
              quality: 'high',
              totalDurationMs: 1000,
              stageWidth: 1920,
              stageHeight: 1080,
              slides: [mockSlide],
              aspectRatio: '16:9',
              checkCancelled: () => true,
            }),
          ).rejects.toThrow('Export cancelled');

          delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
            .EncodedVideoChunk;
          delete (globalThis as unknown as { VideoEncoder?: unknown })
            .VideoEncoder;
          delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
          delete (globalThis as unknown as { OffscreenCanvas?: unknown })
            .OffscreenCanvas;
        });
      });
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
