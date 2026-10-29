import { z } from 'zod';
import { FORMATION_LIST } from '@/lib/data/formations';
import { AspectRatioSchema, NormalizedCoordSchema } from './primitives';
import {
  BoundaryBoxSchema,
  PitchAppearanceConfigSchema,
  type Slide,
  SlideSchema,
} from './slide';

// ─────────────────────────────────────────
// § 8.2. フェーズ
// ─────────────────────────────────────────

export const TacticalPhaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  slides: z.array(SlideSchema).min(1),
});
export type TacticalPhase = z.infer<typeof TacticalPhaseSchema>;

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

  aspectRatio: AspectRatioSchema.default('4:5'),

  backgroundType: z.enum(['pitch', 'image', 'blank']).default('pitch'),
  backgroundImageUrl: z.string().optional(),
  pitchAppearance: PitchAppearanceConfigSchema.optional(),

  homeColor: TeamColorSchema.default({ primary: '#034694' }),
  awayColor: TeamColorSchema.default({ primary: '#ef4444' }),

  phases: z.array(TacticalPhaseSchema).min(1),
  activePhaseId: z.string(),
  activeSlideId: z.string(),

  matchId: z.string().optional(),
  matchFormations: z
    .object({
      home: z.enum(FORMATION_LIST),
      away: z.enum(FORMATION_LIST),
    })
    .optional(),
  tags: z.array(z.string()).default([]),

  thumbnail: z.string().optional(),
  screenshotSourceUrl: z.string().optional(),
  boundaryBox: BoundaryBoxSchema.optional(),
});
export type TacticalProject = z.infer<typeof TacticalProjectSchema> & {
  readonly slides: Slide[];
};

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

// ─────────────────────────────────────────
// § 13. スライド getter ユーティリティ
// ─────────────────────────────────────────

/**
 * プロジェクトオブジェクトに非列挙の slides getter を付与する。
 * イミュータブルなスプレッドコピーやシリアライズで getter が消失した場合でも、
 * 本関数を通すことで安全に project.slides へのアクセスが可能になる。
 */
export function attachProjectSlidesGetter<
  T extends { phases?: TacticalPhase[]; activePhaseId?: string },
>(project: T): T & { readonly slides: Slide[] } {
  if (!project) return project as T & { readonly slides: Slide[] };
  const desc = Object.getOwnPropertyDescriptor(project, 'slides');
  if (desc?.get) return project as T & { readonly slides: Slide[] };

  try {
    delete (project as { slides?: unknown }).slides;
  } catch {
    // ignore
  }

  try {
    Object.defineProperty(project, 'slides', {
      get(this: TacticalProject) {
        return (
          this.phases?.find((p) => p.id === this.activePhaseId)?.slides ??
          this.phases?.[0]?.slides ??
          []
        );
      },
      enumerable: false,
      configurable: true,
    });
  } catch {
    // ignore
  }
  return project as T & { readonly slides: Slide[] };
}
