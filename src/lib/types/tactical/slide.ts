import { z } from 'zod';
import {
  ArrowAnnotationSchema,
  TextAnnotationSchema,
  ZoneAnnotationSchema,
} from './annotations';
import { BallStateSchema } from './ball';
import { PlayerSchema } from './player';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  AspectRatioSchema,
  NormalizedCoordSchema,
} from './primitives';

// ─────────────────────────────────────────
// § 8. スライド (シーン)
// ─────────────────────────────────────────

export const BoundaryBoxSchema = z.object({
  x: NormalizedCoordSchema,
  y: NormalizedCoordSchema,
  width: NormalizedCoordSchema,
  height: NormalizedCoordSchema,
  enabled: z.boolean().default(true),
  visible: z.boolean().default(false).optional(),
  fitTarget: z.enum(['pitch', 'canvas', 'custom']).optional(),
});
export type BoundaryBox = z.infer<typeof BoundaryBoxSchema>;

/** ピッチ白線フィット境界線のデフォルト値 (16:9 横向き) */
export const DEFAULT_BOUNDARY_BOX_16_9: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};

/** ピッチ白線フィット境界線のデフォルト値 (9:16 縦向き) */
export const DEFAULT_BOUNDARY_BOX_9_16: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};

/** ピッチ白線フィット境界線のデフォルト値 (4:5 縦長) */
export const DEFAULT_BOUNDARY_BOX_4_5: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};

/** スクリーンショット / 画像背景時のフィット境界線（周囲にポインタハンドル用 2% の余白を持たせて配置） */
export const DEFAULT_BOUNDARY_BOX_SCREENSHOT: BoundaryBox = {
  x: 2.0,
  y: 2.0,
  width: 96.0,
  height: 96.0,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};

/** 対象比率の全画面フィット境界線 (フル領域 100x100) */
export const DEFAULT_BOUNDARY_BOX_FULL: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'canvas',
};

/** ピッチ白線フィット境界線のデフォルト値 (1:1 正方形) */
export const DEFAULT_BOUNDARY_BOX_1_1: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};

/** アスペクト比に応じたデフォルト境界線を取得 */
export function getDefaultBoundaryBoxForAspect(
  aspectRatio: AspectRatio,
): BoundaryBox {
  switch (aspectRatio) {
    case '4:5':
      return { ...DEFAULT_BOUNDARY_BOX_4_5 };
    case '9:16':
      return { ...DEFAULT_BOUNDARY_BOX_9_16 };
    case '16:9':
      return { ...DEFAULT_BOUNDARY_BOX_16_9 };
    case '1:1':
    default:
      return { ...DEFAULT_BOUNDARY_BOX_1_1 };
  }
}

/** 標準デフォルト境界線 (4:5) */
export const DEFAULT_BOUNDARY_BOX = DEFAULT_BOUNDARY_BOX_4_5;

// ─────────────────────────────────────────
// § 8.1. X (Twitter) 最適化メディア比率 & プリセット
// ─────────────────────────────────────────

export const X_MEDIA_RATIOS = {
  '4:5': 4 / 5, // 画像1枚: TL最大高さ・Dwell Time最大化 (0.80)
  '9:16': 9 / 16, // 画像2枚カルーセル / 動画: スマホ全画面 (0.5625)
  '16:9': 16 / 9, // ピッチ全体横画像: 俯瞰配置の絶対安全圏 (1.777...)
  '1:1': 1 / 1, // 正方形 (1.00)
} as const;

export type XMediaRatio = keyof typeof X_MEDIA_RATIOS;

export type XMediaPresetKey =
  | 'single_image_4_5'
  | 'carousel_image_9_16'
  | 'feed_video_9_16'
  | 'pitch_overview_16_9';

export interface XMediaPresetConfig {
  id: XMediaPresetKey;
  name: string;
  category: 'single_image' | 'carousel' | 'video' | 'overview';
  description: string;
  recommendedSize: string;
  ratio: XMediaRatio;
  numericRatio: number;
}

export const X_MEDIA_PRESETS: Record<XMediaPresetKey, XMediaPresetConfig> = {
  single_image_4_5: {
    id: 'single_image_4_5',
    name: '画像1枚 (4:5)',
    category: 'single_image',
    description: '上下切断ゼロ・TL最大高さ・Dwell Time最大化',
    recommendedSize: '1080×1350px',
    ratio: '4:5',
    numericRatio: X_MEDIA_RATIOS['4:5'],
  },
  carousel_image_9_16: {
    id: 'carousel_image_9_16',
    name: '画像2枚カルーセル (9:16)',
    category: 'carousel',
    description: '新カルーセル横スワイプ・画面完全ジャック',
    recommendedSize: '1080×1920px',
    ratio: '9:16',
    numericRatio: X_MEDIA_RATIOS['9:16'],
  },
  feed_video_9_16: {
    id: 'feed_video_9_16',
    name: '動画1本 (9:16)',
    category: 'video',
    description: 'おすすめ全画面縦フィード',
    recommendedSize: '1080×1920px',
    ratio: '9:16',
    numericRatio: X_MEDIA_RATIOS['9:16'],
  },
  pitch_overview_16_9: {
    id: 'pitch_overview_16_9',
    name: 'ピッチ全体横画像 (16:9)',
    category: 'overview',
    description: '22人配置・ピッチ俯瞰の絶対安全圏',
    recommendedSize: '1200×675px',
    ratio: '16:9',
    numericRatio: X_MEDIA_RATIOS['16:9'],
  },
};

