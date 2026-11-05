import { describe, expect, it, vi } from 'vitest';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core/utils/canvas-pitch-transform-helper';
import {
  calculatePitchGeometryForAspect,
  calculatePitchRect,
} from '@/lib/tactical/pitch-geometry';
import { renderPitchMarkings3D } from '../pitch-markings-3d';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
} from '../renderer-context';

describe('renderPitchMarkings3D - Vertical Pitch Proportion & Dual Scaling Elimination', () => {
  const w = 1920;
  const h = 1080;
  const aspectRatio = '4:5';
  const geom = calculatePitchGeometryForAspect(aspectRatio);
  const outerPitchRect = calculatePitchRect(
    { width: w, height: h },
    aspectRatio,
  );

  const createMockContext = () => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let currentX = 0;
    let currentY = 0;

    const ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn((x: number, y: number) => {
        currentX = x;
        currentY = y;
      }),
      lineTo: vi.fn((x: number, y: number) => {
        lines.push({ x1: currentX, y1: currentY, x2: x, y2: y });
        currentX = x;
        currentY = y;
      }),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
    } as unknown as AnyCanvasRenderingContext2D;

    return { ctx, lines };
  };

  it('1. 正面 (tilt: 0, yaw: 90) の 3D 投影で 4:5 ピッチの横幅が二重縮小されず outerPitchRect.width と一致すること', () => {
    const { ctx, lines } = createMockContext();
    const pitchTransform = {
      tilt: 0,
      yaw: 90,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };
    // MVP 行列を明示的に注入して 3D 投影パイプラインを通す
    const mvpMatrix = new Float32Array(
      buildExportMVPMatrix(pitchTransform, w, h, aspectRatio),
    );

    const frameCtx = createFrameRenderContext({
      ctx,
      baseWidth: w,
      baseHeight: h,
      aspectRatio,
      mvpMatrix,
    });

    renderPitchMarkings3D(frameCtx, geom);

    // lines から描画された線分の X 座標の最小値と最大値を算出
    expect(lines.length).toBeGreaterThan(0);
    const minX = Math.min(...lines.flatMap((l) => [l.x1, l.x2]));
    const maxX = Math.max(...lines.flatMap((l) => [l.x1, l.x2]));
    const renderedWidth = maxX - minX;

    // outerPitchRect.width は 864px。
    // ピッチ白線は 3% 余白内側なので:
    // pitchWidthPx = outerPitchRect.width * (1 - 0.06) ≈ 812px
    // 二重縮小が発生していると renderedWidth は 約 365px (0.45 * 812) になってしまう
    expect(renderedWidth).toBeGreaterThan(700);
    expect(renderedWidth).toBeCloseTo(
      outerPitchRect.width * (geom.pitchWidth / geom.config.widthPx),
      1,
    );
    expect(minX).toBeCloseTo(
      outerPitchRect.x +
        outerPitchRect.width * (geom.pitchLeft / geom.config.widthPx),
      1,
    );
  });

  it('2. tilt: 30度 を適用しても、ピッチ横幅の基本プロポーションが維持され二重縮小で細くならないこと', () => {
    const { ctx, lines } = createMockContext();
    const pitchTransform = {
      tilt: 30,
      yaw: 90,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };
    const mvpMatrix = new Float32Array(
      buildExportMVPMatrix(pitchTransform, w, h, aspectRatio),
    );

    const frameCtx = createFrameRenderContext({
      ctx,
      baseWidth: w,
      baseHeight: h,
      aspectRatio,
      mvpMatrix,
    });

    renderPitchMarkings3D(frameCtx, geom);

    expect(lines.length).toBeGreaterThan(0);
    const minX = Math.min(...lines.flatMap((l) => [l.x1, l.x2]));
    const maxX = Math.max(...lines.flatMap((l) => [l.x1, l.x2]));
    const renderedWidth = maxX - minX;

    // tilt 30度でも手前側の横幅は 700px 以上を維持（二重縮小なら 400px 未満に潰れる）
    expect(renderedWidth).toBeGreaterThan(700);
  });

  it('3. 正面 (tilt: 0, yaw: 90) の 2D スクリーン座標と 3D 投影座標が同一点になり完全一致すること', () => {
    const { ctx } = createMockContext();
    const pitchTransform = {
      tilt: 0,
      yaw: 90,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };
    const mvpMatrix = new Float32Array(
      buildExportMVPMatrix(pitchTransform, w, h, aspectRatio),
    );

    const frameCtx2D = createFrameRenderContext({
      ctx,
      baseWidth: w,
      baseHeight: h,
      aspectRatio,
      mvpMatrix: null,
    });

    const frameCtx3D = createFrameRenderContext({
      ctx,
      baseWidth: w,
      baseHeight: h,
      aspectRatio,
      mvpMatrix,
    });

    // 4:5 における代表的な選手座標群 (norm100X, norm100Y)
    const testPoints = [
      { x: 50, y: 50 }, // センターサークル
      { x: 37.31, y: 30 }, // 4:5 LW (xMin ≈ 28.85% の内側)
      { x: 62.69, y: 30 }, // 4:5 RW
      { x: 50, y: 97 }, // Home GK (ゴールライン上)
    ];

    for (const pt of testPoints) {
      const p2d = frameCtx2D.projectObjToScreen(pt.x, pt.y);
      const p3d = frameCtx3D.projectObjToScreen(pt.x, pt.y);

      expect(p3d.x).toBeCloseTo(p2d.x, 1);
      expect(p3d.y).toBeCloseTo(p2d.y, 1);
    }
  });
});
