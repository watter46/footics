/**
 * tactical-unified.test.ts
 * Schema validation and coordinate transform tests
 */

import { describe, expect, it } from 'vitest';
import {
  BoundaryBoxSchema,
  createDefaultPlayer,
  createDefaultProject,
  createDefaultSlide,
  createXBoundaryBox,
  PlayerSchema,
  SlideSchema,
  TacticalProjectSchema,
  transformCoord,
  transformPoints,
  X_MEDIA_PRESETS,
} from '../tactical-unified';

describe('transformCoord', () => {
  it('同じアスペクト比では変換しない', () => {
    const p = { x: 80, y: 30 };
    expect(transformCoord(p, '16:9', '16:9')).toEqual(p);
    expect(transformCoord(p, '9:16', '9:16')).toEqual(p);
  });

  it('16:9 → 9:16 変換: x_v=y_h, y_v=100-x_h', () => {
    const result = transformCoord({ x: 80, y: 30 }, '16:9', '9:16');
    expect(result.x).toBeCloseTo(30);
    expect(result.y).toBeCloseTo(20);
  });

  it('9:16 → 16:9 変換: x_h=100-y_v, y_h=x_v', () => {
    const result = transformCoord({ x: 30, y: 20 }, '9:16', '16:9');
    expect(result.x).toBeCloseTo(80);
    expect(result.y).toBeCloseTo(30);
  });

  it('往復変換で元の値に戻る', () => {
    const original = { x: 65, y: 42 };
    const converted = transformCoord(original, '16:9', '9:16');
    const back = transformCoord(converted, '9:16', '16:9');
    expect(back.x).toBeCloseTo(original.x, 5);
    expect(back.y).toBeCloseTo(original.y, 5);
  });

  it('座標が 0〜100 にクランプされる', () => {
    const result = transformCoord({ x: -10, y: 110 }, '16:9', '9:16');
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThanOrEqual(100);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(100);
  });
});

describe('transformPoints', () => {
  it('複数点を一括変換する', () => {
    const pts = [
      { x: 80, y: 30 },
      { x: 50, y: 50 },
    ];
    const result = transformPoints(pts, '16:9', '9:16');
    expect(result).toHaveLength(2);
    expect(result[0]?.x).toBeCloseTo(30);
    expect(result[1]?.x).toBeCloseTo(50);
  });
});

describe('TacticalProjectSchema', () => {
  it('createDefaultProject が有効なプロジェクトを生成する', () => {
    const project = createDefaultProject('test-id');
    const result = TacticalProjectSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it('slides が空の場合はエラー', () => {
    const project = { ...createDefaultProject('test-id'), slides: [] };
    const result = TacticalProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });
});

describe('PlayerSchema', () => {
  it('createDefaultPlayer が有効な選手を生成する', () => {
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(true);
  });

  it('x が 0〜100 の範囲外はエラー', () => {
    const player = {
      ...createDefaultPlayer('home', 50, 50, '#034694'),
      x: 110,
    };
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(false);
  });
});

describe('SlideSchema', () => {
  it('createDefaultSlide が有効なスライドを生成する', () => {
    const slide = createDefaultSlide(0);
    const result = SlideSchema.safeParse(slide);
    expect(result.success).toBe(true);
    expect(slide.boundaryBox).toEqual({
      x: 7.25,
      y: 0.43,
      width: 85.5,
      height: 99.14,
      enabled: true,
    });
  });
});

describe('BoundaryBoxSchema & X Media Presets', () => {
  it('BoundaryBoxSchema が境界線プロパティを安全に検証する', () => {
    const box = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
    };
    const parsed = BoundaryBoxSchema.parse(box);
    expect(parsed.enabled).toBe(true);
    expect(parsed.width).toBe(80);

    const defaultParsed = BoundaryBoxSchema.parse({
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    });
    expect(defaultParsed.enabled).toBe(true);
  });

  it('X_MEDIA_PRESETS に要件の主要4プリセットが定義されている', () => {
    expect(X_MEDIA_PRESETS.single_image_4_5).toBeDefined();
    expect(X_MEDIA_PRESETS.single_image_4_5.ratio).toBe('4:5');
    expect(X_MEDIA_PRESETS.carousel_image_9_16).toBeDefined();
    expect(X_MEDIA_PRESETS.carousel_image_9_16.ratio).toBe('9:16');
    expect(X_MEDIA_PRESETS.feed_video_9_16).toBeDefined();
    expect(X_MEDIA_PRESETS.feed_video_9_16.ratio).toBe('9:16');
    expect(X_MEDIA_PRESETS.pitch_overview_16_9).toBeDefined();
    expect(X_MEDIA_PRESETS.pitch_overview_16_9.ratio).toBe('16:9');
  });

  it('createXBoundaryBox: 16:9キャンバス上で4:5比率を中央配置する', () => {
    const box = createXBoundaryBox('4:5', '16:9');
    expect(box.enabled).toBe(true);
    // 4:5 はキャンバス (16:9) より縦長のため、高さ100%になり幅が (100 * 0.8 / (16/9)) = 45%
    expect(box.height).toBe(100);
    expect(box.width).toBe(45);
    expect(box.x).toBe(27.5);
    expect(box.y).toBe(0);
  });

  it('createXBoundaryBox: 16:9キャンバス上で16:9比率の場合は全画面フィット', () => {
    const box = createXBoundaryBox('16:9', '16:9');
    expect(box.width).toBe(100);
    expect(box.height).toBe(100);
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
  });

  it('createXBoundaryBox: 9:16キャンバス上で9:16比率の場合は全画面フィット', () => {
    const box = createXBoundaryBox('9:16', '9:16');
    expect(box.width).toBe(100);
    expect(box.height).toBe(100);
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
  });

  it('createXBoundaryBox: 9:16キャンバス上で4:5比率（横長）を配置した場合は幅100%にフィット', () => {
    const box = createXBoundaryBox('4:5', '9:16');
    // 4:5 (0.8) > 9:16 (0.5625) なので幅100%、高さは (100 * (9/16) / 0.8) = 70.31%
    expect(box.width).toBe(100);
    expect(box.height).toBeCloseTo(70.31, 1);
    expect(box.x).toBe(0);
    expect(box.y).toBeCloseTo(14.84, 1);
  });
});
