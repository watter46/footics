/**
 * tactical-unified.ts
 * Contract-First Schema — Unified Tactical Canvas
 *
 * 座標系: 正規化座標 (0.0 ～ 100.0) を採用。
 * アスペクト比変換は transformCoord() ユーティリティで保証。
 */

import { z } from 'zod';

// ─────────────────────────────────────────
// § 1. Primitives
// ─────────────────────────────────────────

/** 正規化座標 (ピッチ外・オーバーフロー許容) */
export const NormalizedCoordSchema = z.number();

/** アスペクト比: 16:9 (横), 9:16 (縦), 4:5 (縦長タイムライン), 1:1 (正方形) */
export const AspectRatioSchema = z.enum(['16:9', '9:16', '4:5', '1:1']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '4:5': 4 / 5,
  '1:1': 1,
};

export function isVerticalAspectRatio(ratio: AspectRatio): boolean {
  return ratio === '9:16' || ratio === '4:5' || ratio === '1:1';
}

export function isHorizontalAspectRatio(ratio: AspectRatio): boolean {
  return ratio === '16:9';
}

export function getAspectRatioOrientation(
  ratio: AspectRatio,
): 'horizontal' | 'vertical' {
  return isVerticalAspectRatio(ratio) ? 'vertical' : 'horizontal';
}

/** 正規化座標点 */
export const NormalizedPointSchema = z.object({
  x: NormalizedCoordSchema,
  y: NormalizedCoordSchema,
});
export type NormalizedPoint = z.infer<typeof NormalizedPointSchema>;

// ─────────────────────────────────────────
// § 2. 幾何変換ユーティリティ型
// ─────────────────────────────────────────

/** 正規化座標の幾何変換ロジック（16:9, 9:16, 4:5, 1:1 間） */
export function transformCoord(
  point: { x: number; y: number },
  from: AspectRatio,
  to: AspectRatio,
): { x: number; y: number } {
  const clampedX = Math.max(0, Math.min(100, point.x));
  const clampedY = Math.max(0, Math.min(100, point.y));

  if (from === to) {
    return {
      x: clampedX,
      y: clampedY,
    };
  }

  const fromVertical = isVerticalAspectRatio(from);
  const toVertical = isVerticalAspectRatio(to);

  // 同系統（横同士: 16:9、縦同士: 9:16 ⇄ 4:5 ⇄ 1:1）の場合、向きは変わらないためそのまま維持
  if (fromVertical === toVertical) {
    return {
      x: clampedX,
      y: clampedY,
    };
  }

  // 横→縦: x_v = y_h, y_v = 100 - x_h
  if (!fromVertical && toVertical) {
    return {
      x: clampedY,
      y: Math.max(0, Math.min(100, 100 - clampedX)),
    };
  }

  // 縦→横: x_h = 100 - y_v, y_h = x_v
  return {
    x: Math.max(0, Math.min(100, 100 - clampedY)),
    y: clampedX,
  };
}

/** NormalizedPoint 配列に変換を適用 */
export function transformPoints(
  points: Array<{ x: number; y: number }>,
  from: AspectRatio,
  to: AspectRatio,
): Array<{ x: number; y: number }> {
  return points.map((p) => transformCoord(p, from, to));
}

// ─────────────────────────────────────────
// § 3. マーカー (選手アイコン) スタイル
// ─────────────────────────────────────────

