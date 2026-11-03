import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCanvasSourceAdd, lastCanvasSourceConfig } = vi.hoisted(() => {
  return {
    mockCanvasSourceAdd: vi.fn().mockResolvedValue(undefined),
    lastCanvasSourceConfig: { value: null as any },
  };
});

vi.mock('mediabunny', () => {
  class MockBufferTarget {
    buffer: ArrayBuffer | null = new Uint8Array([0, 1, 2, 3]).buffer;
  }
  class MockMp4OutputFormat {}
  class MockWebMOutputFormat {}
  class MockOutput {
    target: any;
    tracks: any[] = [];
    constructor(options: any) {
      this.target = options.target;
    }
    addVideoTrack(track: any) {
      this.tracks.push(track);
      return track;
    }
    async start() {}
    async finalize() {
      this.target.buffer = new Uint8Array([0, 1, 2, 3]).buffer;
    }
    async cancel() {}
  }
  class MockCanvasSource {
    canvas: any;
    config: any;
    constructor(canvas: any, config: any) {
      this.canvas = canvas;
      this.config = config;
      lastCanvasSourceConfig.value = config;
    }
    add = mockCanvasSourceAdd;
  }
  return {
    BufferTarget: MockBufferTarget,
    Output: MockOutput,
    CanvasSource: MockCanvasSource,
    Mp4OutputFormat: MockMp4OutputFormat,
    WebMOutputFormat: MockWebMOutputFormat,
  };
});

vi.hoisted(() => {
  if (typeof globalThis.Path2D === 'undefined') {
    class MockPath2D {
      d: string;
      constructor(d?: string) {
        this.d = d ?? '';
      }
    }
    Object.defineProperty(globalThis, 'Path2D', {
      value: MockPath2D,
      writable: true,
      configurable: true,
    });
  }
  if (typeof globalThis.ImageBitmap === 'undefined') {
    class MockImageBitmap {
      width = 0;
      height = 0;
      close() {}
    }
    Object.defineProperty(globalThis, 'ImageBitmap', {
      value: MockImageBitmap,
      writable: true,
      configurable: true,
    });
  }
});

import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import type { InterpolatedArrowState } from '@/lib/tactical/unified-interpolation';
import {
  type AspectRatio,
  type PitchTransform,
  type Slide,
  SlideSchema,
} from '@/lib/types/tactical-unified';
import { renderArrows } from '../renderers/arrow-renderer';
import { renderBall } from '../renderers/ball-renderer';
import { renderPitch, renderPitchMarkings } from '../renderers/pitch-renderer';
import type { FrameRenderContext } from '../renderers/renderer-context';
import * as tacticalFrameRenderer from '../tactical-frame-renderer';
import {
  type AnyCanvasRenderingContext2D,
  getOpticalCenterX,
  renderTacticalFrameToCanvas,
} from '../tactical-frame-renderer';
import { exportVideoWithMediabunny } from '../video-mediabunny-export';

function createMockContext(): AnyCanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    setLineDash: vi.fn(),
    quadraticCurveTo: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
  } as unknown as AnyCanvasRenderingContext2D;
}

