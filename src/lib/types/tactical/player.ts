import { z } from 'zod';
import { type EffectExitAction, EffectExitActionSchema } from './annotations';
import { NormalizedCoordSchema } from './primitives';

// ─────────────────────────────────────────
// § 3. マーカー (選手アイコン) スタイル
// ─────────────────────────────────────────

export const MarkerEffectTypeSchema = z.enum(['none', 'ripple']);
export type MarkerEffectType = z.infer<typeof MarkerEffectTypeSchema>;

export const MarkerEffectConfigSchema = z.object({
  type: MarkerEffectTypeSchema.default('none'),
  delay: z.number().min(0).max(10).default(0.0),
  duration: z.number().min(0.1).max(10).default(1.0),
  ringsCount: z.number().min(1).max(8).default(3),
  repeatCount: z.number().min(0).max(100).default(2),
  maxRadiusScale: z.number().min(1.0).max(10.0).default(2.5),
  exitAction: EffectExitActionSchema.default('keep'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type MarkerEffectConfig = z.infer<typeof MarkerEffectConfigSchema>;

export const MarkerStyleSchema = z.object({
  markerType: z
    .enum(['circle', 'ring', 'ring-fade'])
    .optional()
    .default('circle'),
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
  glowBlur: z.number().min(0).max(100).default(50).optional(),
  glowOpacity: z.number().min(0).max(1).default(1.0).optional(),
  markerEffect: MarkerEffectConfigSchema.optional(),
  transparentBackground: z.boolean().default(false).optional(),
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
    .max(Math.PI * 2 + 0.1),
  spreadRad: z.number().min(0.1).max(Math.PI),
  radius: NormalizedCoordSchema.default(13),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#38bdf8'),
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
  glowBlur: z.number().min(0).max(100).default(50).optional(),
  glowOpacity: z.number().min(0).max(1).default(1.0).optional(),
  visible: z.boolean().default(true),
});
export type ConnectLine = z.infer<typeof ConnectLineSchema>;

/** バッジ — 選手配下にネスト */
export const PlayerBadgeSchema = z.object({
  id: z.string(),
  label: z.string().max(100),
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

/** 選手移動ゴースト軌跡エフェクト設定 */
export const PlayerTrajectoryEffectConfigSchema = z.object({
  enabled: z.boolean().default(false),
  lineStyle: z.enum(['solid', 'dashed']).default('solid'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  exitAction: z.enum(['keep', 'auto-hide']).default('keep'),
});
export type PlayerTrajectoryEffectConfig = z.infer<
  typeof PlayerTrajectoryEffectConfigSchema
>;

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
  trajectoryEffect: PlayerTrajectoryEffectConfigSchema.optional(),
  markerEffect: MarkerEffectConfigSchema.optional(),
  locked: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});
export type Player = z.infer<typeof PlayerSchema>;
export type TacticalPlayer = Player;
