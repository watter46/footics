import { describe, expect, it, vi } from 'vitest';
import type { Player, Slide } from '@/lib/types/tactical-unified';
import * as sharePayloadModule from '../export/share-payload';
import {
  applySlideTimelineOverrides,
  calculateBoundaryCrop,
  calculateUnifiedTotalDuration,
  exportMultiSlideMp4Video,
  exportMultiSlideVideo,
  exportMultiSlideWebmVideo,
  matchSlidePlayers,
} from '../export/tactical-video-exporter';

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

function createMockPlayer(
  id: string,
  team: 'home' | 'away' | 'neutral',
  x: number,
  y: number,
  shirtNo?: string,
  name?: string,
): Player {
  return {
    id,
    x,
    y,
    team,
    shirtNo,
    name,
    area: 'pitch',
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color: team === 'home' ? '#3b82f6' : '#ef4444',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    },
    connectLines: [],
    badges: [],
  };
}

function createSampleSlide(
  id: string,
  players: Player[],
  durationMs = 1500,
  pauseMs = 500,
  easing: Slide['easing'] = 'ease-in-out',
): Slide {
  return {
    id,
    index: 0,
    players,
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: 50, y: 50, visible: true },
    transitionDurationMs: durationMs,
    pauseMs,
    easing,
  };
}

