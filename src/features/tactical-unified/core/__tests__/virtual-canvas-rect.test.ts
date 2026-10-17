import { describe, expect, it } from 'vitest';
import { calculateVirtualCanvasRect } from '../utils/virtual-canvas-rect';

describe('calculateVirtualCanvasRect', () => {
  it('calculates contain rectangle for horizontal container and 16:9 image', () => {
    // 横長コンテナ (1200 x 600, aspect = 2.0)
    // 16:9 画像 (aspect = 16/9 = 1.777...)
    // コンテナの方が横長のため、高さで制約され左右に均等センタリング余白ができる
    const container = { width: 1200, height: 600 };
    const aspect = 16 / 9;

    const rect = calculateVirtualCanvasRect(container, aspect);

    expect(rect.height).toBe(600);
    expect(rect.width).toBeCloseTo(600 * (16 / 9), 1);
    expect(rect.y).toBe(0);
    expect(rect.x).toBeCloseTo((1200 - rect.width) / 2, 1);
    // スケールは基準幅（1920）に対する比率
    expect(rect.scale).toBeCloseTo(rect.width / 1920, 3);
  });

  it('calculates contain rectangle for vertical container and 16:9 image', () => {
    // 縦長コンテナ (800 x 1000, aspect = 0.8)
    // 16:9 画像 (aspect = 1.777...)
    // コンテナの方が縦長のため、幅で制約され上下に均等センタリング余白ができる
    const container = { width: 800, height: 1000 };
    const aspect = 16 / 9;

    const rect = calculateVirtualCanvasRect(container, aspect);

    expect(rect.width).toBe(800);
    expect(rect.height).toBeCloseTo(800 / (16 / 9), 1);
    expect(rect.x).toBe(0);
    expect(rect.y).toBeCloseTo((1000 - rect.height) / 2, 1);
    expect(rect.scale).toBeCloseTo(rect.width / 1920, 3);
  });

  it('calculates contain rectangle for vertical image (9:16) in square container', () => {
    // 正方形コンテナ (1000 x 1000, aspect = 1.0)
    // 9:16 画像 (aspect = 9/16 = 0.5625)
    // 高さで制約される
    const container = { width: 1000, height: 1000 };
    const aspect = 9 / 16;

    const rect = calculateVirtualCanvasRect(container, aspect);

    expect(rect.height).toBe(1000);
    expect(rect.width).toBeCloseTo(1000 * (9 / 16), 1);
    expect(rect.y).toBe(0);
    expect(rect.x).toBeCloseTo((1000 - rect.width) / 2, 1);
    // 縦長画像の場合、基準幅 1080 に対するスケール
    expect(rect.scale).toBeCloseTo(rect.width / 1080, 3);
  });

  it('handles zero or negative container dimensions gracefully', () => {
    const invalidContainer = { width: 0, height: 0 };
    const rect = calculateVirtualCanvasRect(invalidContainer, 16 / 9);

    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
    });
  });
});
