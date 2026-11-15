import { z } from 'zod';
import { NormalizedCoordSchema } from './primitives';

// ─────────────────────────────────────────
// チームカラー・エクスポート設定・プリセット・描画ツール
// ─────────────────────────────────────────

export const TeamColorSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type TeamColor = z.infer<typeof TeamColorSchema>;

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
]);
export type ExportTarget = z.infer<typeof ExportTargetSchema>;

export interface ExportProgress {
  percent: number;
  stage: 'rendering' | 'encoding' | 'finalizing' | 'idle';
  message: string;
}

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
  'player-ring-fade',
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
