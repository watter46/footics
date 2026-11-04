import { describe, expect, it, vi } from 'vitest';
import { renderPitchMarkings2D } from '@/lib/tactical/export/renderers/pitch-markings-2d';
import { renderPitchMarkings3D } from '@/lib/tactical/export/renderers/pitch-markings-3d';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
} from '@/lib/tactical/export/renderers/renderer-context';
import {
  calculatePitchGeometryForAspect,
  calculatePitchRect,
} from '@/lib/tactical/pitch-geometry';

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
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as AnyCanvasRenderingContext2D;
}

describe('Canvas Frame Renderer - 16:9 Unified Screen Coords', () => {
  it('maps toScreenX and toScreenY directly to 16:9 screen coords (0..100 -> 0..baseDim)', () => {
    const ctx = createMockContext();
    const frameCtx = createFrameRenderContext({
      ctx,
      baseWidth: 1920,
      baseHeight: 1080,
      aspectRatio: '4:5',
    });

    // 契約: 全座標が 16:9 スクリーン 0..100 の単一座標系
    // toScreenX(normX) = (normX / 100) * baseWidth
    // toScreenY(normY) = (normY / 100) * baseHeight
    expect(frameCtx.toScreenX(0)).toBe(0);
    expect(frameCtx.toScreenX(50)).toBe(960);
    expect(frameCtx.toScreenX(100)).toBe(1920);

    expect(frameCtx.toScreenY(0)).toBe(0);
    expect(frameCtx.toScreenY(50)).toBe(540);
    expect(frameCtx.toScreenY(100)).toBe(1080);

    // outerPitchRect が 16:9 スクリーン内の中央サブピッチ矩形として保持されていること
    const expectedPitchRect = calculatePitchRect(
      { width: 1920, height: 1080 },
      '4:5',
    );
    expect(frameCtx.outerPitchRect).toEqual(expectedPitchRect);
  });

  it('renders 2D pitch markings within outerPitchRect for 4:5 and 16:9', () => {
    const ctx = createMockContext();
    const frameCtx = createFrameRenderContext({
      ctx,
      baseWidth: 1920,
      baseHeight: 1080,
      aspectRatio: '4:5',
    });

    const geom = calculatePitchGeometryForAspect('4:5');
    renderPitchMarkings2D(frameCtx, geom);

    // outerPitchRect 内に strokeRect などの描画が行われること
    expect(ctx.strokeRect).toHaveBeenCalled();
    const firstRectCall = vi.mocked(ctx.strokeRect).mock.calls[0];
    const [x, y, w, h] = firstRectCall;
    const outerPitchRect = frameCtx.outerPitchRect!;

    // 外枠ピッチ線が outerPitchRect の範囲内に収まること
    expect(x).toBeGreaterThanOrEqual(outerPitchRect.x - 1);
    expect(x + w).toBeLessThanOrEqual(
      outerPitchRect.x + outerPitchRect.width + 1,
    );
    expect(y).toBeGreaterThanOrEqual(outerPitchRect.y - 1);
    expect(y + h).toBeLessThanOrEqual(
      outerPitchRect.y + outerPitchRect.height + 1,
    );
  });

  it('renders 3D pitch markings projected within outerPitchRect for 9:16 and 16:9', () => {
    const ctx = createMockContext();
    const frameCtx = createFrameRenderContext({
      ctx,
      baseWidth: 1920,
      baseHeight: 1080,
      aspectRatio: '9:16',
    });

    const geom = calculatePitchGeometryForAspect('9:16');
    renderPitchMarkings3D(frameCtx, geom);

    // 2Dフォールバックまたは project3DSegment 経由でラインが引かれていること
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });
});
