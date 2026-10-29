/**
 * tactical-unified.test.ts
 * Schema validation and coordinate transform tests
 */

import { describe, expect, it } from 'vitest';
import {
  AspectRatioSchema,
  attachProjectSlidesGetter,
  BoundaryBoxSchema,
  ConnectLineSchema,
  createDefaultPhase,
  createDefaultPlayer,
  createDefaultProject,
  createDefaultSlide,
  createXBoundaryBox,
  DrawingToolSchema,
  ensureTacticalProject,
  getAspectRatioOrientation,
  isHorizontalAspectRatio,
  isVerticalAspectRatio,
  MarkerStyleSchema,
  PlayerSchema,
  SlideSchema,
  TacticalPhaseSchema,
  TacticalProjectSchema,
  transformCoord,
  transformPoints,
  X_MEDIA_PRESETS,
} from '../tactical-unified';

describe('AspectRatioSchema & Orientations', () => {
  it('4種のアスペクト比 (16:9, 9:16, 4:5, 1:1) を正常に検証できる', () => {
    expect(AspectRatioSchema.parse('16:9')).toBe('16:9');
    expect(AspectRatioSchema.parse('9:16')).toBe('9:16');
    expect(AspectRatioSchema.parse('4:5')).toBe('4:5');
    expect(AspectRatioSchema.parse('1:1')).toBe('1:1');

    expect(() => AspectRatioSchema.parse('4:3')).toThrow();
    expect(() => AspectRatioSchema.parse('invalid')).toThrow();
  });

  it('向き判定（横: 16:9 / 縦: 9:16, 4:5, 1:1）が正確に機能する', () => {
    expect(isHorizontalAspectRatio('16:9')).toBe(true);
    expect(isHorizontalAspectRatio('1:1')).toBe(false);
    expect(isHorizontalAspectRatio('9:16')).toBe(false);
    expect(isHorizontalAspectRatio('4:5')).toBe(false);

    expect(isVerticalAspectRatio('9:16')).toBe(true);
    expect(isVerticalAspectRatio('4:5')).toBe(true);
    expect(isVerticalAspectRatio('1:1')).toBe(true);
    expect(isVerticalAspectRatio('16:9')).toBe(false);

    expect(getAspectRatioOrientation('16:9')).toBe('horizontal');
    expect(getAspectRatioOrientation('1:1')).toBe('vertical');
    expect(getAspectRatioOrientation('9:16')).toBe('vertical');
    expect(getAspectRatioOrientation('4:5')).toBe('vertical');
  });
});