export const MarkerStyleSchema = z.object({
  markerType: z.enum(['circle', 'ring']).optional().default('circle'),
  insideContent: z.enum(['number', 'photo', 'none']).default('number'),
  photoUrl: z.string().url().optional(),
  bottomLabel: z.enum(['name', 'number', 'none']).default('name'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  strokeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  strokeWidth: z.number().min(0).max(5).default(2),
  sizeScale: z.number().min(0.4).max(2.0).default(1.0),
  numberSizeScale: z.number().min(0.6).max(1.8).default(1.0),
  labelSizeScale: z.number().min(0.6).max(1.8).default(1.0),
});
export type MarkerStyle = z.infer<typeof MarkerStyleSchema>;

// ─────────────────────────────────────────
// § 4. ネストアノテーション群 (選手配下)
// ─────────────────────────────────────────

/** 視野コーン — 選手配下にネスト */
export const VisionConeSchema = z.object({
  id: z.string(),
  angleRad: z
    .number()
    .min(0)
    .max(Math.PI * 2),
  spreadRad: z.number().min(0.1).max(Math.PI),
  radius: NormalizedCoordSchema.default(13),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#3b82f6'),
  opacity: z.number().min(0).max(1).default(0.3),
  visible: z.boolean().default(true),
});
export type VisionCone = z.infer<typeof VisionConeSchema>;

/** コネクトライン — 選手間の関係線 */
export const ConnectLineSchema = z.object({
  id: z.string(),
  toPlayerId: z.string(),
  lineStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  strokeWidth: z.number().min(1).max(8).default(3.5),
  visible: z.boolean().default(true),
});
export type ConnectLine = z.infer<typeof ConnectLineSchema>;

/** バッジ — 選手配下にネスト */
export const PlayerBadgeSchema = z.object({
  id: z.string(),
  label: z.string().max(20),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#f59e0b'),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#000000'),
  offsetX: z.number().default(0),
  offsetY: z.number().default(-12),
  visible: z.boolean().default(true),
});
export type PlayerBadge = z.infer<typeof PlayerBadgeSchema>;

/** 選手フォーカス (スポットライト強調) */
export const PlayerFocusSchema = z.object({
  enabled: z.boolean().default(true),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  radius: z.number().min(1).max(10).default(3),
  opacity: z.number().min(0.1).max(0.9).default(0.35),
  style: z.enum(['spotlight', 'ring', 'halo']).default('spotlight'),
});
export type PlayerFocus = z.infer<typeof PlayerFocusSchema>;

/** 選手移動軌道 (ベジェ曲線 / 直線) */
export const PlayerTrajectorySchema = z.object({
  type: z
    .enum(['straight', 'arc_left', 'arc_right', 'custom'])
    .default('straight'),
  curveOffset: z.number().optional(),
  controlPoint: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type PlayerTrajectory = z.infer<typeof PlayerTrajectorySchema>;

// ─────────────────────────────────────────
// § 5. Player オブジェクト
// ─────────────────────────────────────────

export const PlayerSchema = z.object({
  id: z.string(),
  playerId: z.string().optional(),
  name: z.string().optional(),
  shirtNo: z.string().optional(),
  position: z.string().optional(),
  team: z.enum(['home', 'away', 'neutral']),
  area: z.enum(['pitch', 'bench']),

  x: NormalizedCoordSchema,
  y: NormalizedCoordSchema,

  style: MarkerStyleSchema,

  visionCone: VisionConeSchema.optional(),
  connectLines: z.array(ConnectLineSchema).default([]),
  badges: z.array(PlayerBadgeSchema).default([]),
  focus: PlayerFocusSchema.optional(),
  trajectory: PlayerTrajectorySchema.optional(),
  locked: z.boolean().optional(),
});
export type Player = z.infer<typeof PlayerSchema>;
export type TacticalPlayer = Player;

// ─────────────────────────────────────────
// § 6. フリーアノテーション群
// ─────────────────────────────────────────

export const ArrowAnnotationSchema = z.object({
  id: z.string(),
  annotationType: z.literal('arrow'),
  arrowType: z
    .enum([
      'pass',
      'move',
      'dribble',
      'defend',
      'run',
      'line',
      'route_line',
      'generic',
    ])
    .default('pass'),
  curveType: z.enum(['straight', 'curved', 'arc']).default('straight'),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  controlPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  strokeWidth: z.number().min(1).max(10).default(3),
  dashArray: z.array(z.number()).default([]),
  arrowHead: z.boolean().default(true),
  endMarker: z.enum(['none', 'arrow', 'dot']).optional(),
  startMarker: z.enum(['none', 'arrow', 'dot']).optional(),
  label: z.string().max(50).optional(),
  sourcePlayerId: z.string().optional(),
  targetPlayerId: z.string().optional(),
  locked: z.boolean().optional(),
});
export type ArrowAnnotation = z.infer<typeof ArrowAnnotationSchema>;
export type Arrow = ArrowAnnotation;

export const ZoneAnnotationSchema = z.object({
  id: z.string(),
  annotationType: z.literal('zone'),
  zoneType: z.enum([
    'highlight',
    'space',
    'danger',
    'pressing',
    'buildup',
    'generic',
  ]),
  shapeType: z.enum(['rect', 'ellipse', 'polygon']).optional(),
  // 幾何プロパティ (自由正規化座標)
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  // 多角形頂点 (polygon 用) または四角形頂点
  points: z.array(z.object({ x: z.number(), y: z.number() })).default([]),
  isComplete: z.boolean().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#f59e0b'),
  opacity: z.number().min(0).max(1).default(0.25),
  strokeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  strokeWidth: z.number().min(0).max(8).default(0),
  label: z.string().max(50).optional(),
  locked: z.boolean().optional(),
});
export type ZoneAnnotation = z.infer<typeof ZoneAnnotationSchema>;
export type Zone = ZoneAnnotation;

export const TextAnnotationSchema = z.object({
  id: z.string(),
  annotationType: z.literal('text'),
  x: z.number(),
  y: z.number(),
  content: z.string().max(200),
  fontSize: z.number().min(8).max(72).default(16),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  locked: z.boolean().optional(),
});
export type TextAnnotation = z.infer<typeof TextAnnotationSchema>;

// ─────────────────────────────────────────
// § 7. ボール
// ─────────────────────────────────────────

export const BallStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  visible: z.boolean().default(true),
  trajectory: PlayerTrajectorySchema.optional(),
  locked: z.boolean().optional(),
});
export type BallState = z.infer<typeof BallStateSchema>;

// ─────────────────────────────────────────
// § 8. スライド (シーン)
// ─────────────────────────────────────────

export const BoundaryBoxSchema = z.object({
  x: NormalizedCoordSchema,
  y: NormalizedCoordSchema,
  width: NormalizedCoordSchema,
  height: NormalizedCoordSchema,
  enabled: z.boolean().default(true),
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
  fitTarget: 'pitch',
};

/** ピッチ白線フィット境界線のデフォルト値 (9:16 縦向き) */
export const DEFAULT_BOUNDARY_BOX_9_16: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  fitTarget: 'pitch',
};

/** ピッチ白線フィット境界線のデフォルト値 (4:5 縦長) */
export const DEFAULT_BOUNDARY_BOX_4_5: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  fitTarget: 'pitch',
};