describe('tactical-video-exporter', () => {
  describe('matchSlidePlayers', () => {
    it('matches players with exact same IDs across slides', () => {
      const playersA = [
        createMockPlayer('p1', 'home', 20, 30, '10', 'Messi'),
        createMockPlayer('p2', 'home', 40, 50, '7', 'Ronaldo'),
      ];
      const playersB = [
        createMockPlayer('p1', 'home', 25, 35, '10', 'Messi'),
        createMockPlayer('p2', 'home', 45, 55, '7', 'Ronaldo'),
      ];

      const matched = matchSlidePlayers(playersA, playersB);
      expect(matched.length).toBe(2);
      expect(matched[0].key).toBe('p1');
      expect(matched[0].playerA?.id).toBe('p1');
      expect(matched[0].playerB?.id).toBe('p1');
      expect(matched[1].key).toBe('p2');
      expect(matched[1].playerA?.id).toBe('p2');
      expect(matched[1].playerB?.id).toBe('p2');
    });

    it('matches players by team and shirt number when IDs differ', () => {
      const playersA = [
        createMockPlayer('old-id-1', 'home', 10, 10, '10', 'Player A'),
      ];
      const playersB = [
        createMockPlayer('new-id-2', 'home', 20, 20, '10', 'Player B'),
      ];

      const matched = matchSlidePlayers(playersA, playersB);
      expect(matched.length).toBe(1);
      expect(matched[0].key).toBe('old-id-1');
      expect(matched[0].playerA?.id).toBe('old-id-1');
      expect(matched[0].playerB?.id).toBe('new-id-2');
    });

    it('matches players by team and name when IDs and shirt numbers differ', () => {
      const playersA = [createMockPlayer('p-a', 'away', 30, 30, '', 'Saka')];
      const playersB = [createMockPlayer('p-b', 'away', 60, 60, '', 'saka')];

      const matched = matchSlidePlayers(playersA, playersB);
      expect(matched.length).toBe(1);
      expect(matched[0].key).toBe('p-a');
      expect(matched[0].playerA?.name).toBe('Saka');
      expect(matched[0].playerB?.name).toBe('saka');
    });

    it('preserves unmatched players in A (fading out) and unmatched in B (fading in)', () => {
      const playersA = [
        createMockPlayer('p1', 'home', 10, 10, '10', 'Messi'),
        createMockPlayer('p2', 'home', 20, 20, '9', 'Haaland'),
      ];
      const playersB = [
        createMockPlayer('p1', 'home', 15, 15, '10', 'Messi'),
        createMockPlayer('p3', 'away', 80, 80, '7', 'Mbappe'),
      ];

      const matched = matchSlidePlayers(playersA, playersB);
      expect(matched.length).toBe(3);

      const matchedP1 = matched.find((m) => m.key === 'p1');
      expect(matchedP1?.playerA).toBeDefined();
      expect(matchedP1?.playerB).toBeDefined();

      const departingP2 = matched.find((m) => m.key === 'p2');
      expect(departingP2?.playerA?.id).toBe('p2');
      expect(departingP2?.playerB).toBeUndefined();

      const arrivingP3 = matched.find((m) => m.key === 'p3');
      expect(arrivingP3?.playerA).toBeUndefined();
      expect(arrivingP3?.playerB?.id).toBe('p3');
    });
  });

  describe('applySlideTimelineOverrides', () => {
    it('returns unchanged slides when no overrides are provided', () => {
      const slides = [
        createSampleSlide('s1', [], 1000, 500, 'ease-in-out'),
        createSampleSlide('s2', [], 2000, 1000, 'linear'),
      ];

      const result = applySlideTimelineOverrides(slides);
      expect(result).toBe(slides);
    });

    it('overrides transitionDurationMs, pauseMs, and easing for all slides', () => {
      const slides = [
        createSampleSlide('s1', [], 1000, 500, 'ease-in-out'),
        createSampleSlide('s2', [], 2000, 1000, 'linear'),
      ];

      const result = applySlideTimelineOverrides(slides, {
        transitionDurationMs: 1800,
        pauseMs: 800,
        easing: 'ease-out',
      });

      expect(result.length).toBe(2);
      expect(result[0].transitionDurationMs).toBe(1800);
      expect(result[0].pauseMs).toBe(800);
      expect(result[0].easing).toBe('ease-out');
      expect(result[1].transitionDurationMs).toBe(1800);
      expect(result[1].pauseMs).toBe(800);
      expect(result[1].easing).toBe('ease-out');
    });
  });

  describe('calculateUnifiedTotalDuration & calculateBoundaryCrop', () => {
    it('calculates total timeline duration properly', () => {
      const slides = [
        createSampleSlide('s1', [], 1500, 500),
        createSampleSlide('s2', [], 2000, 1000),
        createSampleSlide('s3', [], 1000, 500),
      ];

      // Total for 3 slides (destination-based): s2 (2000+1000) + s3 (1000+500) = 4500ms
      const duration = calculateUnifiedTotalDuration(slides);
      expect(duration).toBe(4500);
    });

    it('snaps crop dimensions with 8-pixel macroblock alignment', () => {
      const crop = calculateBoundaryCrop(null, 1280, 720, 2);
      expect(crop.exportWidth % 8).toBe(0);
      expect(crop.exportHeight % 8).toBe(0);
      expect(crop.exportWidth).toBe(2560);
      expect(crop.exportHeight).toBe(1440);
    });
  });

  describe('exportMultiSlideVideo pipeline', () => {
    class MockEncodedVideoChunk {
      type: string;
      timestamp: number;
      duration?: number;
      byteLength: number;
      data: Uint8Array;

      constructor(init: {
        type: string;
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
        const target =
          dest instanceof Uint8Array
            ? dest
            : new Uint8Array(dest as ArrayBuffer);
        target.set(this.data);
      }
    }

    class MockVideoEncoder {
      state = 'unconfigured';
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
          codec: 'avc1.64002a',
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
            codec: 'avc1.64002a',
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
        _canvas: unknown,
        init: { timestamp: number; duration: number },
      ) {
        this.timestamp = init.timestamp;
        this.duration = init.duration;
      }
      clone() {
        return new MockVideoFrame(null, {
          timestamp: this.timestamp,
          duration: this.duration,
        });
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
        return {
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          resetTransform: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          arc: vi.fn(),
          ellipse: vi.fn(),
          quadraticCurveTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          strokeRect: vi.fn(),
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          rect: vi.fn(),
          clip: vi.fn(),
          fillText: vi.fn(),
          strokeText: vi.fn(),
          drawImage: vi.fn(),
          measureText: vi.fn(() => ({ width: 10 })),
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
        };
      }
    }

    it('throws error when no slides are provided', async () => {
      await expect(
        exportMultiSlideMp4Video({
          slides: [],
        }),
      ).rejects.toThrow('No slides provided for MP4 export');
    });

    it('successfully renders and encodes multi-slide MP4 video with WebCodecs', async () => {
      (
        globalThis as unknown as { EncodedVideoChunk: unknown }
      ).EncodedVideoChunk = MockEncodedVideoChunk;
      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
        MockVideoEncoder;
      (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
        MockVideoFrame;
      (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
        MockOffscreenCanvas;

      const progressCb = vi.fn();

      const slides = [
        createSampleSlide(
          's1',
          [createMockPlayer('p1', 'home', 20, 30, '10', 'Messi')],
          1000,
          500,
        ),
        createSampleSlide(
          's2',
          [createMockPlayer('p1', 'home', 60, 70, '10', 'Messi')],
          1000,
          500,
        ),
      ];

      const blob = await exportMultiSlideVideo({
        slides,
        format: 'mp4',
        fps: 30,
        scale: 1,
        onProgress: progressCb,
      });

      expect(blob).toBeDefined();
      expect(blob.type).toBe('video/mp4');
      expect(progressCb).toHaveBeenCalled();

      delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
        .EncodedVideoChunk;
      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
      delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
      delete (globalThis as unknown as { OffscreenCanvas?: unknown })
        .OffscreenCanvas;
    });

    it('routes to webm export when format is webm', async () => {
      (
        globalThis as unknown as { EncodedVideoChunk: unknown }
      ).EncodedVideoChunk = MockEncodedVideoChunk;
      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
        MockVideoEncoder;
      (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
        MockVideoFrame;
      (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
        MockOffscreenCanvas;

      const slides = [
        createSampleSlide(
          's1',
          [createMockPlayer('p1', 'home', 20, 30, '10', 'Messi')],
          1000,
          500,
        ),
      ];

      const blob = await exportMultiSlideVideo({
        slides,
        format: 'webm',
        fps: 30,
        scale: 1,
      });

      expect(blob).toBeDefined();
      expect(blob.type).toContain('video');

      delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
        .EncodedVideoChunk;
      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
      delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
      delete (globalThis as unknown as { OffscreenCanvas?: unknown })
        .OffscreenCanvas;
    });

    it('preloads marble texture bitmap and safely closes ImageBitmaps upon MP4 export completion', async () => {
      (
        globalThis as unknown as { EncodedVideoChunk: unknown }
      ).EncodedVideoChunk = MockEncodedVideoChunk;
      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
        MockVideoEncoder;
      (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
        MockVideoFrame;
      (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
        MockOffscreenCanvas;

      const mockMarble = {
        close: vi.fn(),
      } as unknown as ImageBitmap;

      const preloadMarbleSpy = vi
        .spyOn(sharePayloadModule, 'preloadMarbleTextureBitmap')
        .mockResolvedValue(mockMarble);

      const mockPlayerPhoto = {
        close: vi.fn(),
      } as unknown as ImageBitmap;

      const preloadPhotosSpy = vi
        .spyOn(sharePayloadModule, 'preloadSlidePlayerPhotos')
        .mockResolvedValue({ 'player-1': mockPlayerPhoto });

      const slides = [
        createSampleSlide(
          's1',
          [createMockPlayer('p1', 'home', 20, 30, '10', 'Messi')],
          1000,
          500,
        ),
      ];

      const blob = await exportMultiSlideMp4Video({
        slides,
        pitchAppearance: {
          pitchBackgroundType: 'marble',
          overlayColor: '#000000',
          overlayOpacity: 0.2,
          lineColor: '#ffffff',
          lineWidth: 2,
          lineOpacity: 1,
        },
      });

      expect(blob).toBeDefined();
      expect(preloadMarbleSpy).toHaveBeenCalledWith(
        expect.objectContaining({ pitchBackgroundType: 'marble' }),
      );
      expect(preloadPhotosSpy).toHaveBeenCalled();
      expect(mockMarble.close).toHaveBeenCalled();
      expect(mockPlayerPhoto.close).toHaveBeenCalled();

      preloadMarbleSpy.mockRestore();
      preloadPhotosSpy.mockRestore();

      delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
        .EncodedVideoChunk;
      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
      delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
      delete (globalThis as unknown as { OffscreenCanvas?: unknown })
        .OffscreenCanvas;
    });

    it('preloads marble texture bitmap and safely closes ImageBitmaps upon WebM export completion', async () => {
      (
        globalThis as unknown as { EncodedVideoChunk: unknown }
      ).EncodedVideoChunk = MockEncodedVideoChunk;
      (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder =
        MockVideoEncoder;
      (globalThis as unknown as { VideoFrame: unknown }).VideoFrame =
        MockVideoFrame;
      (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
        MockOffscreenCanvas;

      const mockMarble = {
        close: vi.fn(),
      } as unknown as ImageBitmap;

      const preloadMarbleSpy = vi
        .spyOn(sharePayloadModule, 'preloadMarbleTextureBitmap')
        .mockResolvedValue(mockMarble);

      const slides = [
        createSampleSlide(
          's1',
          [createMockPlayer('p1', 'home', 20, 30, '10', 'Messi')],
          1000,
          500,
        ),
      ];

      const blob = await exportMultiSlideWebmVideo({
        slides,
        pitchAppearance: {
          pitchBackgroundType: 'marble',
          overlayColor: '#000000',
          overlayOpacity: 0.2,
          lineColor: '#ffffff',
          lineWidth: 2,
          lineOpacity: 1,
        },
      });

      expect(blob).toBeDefined();
      expect(preloadMarbleSpy).toHaveBeenCalledWith(
        expect.objectContaining({ pitchBackgroundType: 'marble' }),
      );
      expect(mockMarble.close).toHaveBeenCalled();

      preloadMarbleSpy.mockRestore();

      delete (globalThis as unknown as { EncodedVideoChunk?: unknown })
        .EncodedVideoChunk;
      delete (globalThis as unknown as { VideoEncoder?: unknown }).VideoEncoder;
      delete (globalThis as unknown as { VideoFrame?: unknown }).VideoFrame;
      delete (globalThis as unknown as { OffscreenCanvas?: unknown })
        .OffscreenCanvas;
    });
  });
});
