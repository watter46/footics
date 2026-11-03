import { z } from 'zod';
import { PlayerTrajectorySchema } from './player';

// ─────────────────────────────────────────
// § 7. ボール
// ─────────────────────────────────────────

export const BallStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  visible: z.boolean().default(true),
  sizeScale: z.number().min(0.4).max(2.0).default(1.0).optional(),
  trajectory: PlayerTrajectorySchema.optional(),
  locked: z.boolean().optional(),
});
export type BallState = z.infer<typeof BallStateSchema>;

export const BallSchema = BallStateSchema;
export type Ball = BallState;
