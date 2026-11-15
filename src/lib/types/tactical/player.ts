import { z } from 'zod';
import {
  ConnectLineSchema,
  MarkerEffectConfigSchema,
  MarkerStyleSchema,
  PlayerBadgeSchema,
  PlayerFocusSchema,
  PlayerTrajectoryEffectConfigSchema,
  VisionConeSchema,
} from './effect-config';
import { NormalizedCoordSchema } from './primitives';

export {
  type ConnectLine,
  ConnectLineSchema,
  type MarkerEffectConfig,
  MarkerEffectConfigSchema,
  type MarkerEffectType,
  MarkerEffectTypeSchema,
  type MarkerStyle,
  MarkerStyleSchema,
  type PlayerBadge,
  PlayerBadgeSchema,
  type PlayerFocus,
  PlayerFocusSchema,
  type PlayerTrajectoryEffectConfig,
  PlayerTrajectoryEffectConfigSchema,
  type VisionCone,
  VisionConeSchema,
} from './effect-config';

// 選手移動軌道 (Phase 28b)
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
  trajectoryEffect: PlayerTrajectoryEffectConfigSchema.optional(),
  markerEffect: MarkerEffectConfigSchema.optional(),
  locked: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});
export type Player = z.infer<typeof PlayerSchema>;
export type TacticalPlayer = Player;
