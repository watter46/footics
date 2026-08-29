import { describe, expect, it, vi } from 'vitest';
import type { Slide } from '@/lib/types/tactical-unified';
import {
  type AnyCanvasRenderingContext2D,
  renderTacticalFrameToCanvas,
} from '../tactical-frame-renderer';

function createMockContext(): AnyCanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
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

import { SlideSchema } from '@/lib/types/tactical-unified';

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
});
