import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScreenBackgroundConfig } from '@/lib/types/tactical-unified';
import {
  clearPitchRendererCache,
  renderPitch,
} from '../renderers/pitch-renderer';
import type { FrameRenderContext } from '../renderers/renderer-context';
import {
  type AnyCanvasRenderingContext2D,
  renderTacticalFrameToCanvas,
} from '../tactical-frame-renderer';

interface MockGradient {
  addColorStop: ReturnType<typeof vi.fn>;
}

interface FillRectCall {
  x: number;
  y: number;
  w: number;
  h: number;
  fillStyle: unknown;
}

function createMockContext(): AnyCanvasRenderingContext2D & {
  mockGradients: MockGradient[];
  fillRectCalls: FillRectCall[];
} {
  const mockGradients: MockGradient[] = [];
  const fillRectCalls: FillRectCall[] = [];

  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      fillRectCalls.push({ x, y, w, h, fillStyle: ctx.fillStyle });
    }),
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
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(
      (
        _x0: number,
        _y0: number,
        _r0: number,
        _x1: number,
        _y1: number,
        _r1: number,
      ) => {
        const grad: MockGradient = {
          addColorStop: vi.fn(),
        };
        mockGradients.push(grad);
        return grad as unknown as CanvasGradient;
      },
    ),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
    mockGradients,
    fillRectCalls,
  } as unknown as AnyCanvasRenderingContext2D & {
    mockGradients: MockGradient[];
    fillRectCalls: FillRectCall[];
  };

  return ctx;
}

function createMockFrameContext(
  ctx: AnyCanvasRenderingContext2D,
  w = 1920,
  h = 1080,
): FrameRenderContext {
  return {
    ctx,
    w,
    h,
    m: null,
    toScreenX: (x: number) => (x / 100) * w,
    toScreenY: (y: number) => (y / 100) * h,
    toScreenSizeX: (s: number) => (s / 100) * w,
    toScreenSizeY: (s: number) => (s / 100) * h,
    projectObjToScreen: (x: number, y: number) => ({
      x: (x / 100) * w,
      y: (y / 100) * h,
    }),
    snap: (v: number) => Math.round(v),
  };
}

describe('pitch-renderer cinematic and screen background', () => {
  beforeEach(() => {
    clearPitchRendererCache();
  });

  it('renders cinematic radial gradient by default and caches gradient instance for same size', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1920, 1080);

    // 1st render: cache miss -> createRadialGradient called
    renderPitch(frameCtx, '16:9', false);

    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1);
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(
      960,
      540,
      0,
      960,
      540,
      960, // Math.max(1920, 1080) / 2
    );

    const grad = ctx.mockGradients[0];
    expect(grad.addColorStop).toHaveBeenCalledWith(0, '#2B2B2B');
    expect(grad.addColorStop).toHaveBeenCalledWith(1, '#050505');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);

    // 2nd render: same size -> cache hit -> createRadialGradient NOT called again
    renderPitch(frameCtx, '16:9', false, undefined, null, {
      type: 'cinematic',
    });
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1);
  });

  it('clears cache when clearPitchRendererCache is invoked', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1920, 1080);

    renderPitch(frameCtx, '16:9', false);
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1);

    clearPitchRendererCache();

    renderPitch(frameCtx, '16:9', false);
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(2);
  });

  it('creates separate cache entries for different frame sizes', () => {
    const ctx = createMockContext();
    const frameCtx1 = createMockFrameContext(ctx, 1920, 1080);
    const frameCtx2 = createMockFrameContext(ctx, 1280, 720);

    renderPitch(frameCtx1, '16:9', false);
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1);

    renderPitch(frameCtx2, '16:9', false);
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(2);
    expect(ctx.createRadialGradient).toHaveBeenLastCalledWith(
      640,
      360,
      0,
      640,
      360,
      640,
    );
  });

  it('renders solid dark background (#0D0D0E) without creating gradient when screenBackground is dark', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1920, 1080);
    const screenBg: ScreenBackgroundConfig = { type: 'dark' };

    renderPitch(frameCtx, '16:9', false, undefined, null, screenBg);

    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
    const frameFill = ctx.fillRectCalls.find(
      (c) => c.x === 0 && c.y === 0 && c.w === 1920 && c.h === 1080,
    );
    expect(frameFill?.fillStyle).toBe('#0D0D0E');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
  });

  it('clears context and returns early when transparent is true', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1920, 1080);

    renderPitch(frameCtx, '16:9', true, undefined, null, { type: 'dark' });

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  });

  it('forwards screenBackground from renderTacticalFrameToCanvas to renderPitch', () => {
    const ctx = createMockContext();

    renderTacticalFrameToCanvas(ctx, {
      slides: [
        {
          id: 's1',
          index: 0,
          players: [],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 50, y: 50, visible: true },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'ease-in-out',
        },
      ],
      timeMs: 0,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      screenBackground: { type: 'dark' },
    });

    const frameFill = ctx.fillRectCalls.find(
      (c) => c.x === 0 && c.y === 0 && c.w === 1920 && c.h === 1080,
    );
    expect(frameFill?.fillStyle).toBe('#0D0D0E');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
  });
});