/**
 * Xメディア比率に基づいて、キャンバスの中央に収まる BoundaryBox を正規化座標 (0-100) で算出
 * @param ratio Xメディア比率（'4:5' | '9:16' | '16:9' | '1:1' または数値）
 * @param canvasAspect キャンバスのアスペクト比（'16:9' | '9:16' | '4:5' | '1:1'）
 */
export function createXBoundaryBox(
  ratio: XMediaRatio | number,
  canvasAspect: AspectRatio = '16:9',
): BoundaryBox {
  const targetAspect =
    typeof ratio === 'number' ? ratio : (X_MEDIA_RATIOS[ratio] ?? 16 / 9);
  const stageAspect =
    ASPECT_RATIOS[canvasAspect] ?? (canvasAspect === '16:9' ? 16 / 9 : 9 / 16);

  let normWidth: number;
  let normHeight: number;

  if (targetAspect <= stageAspect) {
    // ターゲットがキャンバスより縦長（または同じ）: 高さ100%にフィット
    normHeight = 100;
    normWidth = (normHeight * targetAspect) / stageAspect;
  } else {
    // ターゲットがキャンバスより横長: 幅100%にフィット
    normWidth = 100;
    normHeight = (normWidth * stageAspect) / targetAspect;
  }

  // 小数点第2位に丸めて正規化座標を中央揃え
  const width = Math.round(normWidth * 100) / 100;
  const height = Math.round(normHeight * 100) / 100;
  const x = Math.round(((100 - width) / 2) * 100) / 100;
  const y = Math.round(((100 - height) / 2) * 100) / 100;

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    width: Math.max(0, Math.min(100, width)),
    height: Math.max(0, Math.min(100, height)),
    enabled: true,
    visible: false,
    fitTarget: 'pitch',
  };
}

export const EasingSchema = z.enum([
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
]);
export type Easing = z.infer<typeof EasingSchema>;

export const PitchTransformSchema = z.object({
  panX: z.number().default(0),
  panY: z.number().default(0),
  zoom: z.number().default(1),
  tilt: z.number().default(0),
  isLocked: z.boolean().default(true),
});
export type PitchTransform = z.infer<typeof PitchTransformSchema>;

export const PitchAppearanceConfigSchema = z.object({
  pitchBackgroundType: z.enum(['solid', 'marble']).default('solid'),
  overlayColor: z.string().default('#0B303E'),
  overlayOpacity: z.number().min(0).max(1).default(1.0),
  lineColor: z.string().default('#ffffff'),
  lineWidth: z.number().min(1).max(6).default(2.5),
  lineOpacity: z.number().min(0).max(1).default(1.0),
});
export type PitchAppearanceConfig = z.infer<typeof PitchAppearanceConfigSchema>;

export const DEFAULT_PITCH_APPEARANCE: PitchAppearanceConfig = {
  pitchBackgroundType: 'solid',
  overlayColor: '#0B303E',
  overlayOpacity: 1.0,
  lineColor: '#ffffff',
  lineWidth: 2.5,
  lineOpacity: 1.0,
};

export const SlideSchema = z.object({
  id: z.string(),
  index: z.number().int().min(0),
  label: z.string().max(50).optional(),

  players: z.array(PlayerSchema).default([]),

  arrows: z.array(ArrowAnnotationSchema).default([]),
  zones: z.array(ZoneAnnotationSchema).default([]),
  texts: z.array(TextAnnotationSchema).default([]),

  ball: BallStateSchema.default({ x: 50, y: 50, visible: true }),

  transitionDurationMs: z.number().min(100).max(10000).default(1000),
  pauseMs: z.number().min(0).max(5000).default(500),
  easing: EasingSchema.default('ease-in-out'),

  backgroundImageUrl: z.string().optional(),
  backgroundType: z.enum(['pitch', 'image', 'blank']).optional(),

  boundaryBox: BoundaryBoxSchema.optional(),
  aspectRatio: AspectRatioSchema.optional(),
  pitchTransform: PitchTransformSchema.optional(),
  pitchPosition: z.object({ x: z.number(), y: z.number() }).optional(),
  pitchAppearance: PitchAppearanceConfigSchema.optional(),
  isSidesSwapped: z.boolean().optional(),
});
export type Slide = z.infer<typeof SlideSchema>;
export type TacticalSlide = Slide;
