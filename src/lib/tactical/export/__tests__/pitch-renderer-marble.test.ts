import { describe, expect, it, vi } from 'vitest';
import type { PitchAppearanceConfig } from '@/lib/types/tactical-unified';
import { renderPitch, renderPitchMarkings } from '../renderers/pitch-renderer';
import type { FrameRenderContext } from '../renderers/renderer-context';
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
  } as unknown as AnyCanvasRenderingContext2D;
}

function createMockFrameContext(
  ctx: AnyCanvasRenderingContext2D,
  w = 1000,
  h = 1000,
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

describe('pitch-renderer marble background', () => {
  it('renders marble texture with clip and overlay when pitchBackgroundType is marble', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1000, 1000);

    const appearance: PitchAppearanceConfig = {
      pitchBackgroundType: 'marble',
      overlayColor: '#0B303E',
      overlayOpacity: 0.85,
      lineColor: '#ffffff',
      lineWidth: 3,
      lineOpacity: 0.9,
    };

    const mockTexture = {
      width: 679,
      height: 800,
    } as unknown as CanvasImageSource;

    renderPitch(frameCtx, '1:1', false, appearance, mockTexture);

    // 1. Clips pitch inner area
    expect(ctx.clip).toHaveBeenCalled();
    // 2. Draws marble texture with drawImage
    expect(ctx.drawImage).toHaveBeenCalledWith(
      mockTexture,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    // 3. Overlay composite operation applied
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('renders solid background when pitchBackgroundType is solid or not provided', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1000, 1000);

    renderPitch(frameCtx, '16:9', false);

    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('applies pitch appearance line settings to markings', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1000, 1000);

    const appearance: PitchAppearanceConfig = {
      pitchBackgroundType: 'solid',
      overlayColor: '#0B303E',
      overlayOpacity: 1.0,
      lineColor: '#00ffcc',
      lineWidth: 4,
      lineOpacity: 0.75,
    };

    renderPitchMarkings(frameCtx, '16:9', appearance);

    expect(ctx.strokeStyle).toBe('#00ffcc');
    expect(ctx.lineWidth).toBe(4);
    expect(ctx.globalAlpha).toBe(0.75);
  });

  it('preserves default pitch markings when pitchAppearance is undefined', () => {
    const ctx = createMockContext();
    const frameCtx = createMockFrameContext(ctx, 1000, 1000);

    renderPitchMarkings(frameCtx, '16:9');

    expect(ctx.strokeStyle).toBe('#e2b48d');
    expect(ctx.globalAlpha).toBe(0.85);
  });

  it('forwards pitchAppearance and marbleTexture from renderTacticalFrameToCanvas to renderPitch', () => {
    const ctx = createMockContext();

    const appearance: PitchAppearanceConfig = {
      pitchBackgroundType: 'marble',
      overlayColor: '#0B303E',
      overlayOpacity: 0.9,
      lineColor: '#ffffff',
      lineWidth: 2.5,
      lineOpacity: 1.0,
    };

    const mockTexture = {
      width: 679,
      height: 800,
    } as unknown as CanvasImageSource;

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
      width: 1000,
      height: 1000,
      aspectRatio: '1:1',
      pitchAppearance: appearance,
      marbleTexture: mockTexture,
    });

    expect(ctx.drawImage).toHaveBeenCalled();
  });
});
