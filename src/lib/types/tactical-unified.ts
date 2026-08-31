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

/** 正規化座標 0.0 ～ 100.0 */
export const NormalizedCoordSchema = z.number().min(0).max(100);

/** アスペクト比 */
export const AspectRatioSchema = z.enum(['16:9', '9:16']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

/** 正規化座標点 */
export const NormalizedPointSchema = z.object({
  x: NormalizedCoordSchema,
  y: NormalizedCoordSchema,
});
export type NormalizedPoint = z.infer<typeof NormalizedPointSchema>;

// ─────────────────────────────────────────
// § 2. 幾何変換ユーティリティ型
// ─────────────────────────────────────────

/** 正規化座標の幾何変換ロジック（16:9 ⇄ 9:16） */
export function transformCoord(
  point: { x: number; y: number },
  from: AspectRatio,
  to: AspectRatio,
): { x: number; y: number } {
  if (from === to) {
    return {
      x: Math.max(0, Math.min(100, point.x)),
      y: Math.max(0, Math.min(100, point.y)),
    };
  }

  if (from === '16:9' && to === '9:16') {
    // 横→縦: x_v = y_h, y_v = 100 - x_h
    return {
      x: Math.max(0, Math.min(100, point.y)),
      y: Math.max(0, Math.min(100, 100 - point.x)),
    };
  }
  // 縦→横: x_h = 100 - y_v, y_h = x_v
  return {
    x: Math.max(0, Math.min(100, 100 - point.y)),
    y: Math.max(0, Math.min(100, point.x)),
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
    .default('#fbbf24'),
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
});
export type Player = z.infer<typeof PlayerSchema>;

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
});
export type ArrowAnnotation = z.infer<typeof ArrowAnnotationSchema>;

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
});
export type ZoneAnnotation = z.infer<typeof ZoneAnnotationSchema>;

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
});
export type TextAnnotation = z.infer<typeof TextAnnotationSchema>;

// ─────────────────────────────────────────
// § 7. ボール
// ─────────────────────────────────────────

export const BallStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  visible: z.boolean().default(true),
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
});
export type BoundaryBox = z.infer<typeof BoundaryBoxSchema>;

/** ピッチ白線フィット境界線のデフォルト値 (16:9 横向き) */
export const DEFAULT_BOUNDARY_BOX_16_9: BoundaryBox = {
  x: 7.25,
  y: 0.43,
  width: 85.5,
  height: 99.14,
  enabled: true,
};

/** ピッチ白線フィット境界線のデフォルト値 (9:16 縦向き) */
export const DEFAULT_BOUNDARY_BOX_9_16: BoundaryBox = {
  x: 0.43,
  y: 7.25,
  width: 99.14,
  height: 85.5,
  enabled: true,
};

/** 標準デフォルト境界線 (16:9) */
export const DEFAULT_BOUNDARY_BOX = DEFAULT_BOUNDARY_BOX_16_9;

export const EasingSchema = z.enum([
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
]);
export type Easing = z.infer<typeof EasingSchema>;

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
});
export type Slide = z.infer<typeof SlideSchema>;

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
  'zone_circle',
  'polygon_zone',
  'eraser',
  'player',
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
): Player[] {
  const homePlayers: Player[] = DEFAULT_442_HOME.map((p) => {
    const pl = createDefaultPlayer('home', p.x, p.y, homeColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  const awayPlayers: Player[] = DEFAULT_442_HOME.map((p) => {
    const pl = createDefaultPlayer('away', 100 - p.x, p.y, awayColor);
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
    createdAt: now,
    updatedAt: now,
    aspectRatio: '16:9',
    backgroundType: 'pitch',
    homeColor,
    awayColor,
    activeSlideId: slideId,
    boundaryBox: { ...DEFAULT_BOUNDARY_BOX_16_9 },
    slides: [
      createDefaultSlide(0, slideId, homeColor.primary, awayColor.primary),
    ],
    tags: [],
  };
}

export function createDefaultSlide(
  index: number,
  id?: string,
  homeColor?: string,
  awayColor?: string,
  boundaryBox: BoundaryBox = DEFAULT_BOUNDARY_BOX_16_9,
): Slide {
  return {
    id: id ?? crypto.randomUUID(),
    index,
    label: `Scene ${index + 1}`,
    players: createDefault442Players(homeColor, awayColor),
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: 50, y: 50, visible: true },
    boundaryBox: { ...boundaryBox },
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