/** スクリーンショット / 画像背景時のフィット境界線（周囲にポインタハンドル用 2% の余白を持たせて配置） */
export const DEFAULT_BOUNDARY_BOX_SCREENSHOT: BoundaryBox = {
  x: 2.0,
  y: 2.0,
  width: 96.0,
  height: 96.0,
  enabled: true,
  fitTarget: 'pitch',
};

/** 対象比率の全画面フィット境界線 (フル領域 100x100) */
export const DEFAULT_BOUNDARY_BOX_FULL: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  fitTarget: 'canvas',
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
    default:
      return { ...DEFAULT_BOUNDARY_BOX_FULL };
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
  isLocked: z.boolean().default(false),
});
export type PitchTransform = z.infer<typeof PitchTransformSchema>;

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
});
export type Slide = z.infer<typeof SlideSchema>;
export type TacticalSlide = Slide;

// ─────────────────────────────────────────
// § 9. プロジェクト全体
// ─────────────────────────────────────────

export const TeamColorSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const TacticalProjectSchema = z.object({
  id: z.string(),
  version: z.literal('2.0.0').default('2.0.0'),
  title: z.string().max(100).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  aspectRatio: AspectRatioSchema.default('16:9'),

  backgroundType: z.enum(['pitch', 'image', 'blank']).default('pitch'),
  backgroundImageUrl: z.string().optional(),

  homeColor: TeamColorSchema.default({ primary: '#034694' }),
  awayColor: TeamColorSchema.default({ primary: '#ef4444' }),

  slides: z.array(SlideSchema).min(1),
  activeSlideId: z.string(),

  matchId: z.string().optional(),
  tags: z.array(z.string()).default([]),

  thumbnail: z.string().optional(),
  screenshotSourceUrl: z.string().optional(),
  boundaryBox: BoundaryBoxSchema.optional(),
});
export type TacticalProject = z.infer<typeof TacticalProjectSchema>;

