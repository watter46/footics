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
  type XMediaPresetKey,
} from './primitives';

// § 8. スライド (シーン)

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

const BASE_BOX: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};
export const DEFAULT_BOUNDARY_BOX_16_9: BoundaryBox = { ...BASE_BOX };
export const DEFAULT_BOUNDARY_BOX_9_16: BoundaryBox = { ...BASE_BOX };
export const DEFAULT_BOUNDARY_BOX_4_5: BoundaryBox = { ...BASE_BOX };
export const DEFAULT_BOUNDARY_BOX_SCREENSHOT: BoundaryBox = {
  x: 2.0,
  y: 2.0,
  width: 96.0,
  height: 96.0,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};
export const DEFAULT_BOUNDARY_BOX_FULL: BoundaryBox = { ...BASE_BOX };
export const DEFAULT_BOUNDARY_BOX_1_1: BoundaryBox = { ...BASE_BOX };

/** アスペクト比に応じたデフォルト境界線を取得 */
export function getDefaultBoundaryBoxForAspect(
  aspectRatio: AspectRatio,
): BoundaryBox {
  return aspectRatio === '4:5'
    ? { ...DEFAULT_BOUNDARY_BOX_4_5 }
    : aspectRatio === '9:16'
      ? { ...DEFAULT_BOUNDARY_BOX_9_16 }
      : aspectRatio === '16:9'
        ? { ...DEFAULT_BOUNDARY_BOX_16_9 }
        : { ...DEFAULT_BOUNDARY_BOX_1_1 };
}

/** 標準デフォルト境界線 (16:9) */
export const DEFAULT_BOUNDARY_BOX = DEFAULT_BOUNDARY_BOX_16_9;

// § 8.1. X (Twitter) 最適化メディア比率 & プリセット

export const X_MEDIA_RATIOS = {
  '4:5': 4 / 5,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '1:1': 1 / 1,
} as const;

export type XMediaRatio = keyof typeof X_MEDIA_RATIOS;

export interface XMediaPresetConfig {
  id?: string;
  key?: string;
  name?: string;
  label?: string;
  category?:
    | 'single_image'
    | 'carousel'
    | 'video'
    | 'overview'
    | 'square'
    | 'preset';
  description?: string;
  recommendedSize?: string;
  ratio: XMediaRatio;
  numericRatio: number;
  aspectValue?: number;
}

const c = (
  id: XMediaPresetKey,
  key: XMediaPresetKey,
  name: string,
  category: XMediaPresetConfig['category'],
  ratio: XMediaRatio,
  numericRatio: number,
): XMediaPresetConfig => ({
  id,
  key,
  name,
  label: name,
  category,
  description: name,
  recommendedSize: '',
  ratio,
  numericRatio,
  aspectValue: numericRatio,
});

const P_4_5 = c(
  'portrait_4_5',
  'portrait_4_5',
  '4:5 (縦長)',
  'single_image',
  '4:5',
  0.8,
);
const P_9_16_C = c(
  'carousel_image_9_16',
  'vertical_9_16',
  '9:16 (カルーセル)',
  'carousel',
  '9:16',
  9 / 16,
);
const P_9_16_V = c(
  'feed_video_9_16',
  'vertical_9_16',
  '9:16 (動画)',
  'video',
  '9:16',
  9 / 16,
);
const P_16_9 = c(
  'pitch_overview_16_9',
  'landscape_16_9',
  '16:9 (俯瞰)',
  'overview',
  '16:9',
  16 / 9,
);
const P_1_1 = c(
  'square_1_1',
  'square_1_1',
  '1:1 (スクエア)',
  'square',
  '1:1',
  1,
);
const P_FIT = c(
  'pitch_fit',
  'pitch_fit',
  'ピッチ外枠フィット',
  'preset',
  '16:9',
  16 / 9,
);

export const X_MEDIA_PRESETS: Record<XMediaPresetKey, XMediaPresetConfig> = {
  single_image_4_5: P_4_5,
  portrait_4_5: P_4_5,
  carousel_image_9_16: P_9_16_C,
  vertical_9_16: P_9_16_V,
  feed_video_9_16: P_9_16_V,
  pitch_overview_16_9: P_16_9,
  landscape_16_9: P_16_9,
  square_1_1: P_1_1,
  pitch_fit: P_FIT,
};

/**
 * Xメディア比率に基づいて、キャンバスの中央に収まる BoundaryBox を正規化座標 (0-100) で算出
 */
export function createXBoundaryBox(
  ratio: XMediaRatio | number,
  canvasAspect: AspectRatio = '16:9',
): BoundaryBox {
  const targetAspect =
    typeof ratio === 'number' ? ratio : (X_MEDIA_RATIOS[ratio] ?? 16 / 9);
  const stageAspect =
    ASPECT_RATIOS[canvasAspect] ?? (canvasAspect === '16:9' ? 16 / 9 : 9 / 16);
  const isTaller = targetAspect <= stageAspect;
  const normWidth = isTaller ? (100 * targetAspect) / stageAspect : 100;
  const normHeight = isTaller ? 100 : (100 * stageAspect) / targetAspect;

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
    fitTarget: 'canvas',
  };
}

export const EasingSchema = z.enum([
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
]);
export type Easing = z.infer<typeof EasingSchema>;

export const CameraTransitionModeSchema = z.enum([
  'sync',
  'slow',
  'continuous',
  'cut',
]);
export type CameraTransitionMode = z.infer<typeof CameraTransitionModeSchema>;

export const PitchTransformSchema = z.object({
  panX: z.number().default(0),
  panY: z.number().default(0),
  zoom: z.number().default(1),
  tilt: z.number().default(0),
  yaw: z.number().default(90).optional(),
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

export const ScreenBackgroundConfigSchema = z.object({
  type: z.enum(['cinematic', 'dark']).default('cinematic'),
});
export type ScreenBackgroundConfig = z.infer<
  typeof ScreenBackgroundConfigSchema
>;
export const DEFAULT_SCREEN_BACKGROUND: ScreenBackgroundConfig = {
  type: 'cinematic',
};

export const SlideSchema = z.object({
  id: z.string(),
  index: z.number().int().min(0),
  label: z.string().max(200).optional(),
  players: z.array(PlayerSchema).default([]),
  arrows: z.array(ArrowAnnotationSchema).default([]),
  zones: z.array(ZoneAnnotationSchema).default([]),
  texts: z.array(TextAnnotationSchema).default([]),
  ball: BallStateSchema.default({ x: 50, y: 50, visible: true }),
  transitionDurationMs: z.number().min(100).max(30000).default(1000),
  pauseMs: z.number().min(0).max(10000).default(500),
  easing: EasingSchema.default('ease-in-out'),
  cameraTransitionMode: CameraTransitionModeSchema.default('sync').optional(),
  cameraDurationMs: z.number().min(500).max(60000).default(10000).optional(),
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