describe('transformCoord', () => {
  it('同じアスペクト比では変換しない', () => {
    const p = { x: 80, y: 30 };
    expect(transformCoord(p, '16:9', '16:9')).toEqual(p);
    expect(transformCoord(p, '9:16', '9:16')).toEqual(p);
    expect(transformCoord(p, '4:5', '4:5')).toEqual(p);
    expect(transformCoord(p, '1:1', '1:1')).toEqual(p);
  });

  it('同系統比率間（横: 16:9, 縦同士: 9:16 ⇄ 4:5 ⇄ 1:1）では回転せず維持される', () => {
    const p = { x: 80, y: 30 };
    expect(transformCoord(p, '9:16', '4:5')).toEqual(p);
    expect(transformCoord(p, '4:5', '9:16')).toEqual(p);
    expect(transformCoord(p, '9:16', '1:1')).toEqual(p);
    expect(transformCoord(p, '1:1', '9:16')).toEqual(p);
    expect(transformCoord(p, '4:5', '1:1')).toEqual(p);
    expect(transformCoord(p, '1:1', '4:5')).toEqual(p);
  });

  it('16:9 → 4:5 変換 (横→縦): x_v=y_h, y_v=100-x_h', () => {
    const result = transformCoord({ x: 80, y: 30 }, '16:9', '4:5');
    expect(result.x).toBeCloseTo(30);
    expect(result.y).toBeCloseTo(20);
  });

  it('16:9 → 1:1 変換 (横→縦): x_v=y_h, y_v=100-x_h', () => {
    const result = transformCoord({ x: 80, y: 30 }, '16:9', '1:1');
    expect(result.x).toBeCloseTo(30);
    expect(result.y).toBeCloseTo(20);
  });

  it('4:5 → 16:9 変換 (縦→横): x_h=100-y_v, y_h=x_v', () => {
    const result = transformCoord({ x: 30, y: 20 }, '4:5', '16:9');
    expect(result.x).toBeCloseTo(80);
    expect(result.y).toBeCloseTo(30);
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

describe('TacticalPhaseSchema', () => {
  it('createDefaultPhase が有効なフェーズを生成する', () => {
    const phase = createDefaultPhase('test-phase-id', 'Phase 1');
    const result = TacticalPhaseSchema.safeParse(phase);
    expect(result.success).toBe(true);
    expect(phase.id).toBe('test-phase-id');
    expect(phase.name).toBe('Phase 1');
    expect(phase.slides).toHaveLength(1);
  });

  it('slides が空の場合はエラー', () => {
    const phase = { id: 'p1', name: 'Phase 1', slides: [] };
    const result = TacticalPhaseSchema.safeParse(phase);
    expect(result.success).toBe(false);
  });

  it('name が空文字の場合はエラー', () => {
    const phase = {
      id: 'p1',
      name: '',
      slides: [createDefaultSlide(0)],
    };
    const result = TacticalPhaseSchema.safeParse(phase);
    expect(result.success).toBe(false);
  });
});

describe('TacticalProjectSchema', () => {
  it('createDefaultProject が有効なプロジェクトを生成する', () => {
    const project = createDefaultProject('test-id');
    const result = TacticalProjectSchema.safeParse(project);
    expect(result.success).toBe(true);
    expect(project.phases).toHaveLength(1);
    expect(project.activePhaseId).toBe(project.phases[0].id);
    expect(project.activeSlideId).toBe(project.phases[0].slides[0].id);
  });

  it('phases が空の場合はエラー', () => {
    const project = { ...createDefaultProject('test-id'), phases: [] };
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

  it('x が 0〜100 の範囲外（ピッチ外）でも許容される', () => {
    const player = {
      ...createDefaultPlayer('home', 50, 50, '#034694'),
      x: 110,
    };
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(true);
  });
});

describe('SlideSchema', () => {
  it('createDefaultSlide が有効なスライドを生成する', () => {
    const slide = createDefaultSlide(0);
    const result = SlideSchema.safeParse(slide);
    expect(result.success).toBe(true);
    expect(slide.aspectRatio).toBe('4:5');
    expect(slide.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
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

describe('MarkerStyleSchema & ConnectLineSchema & DrawingToolSchema', () => {
  it('MarkerStyleSchema が markerType: "ring-fade" を許容する', () => {
    const style = MarkerStyleSchema.parse({
      markerType: 'ring-fade',
      color: '#38bdf8',
    });
    expect(style.markerType).toBe('ring-fade');
  });

  it('MarkerStyleSchema が glowBlur と glowOpacity を検証・デフォルト値を適用する', () => {
    const styleDefault = MarkerStyleSchema.parse({
      color: '#38bdf8',
    });
    expect(styleDefault.glowBlur).toBe(50);
    expect(styleDefault.glowOpacity).toBe(1.0);

    const styleCustom = MarkerStyleSchema.parse({
      color: '#38bdf8',
      glowBlur: 75,
      glowOpacity: 0.6,
    });
    expect(styleCustom.glowBlur).toBe(75);
    expect(styleCustom.glowOpacity).toBe(0.6);

    expect(() =>
      MarkerStyleSchema.parse({
        color: '#38bdf8',
        glowBlur: -1,
      }),
    ).toThrow();
    expect(() =>
      MarkerStyleSchema.parse({
        color: '#38bdf8',
        glowBlur: 101,
      }),
    ).toThrow();
    expect(() =>
      MarkerStyleSchema.parse({
        color: '#38bdf8',
        glowOpacity: -0.1,
      }),
    ).toThrow();
    expect(() =>
      MarkerStyleSchema.parse({
        color: '#38bdf8',
        glowOpacity: 1.1,
      }),
    ).toThrow();
  });

  it('ConnectLineSchema が glowBlur と glowOpacity を検証・デフォルト値を適用する', () => {
    const clDefault = ConnectLineSchema.parse({
      id: 'cl-1',
      toPlayerId: 'p-2',
    });
    expect(clDefault.glowBlur).toBe(50);
    expect(clDefault.glowOpacity).toBe(1.0);

    const clCustom = ConnectLineSchema.parse({
      id: 'cl-2',
      toPlayerId: 'p-3',
      glowBlur: 80,
      glowOpacity: 0.4,
    });
    expect(clCustom.glowBlur).toBe(80);
    expect(clCustom.glowOpacity).toBe(0.4);

    expect(() =>
      ConnectLineSchema.parse({
        id: 'cl-3',
        toPlayerId: 'p-4',
        glowBlur: -1,
      }),
    ).toThrow();
    expect(() =>
      ConnectLineSchema.parse({
        id: 'cl-4',
        toPlayerId: 'p-5',
        glowBlur: 101,
      }),
    ).toThrow();
    expect(() =>
      ConnectLineSchema.parse({
        id: 'cl-5',
        toPlayerId: 'p-6',
        glowOpacity: -0.1,
      }),
    ).toThrow();
    expect(() =>
      ConnectLineSchema.parse({
        id: 'cl-6',
        toPlayerId: 'p-7',
        glowOpacity: 1.1,
      }),
    ).toThrow();
  });

  it('DrawingToolSchema が "player-ring-fade" を許容する', () => {
    expect(DrawingToolSchema.parse('player-ring-fade')).toBe(
      'player-ring-fade',
    );
  });
});

describe('ensureTacticalProject & attachProjectSlidesGetter', () => {
  it('旧形式データ (slides配列のみ・phasesなし) を安全に新形式 (phases配列) にマイグレーションする', () => {
    const slide1 = createDefaultSlide(0, 'slide-legacy-1');
    const legacyProject = {
      id: 'legacy-project-1',
      title: 'Legacy Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aspectRatio: '4:5',
      backgroundType: 'pitch',
      homeColor: { primary: '#034694' },
      awayColor: { primary: '#ef4444' },
      slides: [slide1],
      activeSlideId: 'slide-legacy-1',
    };

    const normalized = ensureTacticalProject(legacyProject);
    expect(normalized.phases).toHaveLength(1);
    expect(normalized.phases[0].name).toBe('Phase 1');
    expect(normalized.phases[0].slides).toHaveLength(1);
    expect(normalized.phases[0].slides[0].id).toBe('slide-legacy-1');
    expect(normalized.activePhaseId).toBe(normalized.phases[0].id);
    expect(normalized.activeSlideId).toBe('slide-legacy-1');
    expect(normalized.slides).toHaveLength(1);
    expect(normalized.slides[0].id).toBe('slide-legacy-1');
  });

  it('スプレッド構文や structuredClone で消失した slides getter を再バインドする', () => {
    const project = createDefaultProject('test-p-1');
    expect(project.slides).toHaveLength(1);

    // スプレッド構文による浅いコピー（非列挙プロパティ slides が消失）
    const shallowCopy = { ...project };
    expect((shallowCopy as any).slides).toBeUndefined();

    // ensureTacticalProject で getter を復元
    const restored = ensureTacticalProject(shallowCopy);
    expect(restored.slides).toHaveLength(1);
    expect(restored.slides[0].id).toBe(project.phases[0].slides[0].id);
  });

  it('空データまたは不正データが渡された場合はデフォルトプロジェクトにフォールバックする', () => {
    const fallbackNull = ensureTacticalProject(null);
    expect(fallbackNull.id).toBeDefined();
    expect(fallbackNull.phases).toHaveLength(1);

    const fallbackEmpty = ensureTacticalProject({});
    expect(fallbackEmpty.phases).toHaveLength(1);
    expect(fallbackEmpty.slides).toHaveLength(1);
  });
});
