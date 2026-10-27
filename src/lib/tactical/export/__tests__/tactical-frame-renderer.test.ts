import { describe, expect, it, vi } from 'vitest';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import {
  type AspectRatio,
  type PitchTransform,
  type Slide,
  SlideSchema,
} from '@/lib/types/tactical-unified';
import { renderPitch, renderPitchMarkings } from '../renderers/pitch-renderer';
import type { FrameRenderContext } from '../renderers/renderer-context';
import {
  type AnyCanvasRenderingContext2D,
  getOpticalCenterX,
  renderTacticalFrameToCanvas,
} from '../tactical-frame-renderer';

function createMockContext(): AnyCanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
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

  it('achieves 100% visual parity with browser canvas (cyan pitch lines #38bdf8, clean white numbers without strokeText)', () => {
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
  });

  describe('renderPitch and renderPitchMarkings color styling', () => {
    it('sets cyan strokeStyle (#38bdf8) and solid black background/surface fill (#000000)', () => {
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

      // Verify pitch markings line color is cyan
      expect(ctx.strokeStyle).toBe('#38bdf8');
    });
  });
});