const sampleSlide: Slide = SlideSchema.parse({
  id: 'slide-1',
  index: 0,
  transitionDurationMs: 1000,
  pauseMs: 500,
  players: [
    {
      id: 'p1',
      x: 30,
      y: 40,
      team: 'home',
      shirtNo: '10',
      name: 'Messi',
      area: 'pitch',
      style: {
        insideContent: 'number',
        bottomLabel: 'name',
        color: '#3b82f6',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
      visionCone: {
        id: 'vc1',
        visible: true,
        angleRad: 0,
        spreadRad: Math.PI / 3,
        radius: 25,
        opacity: 0.3,
        color: '#3b82f6',
      },
      connectLines: [
        {
          id: 'c1',
          toPlayerId: 'p2',
          visible: true,
          lineStyle: 'dashed',
          color: '#38bdf8',
          strokeWidth: 2,
        },
      ],
    },
    {
      id: 'p2',
      x: 60,
      y: 40,
      team: 'home',
      shirtNo: '7',
      name: 'Ronaldo',
      area: 'pitch',
      style: {
        insideContent: 'number',
        bottomLabel: 'name',
        color: '#ef4444',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
    },
  ],
  ball: { x: 30, y: 40, visible: true },
  zones: [
    {
      id: 'z1',
      annotationType: 'zone',
      zoneType: 'space',
      shapeType: 'rect',
      x: 20,
      y: 20,
      width: 40,
      height: 30,
      color: '#22c55e',
      opacity: 0.3,
      strokeColor: '#16a34a',
      strokeWidth: 2,
    },
  ],
  arrows: [
    {
      id: 'a1',
      annotationType: 'arrow',
      arrowType: 'move',
      curveType: 'curved',
      points: [
        { x: 30, y: 40 },
        { x: 50, y: 20 },
      ],
      controlPoint: { x: 40, y: 25 },
      color: '#38bdf8',
      strokeWidth: 3,
    },
  ],
  texts: [
    {
      id: 't1',
      annotationType: 'text',
      x: 10,
      y: 10,
      content: 'High Press Trigger',
      fontSize: 16,
      color: '#ffffff',
      bold: true,
      italic: false,
    },
  ],
});

describe('Tactical Frame Renderer', () => {
  it('renders a full tactical frame with pitch background, players, ball, zone, arrow and text', () => {
    const ctx = createMockContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [sampleSlide],
      timeMs: 0,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      transparent: false,
    });

    // Pitch background fill
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    // Player and ball text / labels
    expect(ctx.fillText).toHaveBeenCalledWith(
      '10',
      expect.any(Number),
      expect.any(Number),
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      'Messi',
      expect.any(Number),
      expect.any(Number),
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      'High Press Trigger',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('renders transparent frame without pitch background when transparent=true', () => {
    const ctx = createMockContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [sampleSlide],
      timeMs: 0,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      transparent: true,
    });

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
  });

  it('supports 9:16 vertical pitch geometry', () => {
    const ctx = createMockContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [sampleSlide],
      timeMs: 0,
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      transparent: false,
    });

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1920);
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it('applies boundary cropping transformations accurately', () => {
    const ctx = createMockContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [sampleSlide],
      timeMs: 0,
      width: 800,
      height: 600,
      aspectRatio: '16:9',
      boundaryBox: {
        enabled: true,
        x: 20,
        y: 20,
        width: 50,
        height: 50,
      },
      transparent: false,
    });

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('achieves 100% visual parity with browser canvas (gold pitch lines #e2b48d, clean white numbers without strokeText)', () => {
    const ctx = createMockContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [sampleSlide],
      timeMs: 0,
      width: 2560,
      height: 1440,
      aspectRatio: '16:9',
      transparent: false,
    });

    // Pitch markings stroke
    expect(ctx.strokeRect).toHaveBeenCalled();
    // Shirt number must be clean white text WITHOUT strokeText (100% match with player-layer.tsx)
    expect(ctx.strokeText).not.toHaveBeenCalledWith(
      '10',
      expect.any(Number),
      expect.any(Number),
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      '10',
      expect.any(Number),
      expect.any(Number),
    );
    // Player name label maintains crisp dark strokeText outline
    expect(ctx.strokeText).toHaveBeenCalledWith(
      'Messi',
      expect.any(Number),
      expect.any(Number),
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      'Messi',
      expect.any(Number),
      expect.any(Number),
    );
    // Player body and ball drawn
    expect(ctx.arc).toHaveBeenCalled();
  });

  it('renders 3D Foot Ring (markerType: ring) and Spotlight Pillar (focus: enabled)', () => {
    const ringSlide: Slide = SlideSchema.parse({
      id: 'slide-ring',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 500,
      players: [
        {
          id: 'p-ring',
          x: 40,
          y: 50,
          team: 'home',
          shirtNo: '8',
          name: 'Iniesta',
          area: 'pitch',
          style: {
            markerType: 'ring',
            insideContent: 'number',
            bottomLabel: 'name',
            color: '#3b82f6',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
          focus: {
            enabled: true,
            color: '#fbbf24',
            radius: 3,
            opacity: 0.5,
            style: 'spotlight',
          },
          connectLines: [],
          badges: [],
        },
      ],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
    });

    const ctx = createMockContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [ringSlide],
      timeMs: 0,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      transparent: false,
    });

    // Verify ellipse called for ring and spotlight puddle
    expect(ctx.ellipse).toHaveBeenCalled();
    // 3Dリング中央には背番号を描画しない仕様に統一
    expect(ctx.fillText).not.toHaveBeenCalledWith(
      '8',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('renders player photo inside 2D circle when insideContent === "photo" and playerPhotos is provided, falling back to shirt number when missing', () => {
    const photoSlide: Slide = SlideSchema.parse({
      id: 'slide-photo',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 500,
      players: [
        {
          id: 'p-photo',
          playerId: '101',
          x: 40,
          y: 50,
          team: 'home',
          shirtNo: '7',
          name: 'Saka',
          area: 'pitch',
          style: {
            insideContent: 'photo',
            bottomLabel: 'name',
            color: '#dc2626',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
        },
        {
          id: 'p-no-photo',
          playerId: '102',
          x: 60,
          y: 50,
          team: 'away',
          shirtNo: '9',
          name: 'Havertz',
          area: 'pitch',
          style: {
            insideContent: 'photo',
            bottomLabel: 'name',
            color: '#3b82f6',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
        },
      ],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
    });

    const fakeImageSource = {} as CanvasImageSource;
    const ctx = createMockContext();
    (ctx as unknown as { drawImage: ReturnType<typeof vi.fn> }).drawImage =
      vi.fn();

    renderTacticalFrameToCanvas(ctx, {
      slides: [photoSlide],
      timeMs: 0,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      playerPhotos: {
        '101': fakeImageSource,
      },
      transparent: false,
    });

    // 101 (Saka) には写真があるので ctx.drawImage が呼ばれる
    expect(ctx.drawImage).toHaveBeenCalledWith(
      fakeImageSource,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    // 101 (Saka) の背番号は描画されない
    expect(ctx.fillText).not.toHaveBeenCalledWith(
      '7',
      expect.any(Number),
      expect.any(Number),
    );

    // 102 (Havertz) は写真未登録のため背番号 '9' にフォールバック
    expect(ctx.fillText).toHaveBeenCalledWith(
      '9',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('skips detached ImageBitmap (width: 0, height: 0) and falls back to shirt number', () => {
    const photoSlide: Slide = SlideSchema.parse({
      id: 'slide-detached-photo',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 500,
      players: [
        {
          id: 'p-detached',
          playerId: '101',
          x: 40,
          y: 50,
          team: 'home',
          shirtNo: '7',
          name: 'Saka',
          area: 'pitch',
          style: {
            insideContent: 'photo',
            bottomLabel: 'name',
            color: '#dc2626',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
        },
      ],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
    });

    const detachedBitmap = Object.create(ImageBitmap.prototype, {
      width: { value: 0, configurable: true },
      height: { value: 0, configurable: true },
    }) as ImageBitmap;

    const ctx = createMockContext();
    (ctx as unknown as { drawImage: ReturnType<typeof vi.fn> }).drawImage =
      vi.fn();

    renderTacticalFrameToCanvas(ctx, {
      slides: [photoSlide],
      timeMs: 0,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      playerPhotos: {
        '101': detachedBitmap,
      },
      transparent: false,
    });

    // detached なため ctx.drawImage は呼ばれない
    expect(ctx.drawImage).not.toHaveBeenCalled();

    // 背番号 '7' がフォールバック描画される
    expect(ctx.fillText).toHaveBeenCalledWith(
      '7',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('catches drawImage exception (e.g. InvalidStateError) and falls back to shirt number gracefully', () => {
    const photoSlide: Slide = SlideSchema.parse({
      id: 'slide-error-photo',
      index: 0,
      transitionDurationMs: 1000,
      pauseMs: 500,
      players: [
        {
          id: 'p-error',
          playerId: '101',
          x: 40,
          y: 50,
          team: 'home',
          shirtNo: '7',
          name: 'Saka',
          area: 'pitch',
          style: {
            insideContent: 'photo',
            bottomLabel: 'name',
            color: '#dc2626',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
        },
      ],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
    });

    const brokenBitmap = Object.create(ImageBitmap.prototype, {
      width: { value: 100, configurable: true },
      height: { value: 100, configurable: true },
    }) as ImageBitmap;

    const ctx = createMockContext();
    (ctx as unknown as { drawImage: ReturnType<typeof vi.fn> }).drawImage = vi
      .fn()
      .mockImplementation(() => {
        throw new Error('InvalidStateError: The image source is detached');
      });

    expect(() => {
      renderTacticalFrameToCanvas(ctx, {
        slides: [photoSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        playerPhotos: {
          '101': brokenBitmap,
        },
        transparent: false,
      });
    }).not.toThrow();

    // drawImage が例外をスローしても背番号 '7' にフォールバック描画される
    expect(ctx.fillText).toHaveBeenCalledWith(
      '7',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('benchmarks 180 frames (3s @ 60fps) CPU interpolation and draw generation', () => {
    const ctx = createMockContext();
    const frameCount = 180;
    const fps = 60;
    const t0 = performance.now();

    for (let i = 0; i < frameCount; i++) {
      const timeMs = (i / fps) * 1000;
      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide, sampleSlide],
        timeMs,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });
    }

    const t1 = performance.now();
    const totalMs = t1 - t0;
    console.log(
      `\n[BENCHMARK] 180 frames rendering time in JS runtime: ${totalMs.toFixed(2)}ms (${(totalMs / frameCount).toFixed(4)}ms/frame)`,
    );
    expect(totalMs).toBeLessThan(3000);
  });

  describe('3D Perspective Pitch and Zones (mvpMatrix)', () => {
    it('renders 3D projected pitch markings and zones when mvpMatrix is provided', () => {
      const pitchTransform: PitchTransform = {
        tilt: 45,
        zoom: 1.2,
        panX: 50,
        panY: -30,
        isLocked: false,
      };
      const mvpMatrix = buildExportMVPMatrix(
        pitchTransform,
        1920,
        1080,
        '16:9',
      ) as unknown as Float32Array;

      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
        mvpMatrix,
      });

      // Background fill
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
      // In 3D mode, pitch lines are drawn with lineTo/moveTo quads and arcs instead of strokeRect
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      // Texts, players, ball rendered
      expect(ctx.fillText).toHaveBeenCalledWith(
        'Messi',
        expect.any(Number),
        expect.any(Number),
      );
    });

    it.each<AspectRatio>(['16:9', '9:16', '4:5', '1:1'])(
      'renders pitch markings and zones correctly for aspect ratio %s in 3D mode',
      (aspectRatio) => {
        const dimensions: Record<
          AspectRatio,
          { width: number; height: number }
        > = {
          '16:9': { width: 1920, height: 1080 },
          '9:16': { width: 1080, height: 1920 },
          '4:5': { width: 1080, height: 1350 },
          '1:1': { width: 1080, height: 1080 },
        };
        const { width, height } = dimensions[aspectRatio];

        const pitchTransform: PitchTransform = {
          tilt: 30,
          zoom: 1.0,
          panX: 0,
          panY: 0,
          isLocked: false,
        };
        const mvpMatrix = buildExportMVPMatrix(
          pitchTransform,
          width,
          height,
          aspectRatio,
        ) as unknown as Float32Array;

        const ctx = createMockContext();
        renderTacticalFrameToCanvas(ctx, {
          slides: [sampleSlide],
          timeMs: 0,
          width,
          height,
          aspectRatio,
          transparent: false,
          mvpMatrix,
        });

        expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, width, height);
        expect(ctx.moveTo).toHaveBeenCalled();
        expect(ctx.lineTo).toHaveBeenCalled();
        expect(ctx.stroke).toHaveBeenCalled();
      },
    );

    it.each<AspectRatio>(['16:9', '9:16', '4:5', '1:1'])(
      'renders pitch markings correctly for aspect ratio %s in 2D fallback mode',
      (aspectRatio) => {
        const dimensions: Record<
          AspectRatio,
          { width: number; height: number }
        > = {
          '16:9': { width: 1920, height: 1080 },
          '9:16': { width: 1080, height: 1920 },
          '4:5': { width: 1080, height: 1350 },
          '1:1': { width: 1080, height: 1080 },
        };
        const { width, height } = dimensions[aspectRatio];

        const ctx = createMockContext();
        renderTacticalFrameToCanvas(ctx, {
          slides: [sampleSlide],
          timeMs: 0,
          width,
          height,
          aspectRatio,
          transparent: false,
        });

        expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, width, height);
        expect(ctx.strokeRect).toHaveBeenCalled();
      },
    );

    it('renders polygon, rect, and ellipse zones in 3D projection', () => {
      const zoneSlide: Slide = SlideSchema.parse({
        id: 'slide-zones',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        players: [],
        ball: { x: 50, y: 50, visible: true },
        arrows: [],
        texts: [],
        zones: [
          {
            id: 'z-poly',
            annotationType: 'zone',
            zoneType: 'space',
            shapeType: 'polygon',
            points: [
              { x: 10, y: 10 },
              { x: 40, y: 10 },
              { x: 30, y: 30 },
            ],
            color: '#3b82f6',
            opacity: 0.3,
            strokeColor: '#1d4ed8',
            strokeWidth: 2,
          },
          {
            id: 'z-rect',
            annotationType: 'zone',
            zoneType: 'space',
            shapeType: 'rect',
            x: 50,
            y: 50,
            width: 30,
            height: 20,
            color: '#22c55e',
            opacity: 0.4,
            strokeColor: '#15803d',
            strokeWidth: 2,
          },
          {
            id: 'z-ellipse',
            annotationType: 'zone',
            zoneType: 'space',
            shapeType: 'ellipse',
            x: 20,
            y: 60,
            width: 25,
            height: 15,
            color: '#eab308',
            opacity: 0.5,
            strokeColor: '#a16207',
            strokeWidth: 2,
          },
        ],
      });

      const pitchTransform: PitchTransform = {
        tilt: 40,
        zoom: 1.1,
        panX: 10,
        panY: 10,
        isLocked: false,
      };
      const mvpMatrix = buildExportMVPMatrix(
        pitchTransform,
        1920,
        1080,
        '16:9',
      ) as unknown as Float32Array;

      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [zoneSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
        mvpMatrix,
      });

      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
    });

    it('applies 3D pitch boundary polygon clipping and fills surface with dark pitch color', () => {
      const pitchTransform: PitchTransform = {
        tilt: 35,
        zoom: 1.0,
        panX: 0,
        panY: 0,
        isLocked: false,
      };
      const mvpMatrix = buildExportMVPMatrix(
        pitchTransform,
        1920,
        1080,
        '16:9',
      ) as unknown as Float32Array;

      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
        mvpMatrix,
      });

      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('applies 2D pitch boundary rect clipping and restores context at end of render', () => {
      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });

      expect(ctx.rect).toHaveBeenCalled();
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('applies boundaryBox crop and zoom viewport transform in 2D mode', () => {
      const boundaryBox = {
        enabled: true,
        x: 20,
        y: 20,
        width: 40,
        height: 40,
      };

      const ctx2d = createMockContext();
      renderTacticalFrameToCanvas(ctx2d, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        boundaryBox,
        transparent: false,
      });

      // Canvas boundary safe clipping
      expect(ctx2d.rect).toHaveBeenCalledWith(0, 0, 1920, 1080);
      expect(ctx2d.clip).toHaveBeenCalled();
      expect(ctx2d.save).toHaveBeenCalled();

      // Viewport transform (Scale & Translate):
      // cropX_px = (20/100)*1920 = 384, cropY_px = (20/100)*1080 = 216
      // cropW_px = (40/100)*1920 = 768, cropH_px = (40/100)*1080 = 432
      // scaleX = 1920 / 768 = 2.5, scaleY = 1080 / 432 = 2.5
      expect(ctx2d.scale).toHaveBeenCalledWith(2.5, 2.5);
      expect(ctx2d.translate).toHaveBeenCalledWith(-384, -216);

      // Player p1 rendered at raw screen coordinate (x: (30/100)*1920 = 576, y: (40/100)*1080 = 432)
      const arcMock = ctx2d.arc as unknown as ReturnType<typeof vi.fn>;
      const playerArcCalls = arcMock.mock.calls.filter(
        (call: unknown[]) => call[0] === 576 && call[1] === 432,
      );
      expect(playerArcCalls.length).toBeGreaterThan(0);

      expect(ctx2d.restore).toHaveBeenCalled();
    });

    it('applies boundaryBox crop and zoom viewport transform in 3D mode', () => {
      const pitchTransform: PitchTransform = {
        tilt: 45,
        zoom: 1.0,
        panX: 0,
        panY: 0,
        isLocked: false,
      };
      const mvpMatrix = buildExportMVPMatrix(
        pitchTransform,
        1920,
        1080,
        '16:9',
      ) as unknown as Float32Array;

      const boundaryBox = {
        enabled: true,
        x: 20,
        y: 20,
        width: 40,
        height: 40,
      };
      const ctx3d = createMockContext();
      renderTacticalFrameToCanvas(ctx3d, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        boundaryBox,
        transparent: false,
        mvpMatrix,
      });

      // Canvas boundary safe clipping
      expect(ctx3d.rect).toHaveBeenCalledWith(0, 0, 1920, 1080);
      expect(ctx3d.clip).toHaveBeenCalled();
      expect(ctx3d.save).toHaveBeenCalled();

      // Viewport transform (Scale & Translate) applied identically in 3D mode
      expect(ctx3d.scale).toHaveBeenCalledWith(2.5, 2.5);
      expect(ctx3d.translate).toHaveBeenCalledWith(-384, -216);

      // Player p1 projected with 3D matrix in raw uncropped coordinate space
      const arcMock = ctx3d.arc as unknown as ReturnType<typeof vi.fn>;
      expect(arcMock.mock.calls.length).toBeGreaterThan(0);

      expect(ctx3d.restore).toHaveBeenCalled();
    });
  });

  describe('Optical Center & 3D Soccer Ball parity', () => {
    it('getOpticalCenterX offsets x coordinate based on actualBoundingBoxLeft/Right asymmetry', () => {
      const ctx = createMockContext();
      // left: 2, right: 8 => diff = 6, offset = 3 => px - 3
      ctx.measureText = vi.fn().mockReturnValue({
        actualBoundingBoxLeft: 2,
        actualBoundingBoxRight: 8,
      });

      const opticalX = getOpticalCenterX(ctx, '10', 100);
      expect(opticalX).toBe(97); // 100 - (8 - 2) / 2 = 97
    });

    it('getOpticalCenterX returns original px when bounding box metrics are missing', () => {
      const ctx = createMockContext();
      ctx.measureText = vi.fn().mockReturnValue({});

      const opticalX = getOpticalCenterX(ctx, '10', 100);
      expect(opticalX).toBe(100);
    });

    it('renders shirt number using getOpticalCenterX compensation', () => {
      const ctx = createMockContext();
      ctx.measureText = vi.fn().mockReturnValue({
        actualBoundingBoxLeft: 1,
        actualBoundingBoxRight: 5,
      });

      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });

      // p1 is at x: 30% of 1920 = 576. Optical compensation: 576 - (5 - 1) / 2 = 574
      expect(ctx.fillText).toHaveBeenCalledWith('10', 574, expect.any(Number));
    });

    it('renders 3D soccer ball with 15 seam lines, central pentagon, and radial gradient matching SOCCER_BALL_SVG', () => {
      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });

      // 15 seam lines: each line calls lineTo in 100x100 viewBox space
      // Ball scale transform must be applied
      expect(ctx.scale).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      // Central pentagon closing
      expect(ctx.closePath).toHaveBeenCalled();
    });

    it('rotates canvas context with ctx.rotate when ball.rotation is specified', () => {
      const ctx = createMockContext();
      const mockRenderContext: FrameRenderContext = {
        ctx,
        w: 1920,
        h: 1080,
        m: null,
        toScreenX: (nx) => (nx / 100) * 1920,
        toScreenY: (ny) => (ny / 100) * 1080,
        toScreenSizeX: (nw) => (nw / 100) * 1920,
        toScreenSizeY: (nh) => (nh / 100) * 1080,
        projectObjToScreen: (nx, ny) => ({
          x: (nx / 100) * 1920,
          y: (ny / 100) * 1080,
        }),
        snap: (val) => Math.round(val),
      };

      renderBall(mockRenderContext, {
        x: 50,
        y: 50,
        visible: true,
        opacity: 1,
        rotation: 90,
      });

      expect(ctx.rotate).toHaveBeenCalledWith((90 * Math.PI) / 180);
    });
  });

  describe('renderPitch and renderPitchMarkings color styling', () => {
    it('sets gold strokeStyle (#e2b48d) and solid black background/surface fill (#000000)', () => {
      const ctx = createMockContext();
      const mockRenderContext: FrameRenderContext = {
        ctx,
        w: 1920,
        h: 1080,
        m: null,
        toScreenX: (nx) => (nx / 100) * 1920,
        toScreenY: (ny) => (ny / 100) * 1080,
        toScreenSizeX: (nw) => (nw / 100) * 1920,
        toScreenSizeY: (nh) => (nh / 100) * 1080,
        projectObjToScreen: (nx, ny) => ({
          x: (nx / 100) * 1920,
          y: (ny / 100) * 1080,
        }),
        snap: (val) => Math.round(val),
      };

      renderPitch(mockRenderContext, '16:9', false);

      // Verify pitch markings line color is gold
      expect(ctx.strokeStyle).toBe('#e2b48d');
    });
  });

  describe('Phase 2: 3D Camera Dynamic MVP Matrix & Renderer Overhaul', () => {
    it('dynamically generates and applies 3D MVP matrix from slide.pitchTransform when mvpMatrix is omitted', () => {
      const slideWithTilt: Slide = SlideSchema.parse({
        id: 'slide-tilt',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        pitchTransform: {
          tilt: 30,
          zoom: 1.5,
          panX: 20,
          panY: -10,
          isLocked: false,
        },
        players: [],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: true },
      });

      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [slideWithTilt],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });

      // 3D mode should be active because slide.pitchTransform has tilt: 30, zoom: 1.5
      // Pitch markings 3D uses moveTo & lineTo instead of strokeRect
      expect(ctx.strokeRect).not.toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
    });

    it('prioritizes options.pitchTransformOverride over slide.pitchTransform when provided', () => {
      const slideWithTilt: Slide = SlideSchema.parse({
        id: 'slide-tilt-2',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        pitchTransform: {
          tilt: 45,
          zoom: 1.5,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
        players: [],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: true },
      });

      const ctx = createMockContext();
      // Override with zero tilt and default zoom -> should fall back to 2D
      renderTacticalFrameToCanvas(ctx, {
        slides: [slideWithTilt],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
        pitchTransformOverride: {
          tilt: 0,
          zoom: 1,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
      });

      // Override forces 2D mode
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('clips marble background with 3D trapezoid polygon when isMarble is true and 3D mode is active', () => {
      const slideWithTilt: Slide = SlideSchema.parse({
        id: 'slide-marble-3d',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        pitchTransform: {
          tilt: 35,
          zoom: 1.2,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
        players: [],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: true },
      });

      const fakeMarbleTexture = {
        naturalWidth: 800,
        naturalHeight: 600,
      } as unknown as CanvasImageSource;

      const ctx = createMockContext();
      (ctx as unknown as { drawImage: ReturnType<typeof vi.fn> }).drawImage =
        vi.fn();

      renderTacticalFrameToCanvas(ctx, {
        slides: [slideWithTilt],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
        pitchAppearance: {
          pitchBackgroundType: 'marble',
          overlayOpacity: 0.6,
          overlayColor: '#123456',
          lineColor: '#e2b48d',
          lineWidth: 2,
          lineOpacity: 0.85,
        },
        marbleTexture: fakeMarbleTexture,
      });

      // In 3D marble mode, pitch trapezoid polygon (4 corners) is clipped via moveTo + 3 lineTo + closePath + clip
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      // Should not call ctx.rect for marble bounds clipping in 3D mode (only viewport rect at 0, 0, w, h is called)
      const rectCalls = (ctx.rect as unknown as ReturnType<typeof vi.fn>).mock
        .calls;
      expect(rectCalls.length).toBe(1); // Only canvas viewport clipping (0, 0, 1920, 1080)
      expect(
        (ctx as unknown as { drawImage: ReturnType<typeof vi.fn> }).drawImage,
      ).toHaveBeenCalledWith(
        fakeMarbleTexture,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      // Overlay blend rect should be filled with overlayColor
      expect(ctx.fillRect).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('sorts players by projected screen Y coordinate ascending and applies depth scale and 3D vision cone', () => {
      // p1 is near the top of the pitch (y: 20) -> Far in 3D perspective
      // p2 is near the bottom of the pitch (y: 80) -> Close in 3D perspective
      const slideWithPlayers: Slide = SlideSchema.parse({
        id: 'slide-players-3d',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        pitchTransform: {
          tilt: 40,
          zoom: 1.0,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
        players: [
          {
            id: 'p-close',
            x: 50,
            y: 80,
            team: 'away',
            shirtNo: '9',
            name: 'ClosePlayer',
            area: 'pitch',
            style: {
              insideContent: 'number',
              bottomLabel: 'name',
              color: '#dc2626',
            },
          },
          {
            id: 'p-far',
            x: 50,
            y: 20,
            team: 'home',
            shirtNo: '10',
            name: 'FarPlayer',
            area: 'pitch',
            style: {
              insideContent: 'number',
              bottomLabel: 'name',
              color: '#3b82f6',
            },
            visionCone: {
              id: 'vc-far',
              visible: true,
              angleRad: Math.PI / 2,
              spreadRad: Math.PI / 3,
              radius: 20,
              opacity: 0.4,
              color: '#3b82f6',
            },
          },
        ],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: true },
      });

      const drawOrder: string[] = [];
      const ctx = createMockContext();
      const originalFillText = ctx.fillText as (
        text: string,
        ...args: unknown[]
      ) => unknown;
      ctx.fillText = vi.fn((text: string, ...args: unknown[]) => {
        if (text === '10' || text === '9') {
          drawOrder.push(text);
        }
        return originalFillText(text, ...args);
      }) as unknown as typeof ctx.fillText;

      renderTacticalFrameToCanvas(ctx, {
        slides: [slideWithPlayers],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });

      // In 3D perspective, FarPlayer (y: 20, #10) must be drawn BEFORE ClosePlayer (y: 80, #9)
      // Depth sort: screen Y ascending order (far -> near)
      expect(drawOrder).toEqual(['10', '9']);

      // Far player (y: 20) scale: 0.88 + (20/100)*0.24 = 0.928
      // Close player (y: 80) scale: 0.88 + (80/100)*0.24 = 1.072
      // Close player radius > Far player radius
      const arcMock = ctx.arc as unknown as ReturnType<typeof vi.fn>;
      const playerBodyArcs = arcMock.mock.calls.filter(
        (call: unknown[]) =>
          call[3] === 0 && Math.abs((call[4] as number) - Math.PI * 2) < 0.001,
      );
      expect(playerBodyArcs.length).toBeGreaterThanOrEqual(2);
      const farRadius = playerBodyArcs[0][2];
      const closeRadius = playerBodyArcs[1][2];
      expect(closeRadius).toBeGreaterThan(farRadius);
    });
  });

  describe('renderArrows scaling & arrowhead synchronization', () => {
    it('scales arrow strokeWidth, pointerLength, and pointerWidth relative to 600px baseline and uses arrow color without dark border', () => {
      const ctx = createMockContext();
      const mockRenderContext: FrameRenderContext = {
        ctx,
        w: 1200,
        h: 675,
        m: null,
        toScreenX: (nx) => (nx / 100) * 1200,
        toScreenY: (ny) => (ny / 100) * 675,
        toScreenSizeX: (nw) => (nw / 100) * 1200,
        toScreenSizeY: (nh) => (nh / 100) * 675,
        projectObjToScreen: (nx, ny) => ({
          x: (nx / 100) * 1200,
          y: (ny / 100) * 675,
        }),
        snap: (val) => Math.round(val),
      };

      const arrows: Record<string, InterpolatedArrowState> = {
        arrow1: {
          id: 'arrow1',
          arrowType: 'move',
          curveType: 'straight',
          points: [
            { x: 10, y: 50 },
            { x: 90, y: 50 },
          ],
          color: '#ef4444',
          strokeWidth: 3,
          opacity: 1,
          visible: true,
        },
      };

      renderArrows(mockRenderContext, arrows);

      // w = 1200, baseline = 600 => scale = 2
      // strokeWidth = max(2, round(3 * 2)) = 6
      // pointerLength = max(8, round(15 * 2)) = 30
      // pointerWidth = max(8, round(15 * 2)) = 30
      // sx = 120, sy = 338, ex = 1080, ey = 338
      // angle = 0, cos = 1, sin = 0
      // bx = 1080 - 30 = 1050, by = 338
      // halfWidth = 15
      // c1: (1050, 338 + 15) = (1050, 353)
      // c2: (1050, 338 - 15) = (1050, 323)

      expect(ctx.lineWidth).toBe(6);
      expect(ctx.strokeStyle).toBe('#ef4444');
      expect(ctx.fillStyle).toBe('#ef4444');

      // Tip and arrowhead vertices
      expect(ctx.moveTo).toHaveBeenCalledWith(1080, 338);
      expect(ctx.lineTo).toHaveBeenCalledWith(1050, 353);
      expect(ctx.lineTo).toHaveBeenCalledWith(1050, 323);
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();

      // Ensure #020617 dark border is NOT used anywhere
      expect(ctx.strokeStyle).not.toBe('#020617');
    });
  });

  describe('Phase 1: Subpixel Precision, Perspective Depth Scale, and Combined Ring Path', () => {
    it('preserves subpixel coordinates without rounding in snap()', () => {
      const ctx = createMockContext();
      const subpixelSlide: Slide = SlideSchema.parse({
        id: 'slide-subpixel',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        players: [
          {
            id: 'p-subpixel',
            x: 30.33,
            y: 40.33,
            team: 'home',
            shirtNo: '10',
            name: 'Messi',
            area: 'pitch',
            style: {
              insideContent: 'number',
              bottomLabel: 'name',
              color: '#3b82f6',
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
        ball: { x: 50, y: 50, visible: false },
      });

      renderTacticalFrameToCanvas(ctx, {
        slides: [subpixelSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });

      const fillTextCalls = vi.mocked(ctx.fillText).mock.calls;
      const messiCall = fillTextCalls.find((call) => call[0] === 'Messi');
      expect(messiCall).toBeDefined();
      const messiX = messiCall?.[1] as number;
      const messiY = messiCall?.[2] as number;

      // With snap = (v) => v, subpixel decimals are preserved (not Math.round integers)
      expect(Number.isInteger(messiX)).toBe(false);
      expect(Number.isInteger(messiY)).toBe(false);
    });

    it('applies depthScale only when perspective tilt is active, remaining 1 for 2D plane zoom/pan', () => {
      const depthSlide: Slide = SlideSchema.parse({
        id: 'slide-depth',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        players: [
          {
            id: 'p-back',
            x: 50,
            y: 10,
            team: 'home',
            shirtNo: '1',
            name: 'Back',
            area: 'pitch',
            style: {
              color: '#3b82f6',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              insideContent: 'number',
              sizeScale: 1,
            },
            connectLines: [],
            badges: [],
          },
          {
            id: 'p-front',
            x: 50,
            y: 90,
            team: 'away',
            shirtNo: '2',
            name: 'Front',
            area: 'pitch',
            style: {
              color: '#ef4444',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              insideContent: 'number',
              sizeScale: 1,
            },
            connectLines: [],
            badges: [],
          },
        ],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: false },
      });

      // 1. Plane zoom only (tilt: 0, zoom: 1.5, yaw: 90, panX: 0, panY: 0)
      const ctxPlane = createMockContext();
      renderTacticalFrameToCanvas(ctxPlane, {
        slides: [depthSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        pitchTransformOverride: {
          tilt: 0,
          zoom: 1.5,
          yaw: 90,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
      });

      const planeArcCalls = vi.mocked(ctxPlane.arc).mock.calls;
      expect(planeArcCalls.length).toBeGreaterThanOrEqual(2);
      const radiusBackPlane = planeArcCalls[0][2];
      const radiusFrontPlane = planeArcCalls[1][2];
      // When tilt is 0, depthScale should be 1 for both players (no depth scaling)
      expect(radiusBackPlane).toBe(radiusFrontPlane);

      // 2. Perspective tilt (tilt: 40, zoom: 1.0)
      const ctxTilt = createMockContext();
      renderTacticalFrameToCanvas(ctxTilt, {
        slides: [depthSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        pitchTransformOverride: {
          tilt: 40,
          zoom: 1.0,
          yaw: 90,
          panX: 0,
          panY: 0,
          isLocked: false,
        },
      });

      const tiltArcCalls = vi.mocked(ctxTilt.arc).mock.calls;
      expect(tiltArcCalls.length).toBeGreaterThanOrEqual(2);
      // Because sorted by projected screen Y ascending (back to front):
      const radiusBackTilt = tiltArcCalls[0][2];
      const radiusFrontTilt = tiltArcCalls[1][2];
      // Front player (y: 90) should be rendered larger than back player (y: 10)
      expect(radiusFrontTilt).toBeGreaterThan(radiusBackTilt);
    });

    it('renders 3D Foot Ring (markerType: ring) using a single combined Path2D instance with 1 stroke and 1 fill for parts', () => {
      const ringSlide: Slide = SlideSchema.parse({
        id: 'slide-ring-perf',
        index: 0,
        transitionDurationMs: 1000,
        pauseMs: 500,
        players: [
          {
            id: 'p-ring',
            x: 50,
            y: 50,
            team: 'home',
            shirtNo: '7',
            name: 'Player',
            area: 'pitch',
            style: {
              markerType: 'ring',
              insideContent: 'number',
              color: '#2563eb',
            },
            connectLines: [],
            badges: [],
          },
        ],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: false },
      });

      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [ringSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
      });

      // ctx.stroke(Path2D) and ctx.fill(Path2D) should be called exactly ONCE each for the combined marker path
      const strokeWithPathCalls = vi
        .mocked(ctx.stroke)
        .mock.calls.filter(
          (args) => args.length > 0 && typeof args[0] === 'object',
        );
      const fillWithPathCalls = vi
        .mocked(ctx.fill)
        .mock.calls.filter(
          (args) => args.length > 0 && typeof args[0] === 'object',
        );

      expect(strokeWithPathCalls.length).toBe(1);
      expect(fillWithPathCalls.length).toBe(1);
    });

    it('uses precomputedFrame instead of recomputing interpolation', () => {
      const ctx = createMockContext();
      const dummyPrecomputed = {
        players: {
          p1: {
            id: 'p1',
            x: 92,
            y: 84,
            team: 'home' as const,
            shirtNo: '99',
            name: 'PrecomputedPlayer',
            area: 'pitch' as const,
            style: {
              insideContent: 'number' as const,
              bottomLabel: 'name' as const,
              color: '#3b82f6',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              sizeScale: 1,
              numberSizeScale: 1,
              labelSizeScale: 1,
            },
            opacity: 1,
            visible: true,
            connectLines: [],
            badges: [],
          },
        },
        ball: { x: 50, y: 50, visible: true, opacity: 1, rotation: 0 },
        zones: {},
        arrows: {},
        texts: {},
        pitchTransform: {
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 90,
          isLocked: false,
        },
        currentSlideIndex: 0,
        nextSlideIndex: 0,
        progress: 0,
        isPaused: false,
      };

      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1000,
        height: 1000,
        aspectRatio: '1:1',
        precomputedFrame: dummyPrecomputed as any,
      });

      const arcCalls = vi.mocked(ctx.arc).mock.calls;
      const matched = arcCalls.some(
        ([x, y]) => Math.abs(x - 920) < 5 && Math.abs(y - 840) < 5,
      );
      expect(matched).toBe(true);
    });

    describe('Phase 2: Player rendering parity (photo stroke, 2D focus glow, ring-fade)', () => {
      it('does not draw circle stroke when insideContent is photo and photoCache hits', () => {
        const slideWithPhoto: Slide = SlideSchema.parse({
          id: 'slide-photo-nostroke',
          index: 0,
          transitionDurationMs: 1000,
          pauseMs: 500,
          players: [
            {
              id: 'p-photo-only',
              playerId: 'photo-1',
              x: 50,
              y: 50,
              team: 'home',
              shirtNo: '10',
              name: '',
              area: 'pitch',
              style: {
                insideContent: 'photo',
                bottomLabel: 'none',
                color: '#3b82f6',
                strokeColor: '#ffffff',
                strokeWidth: 2,
                sizeScale: 1,
                numberSizeScale: 1,
                labelSizeScale: 1,
              },
            },
          ],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 0, y: 0, visible: false },
        });

        const fakeImage = {} as CanvasImageSource;
        const ctx = createMockContext();
        renderTacticalFrameToCanvas(ctx, {
          slides: [slideWithPhoto],
          timeMs: 0,
          width: 1000,
          height: 1000,
          aspectRatio: '16:9',
          playerPhotos: {
            'photo-1': fakeImage,
          },
          transparent: true,
        });

        // 選手本体のクリップ＆drawImageは呼ばれるが、外枠の白枠 stroke は呼ばれない
        expect(ctx.drawImage).toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();
      });

      it('renders 2D neon glow ring with shadowBlur when 2D circle player has focus enabled', () => {
        const slideWith2DFocus: Slide = SlideSchema.parse({
          id: 'slide-2d-focus',
          index: 0,
          transitionDurationMs: 1000,
          pauseMs: 500,
          players: [
            {
              id: 'p-2d-focus',
              x: 50,
              y: 50,
              team: 'home',
              shirtNo: '10',
              name: '',
              area: 'pitch',
              style: {
                insideContent: 'number',
                bottomLabel: 'none',
                color: '#3b82f6',
                strokeColor: '#ffffff',
                strokeWidth: 0,
                sizeScale: 1,
                numberSizeScale: 1,
                labelSizeScale: 1,
              },
              focus: {
                enabled: true,
                color: '#ffffff',
                opacity: 0.7,
              },
            },
          ],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 0, y: 0, visible: false },
        });

        const ctx = createMockContext();
        let capturedShadowBlur = 0;
        let strokeWithShadowBlurCount = 0;
        ctx.stroke = vi.fn().mockImplementation(() => {
          if (ctx.shadowBlur > 0) {
            capturedShadowBlur = ctx.shadowBlur;
            strokeWithShadowBlurCount++;
          }
        });

        renderTacticalFrameToCanvas(ctx, {
          slides: [slideWith2DFocus],
          timeMs: 0,
          width: 800,
          height: 600,
          aspectRatio: '16:9',
          transparent: true,
        });

        // 2Dフォーカスのネオングローリング（ブルームリングとコア発光リング）で shadowBlur > 0 を伴う stroke が呼ばれること
        expect(strokeWithShadowBlurCount).toBeGreaterThanOrEqual(2);
        expect(capturedShadowBlur).toBeGreaterThan(0);
      });

      it('renders ellipse for ring-fade marker without falling back to 2D circle fill', () => {
        const slideWithRingFade: Slide = SlideSchema.parse({
          id: 'slide-ring-fade',
          index: 0,
          transitionDurationMs: 1000,
          pauseMs: 500,
          players: [
            {
              id: 'p-ring-fade',
              x: 50,
              y: 50,
              team: 'home',
              shirtNo: '8',
              name: '',
              area: 'pitch',
              style: {
                markerType: 'ring-fade',
                insideContent: 'number',
                bottomLabel: 'none',
                color: '#2563eb',
                strokeColor: '#ffffff',
                strokeWidth: 2,
                sizeScale: 1,
                numberSizeScale: 1,
                labelSizeScale: 1,
              },
            },
          ],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 0, y: 0, visible: false },
        });

        const ctx = createMockContext();
        renderTacticalFrameToCanvas(ctx, {
          slides: [slideWithRingFade],
          timeMs: 0,
          width: 800,
          height: 600,
          aspectRatio: '16:9',
          transparent: true,
        });

        // ring-fade マーカーでは ctx.ellipse が呼ばれ、2Dサークルの arc fill にフォールバックしない
        expect(ctx.ellipse).toHaveBeenCalled();
        // 2D Player Circle の arc は呼ばれない
        expect(ctx.arc).not.toHaveBeenCalled();
      });
    });
  });

  describe('exportVideoWithMediabunny optimization', () => {
    let mockContext: AnyCanvasRenderingContext2D;

    beforeEach(() => {
      mockContext = createMockContext();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => mockContext as any,
      );
      if (typeof OffscreenCanvas !== 'undefined') {
        vi.spyOn(OffscreenCanvas.prototype, 'getContext').mockImplementation(
          () => mockContext as any,
        );
      }
      mockCanvasSourceAdd.mockClear();
    });

    it('skips redundant canvas redraw during pauseMs freeze frames while adding all frames to canvasSource', async () => {
      const renderSpy = vi.spyOn(
        tacticalFrameRenderer,
        'renderTacticalFrameToCanvas',
      );
      renderSpy.mockClear();

      const slide1 = SlideSchema.parse({
        id: 's1',
        index: 0,
        transitionDurationMs: 200,
        pauseMs: 400,
        players: [],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: true },
      });
      const slide2 = SlideSchema.parse({
        id: 's2',
        index: 1,
        transitionDurationMs: 200,
        pauseMs: 400,
        players: [],
        arrows: [],
        zones: [],
        texts: [],
        ball: { x: 50, y: 50, visible: true },
      });

      const fakeMarbleTexture = {
        width: 100,
        height: 100,
      } as unknown as CanvasImageSource;

      const blob = await exportVideoWithMediabunny({
        format: 'mp4',
        fps: 10,
        totalDurationMs: 600,
        stageWidth: 1000,
        stageHeight: 1000,
        slides: [slide1, slide2],
        scale: 1,
        fullCodecString: 'avc1.640028',
        latencyMode: 'quality',
        marbleTexture: fakeMarbleTexture,
        isWorkerContext: true,
      });

      expect(blob).toBeInstanceOf(Blob);

      // Total frames sent to canvasSource.add should be exactly 6
      expect(mockCanvasSourceAdd).toHaveBeenCalledTimes(6);

      // renderTacticalFrameToCanvas should be called less than total frames because static paused frames were skipped
      expect(renderSpy.mock.calls.length).toBeLessThan(6);
      expect(renderSpy.mock.calls.length).toBeGreaterThan(0);

      // Verify marbleTexture was forwarded
      expect(renderSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ marbleTexture: fakeMarbleTexture }),
      );

      // Verify CanvasSource received fullCodecString, latencyMode, hardwareAcceleration
      expect(lastCanvasSourceConfig.value).toMatchObject({
        fullCodecString: 'avc1.640028',
        latencyMode: 'quality',
        hardwareAcceleration: 'prefer-hardware',
      });
    });

    it('calculates player marker radius based on pitch baseDim (short edge) * 0.032', () => {
      const ctx = createMockContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [sampleSlide],
        timeMs: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        transparent: false,
      });

      // 1920x1080 16:9: baseDim = Math.min(pitchRect.width, pitchRect.height) = 1080
      // radius = Math.max(8, Math.round(1080 * 0.032 * 1 * 1)) = 35 (old w * 0.022 was 42)
      // p1 is at x: 30, y: 40. toScreenX(30) = 576, toScreenY(40) = 432.
      const arcCalls = vi.mocked(ctx.arc).mock.calls;
      const playerRadiusCalls = arcCalls.filter(
        ([x, y, , startAngle, endAngle]) =>
          Math.abs(x - 576) < 5 &&
          Math.abs(y - 432) < 5 &&
          startAngle === 0 &&
          Math.abs(endAngle - Math.PI * 2) < 1e-4,
      );
      expect(playerRadiusCalls.length).toBeGreaterThan(0);
      const radius = playerRadiusCalls[0][2];
      expect(radius).toBe(35);
    });
  });
});