// ─────────────────────────────────────────
// § 10. エクスポート設定スキーマ
// ─────────────────────────────────────────

export const ExportTargetSchema = z.discriminatedUnion('format', [
  z.object({
    format: z.literal('png'),
    scope: z.enum(['current', 'all', 'selected']),
    selectedSlideIds: z.array(z.string()).optional(),
    scale: z.number().min(1).max(4).default(2),
  }),
  z.object({
    format: z.literal('zip'),
    scope: z.literal('all'),
    scale: z.number().min(1).max(4).default(2),
  }),
  z.object({
    format: z.literal('mp4'),
    scope: z.enum(['all', 'range']).default('all'),
    fromSlideId: z.string().optional(),
    toSlideId: z.string().optional(),
    fps: z.enum(['30', '60']).default('60'),
    quality: z.enum(['low', 'medium', 'high']).default('high'),
    bitrateMbps: z.enum(['8', '12', '24']).default('24').optional(),
    h264Profile: z
      .enum(['baseline', 'main', 'high'])
      .default('high')
      .optional(),
    keyFrameIntervalSec: z.enum(['1', '2', '5', '10']).default('2').optional(),
    latencyMode: z.enum(['realtime', 'quality']).default('realtime').optional(),
    maxQueueSize: z.enum(['60', '240']).default('60').optional(),
    scale: z.number().min(1).max(4).default(2),
  }),
  z.object({
    format: z.literal('webm'),
    scope: z.enum(['all', 'range']).default('all'),
    fromSlideId: z.string().optional(),
    toSlideId: z.string().optional(),
    fps: z.enum(['30', '60']).default('60'),
    transparent: z.boolean().default(true),
    keyFrameIntervalSec: z.enum(['1', '2', '5', '10']).default('2').optional(),
    latencyMode: z.enum(['realtime', 'quality']).default('realtime').optional(),
    maxQueueSize: z.enum(['60', '240']).default('60').optional(),
    scale: z.number().min(1).max(4).default(2),
  }),
  z.object({
    format: z.literal('gif'),
    scope: z.enum(['all', 'range']).default('all'),
    fromSlideId: z.string().optional(),
    toSlideId: z.string().optional(),
    fps: z.enum(['10', '15', '24']).default('15'),
  }),
]);
export type ExportTarget = z.infer<typeof ExportTargetSchema>;

export interface ExportProgress {
  percent: number;
  stage: 'rendering' | 'encoding' | 'finalizing' | 'idle';
  message: string;
}

// ─────────────────────────────────────────
// § 11. フォーメーションプリセット用型
// ─────────────────────────────────────────

export const FormationPresetPlayerSchema = z.object({
  shirtNo: z.string(),
  position: z.string(),
  x: NormalizedCoordSchema,
  y: NormalizedCoordSchema,
});

export const FormationPresetSchema = z.object({
  name: z.string(),
  team: z.enum(['home', 'away', 'neutral']),
  players: z.array(FormationPresetPlayerSchema),
});
export type FormationPreset = z.infer<typeof FormationPresetSchema>;

export const SeasonFormationPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  teamName: z.string().optional(),
  season: z.string().optional(),
  mode: z.enum(['full', 'half']).default('half'),
  formation: z.string(),
  players: z.array(FormationPresetPlayerSchema),
});
export type SeasonFormationPreset = z.infer<typeof SeasonFormationPresetSchema>;

// ─────────────────────────────────────────
// § 12. 描画ツール種別
// ─────────────────────────────────────────

export const DrawingToolSchema = z.enum([
  'select',
  'line',
  'route_line',
  'arrow_solid',
  'arrow_dash',
  'arrow_wavy',
  'zone_circle',
  'polygon_zone',
  'eraser',
  'player',
  'player-ring',
  'arrow-straight',
  'arrow-curved',
  'zone',
  'text',
  'badge',
  'vision-cone',
  'connect-line',
  'pan',
]);
export type DrawingTool = z.infer<typeof DrawingToolSchema>;

// ─────────────────────────────────────────
// § 13. Factory 関数
// ─────────────────────────────────────────

export const DEFAULT_442_HOME: Array<{
  shirtNo: string;
  position: string;
  x: number;
  y: number;
}> = [
  { shirtNo: '1', position: 'GK', x: 10, y: 50 },
  { shirtNo: '2', position: 'RB', x: 25, y: 20 },
  { shirtNo: '5', position: 'CB', x: 25, y: 37 },
  { shirtNo: '6', position: 'CB', x: 25, y: 63 },
  { shirtNo: '3', position: 'LB', x: 25, y: 80 },
  { shirtNo: '7', position: 'RM', x: 45, y: 20 },
  { shirtNo: '8', position: 'CM', x: 45, y: 37 },
  { shirtNo: '4', position: 'CM', x: 45, y: 63 },
  { shirtNo: '11', position: 'LM', x: 45, y: 80 },
  { shirtNo: '9', position: 'CF', x: 63, y: 37 },
  { shirtNo: '10', position: 'CF', x: 63, y: 63 },
];

export function createDefault442Players(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '16:9',
): Player[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  const homePlayers: Player[] = DEFAULT_442_HOME.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('home', pos.x, pos.y, homeColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  const awayPlayers: Player[] = DEFAULT_442_HOME.map((p) => {
    const rawPos = { x: 100 - p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('away', pos.x, pos.y, awayColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  return [...homePlayers, ...awayPlayers];
}

export function createDefaultProject(id: string): TacticalProject {
  const now = new Date().toISOString();
  const slideId = crypto.randomUUID();
  const homeColor = { primary: '#034694' };
  const awayColor = { primary: '#ef4444' };

  return {
    id,
    version: '2.0.0',
    title: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    aspectRatio: '4:5',
    backgroundType: 'pitch',
    homeColor,
    awayColor,
    activeSlideId: slideId,
    boundaryBox: { ...DEFAULT_BOUNDARY_BOX_4_5 },
    slides: [
      createDefaultSlide(
        0,
        slideId,
        homeColor.primary,
        awayColor.primary,
        DEFAULT_BOUNDARY_BOX_4_5,
        '4:5',
      ),
    ],
    tags: [],
  };
}

export function createDefaultSlide(
  index: number,
  id?: string,
  homeColor?: string,
  awayColor?: string,
  boundaryBox: BoundaryBox = DEFAULT_BOUNDARY_BOX_4_5,
  aspectRatio: AspectRatio = '4:5',
): Slide {
  return {
    id: id ?? crypto.randomUUID(),
    index,
    label: `Scene ${index + 1}`,
    aspectRatio,
    players: createDefault442Players(homeColor, awayColor, aspectRatio),
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: 50, y: 50, visible: true },
    boundaryBox: { ...boundaryBox },
    backgroundType: 'pitch',
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'ease-in-out',
  };
}

export function createDefaultPlayer(
  team: 'home' | 'away' | 'neutral',
  x: number,
  y: number,
  primaryColor: string,
): Player {
  return {
    id: crypto.randomUUID(),
    team,
    area: 'pitch',
    x,
    y,
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color: primaryColor,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    },
    connectLines: [],
    badges: [],
  };
}

// ─────────────────────────────────────────
// § 16. Capture Protocol Contracts (Web <-> Extension)
// ─────────────────────────────────────────

export {
  createTacticalCapturePayload,
  type FooticsRequestPendingCaptureMessage,
  FooticsRequestPendingCaptureMessageSchema,
  type FooticsTacticalCaptureMessage,
  FooticsTacticalCaptureMessageSchema,
  isTacticalCapturePayload,
  type RequestTabCaptureResponse,
  RequestTabCaptureResponseSchema,
  type SendCaptureToTacticalRequest,
  SendCaptureToTacticalRequestSchema,
  type SendCaptureToTacticalResponse,
  SendCaptureToTacticalResponseSchema,
  safeParseTacticalCapturePayload,
  TACTICAL_BRIDGE_CHANNEL,
  TACTICAL_BRIDGE_MESSAGE_TYPES,
  TACTICAL_CAPTURE_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  TACTICAL_STORAGE_KEYS,
  type TacticalBroadcastMessage,
  TacticalBroadcastMessageSchema,
  type TacticalCaptureEventPayload,
  TacticalCaptureEventPayloadSchema,
  type TacticalCapturePayload,
  TacticalCapturePayloadSchema,
  validateTacticalCapturePayload,
} from './capture-protocol';
