import { z } from 'zod';
import { FORMATION_LIST } from '@/lib/data/formations';
import { DirectorCameraTrackSchema } from './camera-config';
import {
  BoundaryBoxSchema,
  DEFAULT_PHASE_BOUNDARY_BOX,
  PitchAppearanceConfigSchema,
  ScreenBackgroundConfigSchema,
} from './pitch-config';
import { AspectRatioSchema } from './primitives';
import { TeamColorSchema } from './project-config';
import { type Slide, SlideSchema } from './slide';

export {
  type ActionCameraCue,
  ActionCameraCueSchema,
  type DirectorCameraTrack,
  DirectorCameraTrackSchema,
  type GlobalCameraKeyframe,
  GlobalCameraKeyframeSchema,
} from './camera-config';
export { DEFAULT_PHASE_BOUNDARY_BOX } from './pitch-config';
export {
  type DrawingTool,
  DrawingToolSchema,
  type ExportProgress,
  type ExportTarget,
  ExportTargetSchema,
  type FormationPreset,
  FormationPresetPlayerSchema,
  FormationPresetSchema,
  type SeasonFormationPreset,
  SeasonFormationPresetSchema,
  type TeamColor,
  TeamColorSchema,
} from './project-config';

export const TacticalPhaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  aspectRatio: AspectRatioSchema.default('4:5').optional(),
  boundaryBox: BoundaryBoxSchema.default(DEFAULT_PHASE_BOUNDARY_BOX).optional(),
  directorCamera: DirectorCameraTrackSchema.optional(),
  slides: z.array(SlideSchema).min(1),
});
export type TacticalPhase = z.infer<typeof TacticalPhaseSchema>;

export const TacticalProjectSchema = z.object({
  id: z.string(),
  version: z.literal('2.0.0').default('2.0.0'),
  title: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  aspectRatio: AspectRatioSchema.default('4:5'),

  backgroundType: z.enum(['pitch', 'image', 'blank']).default('pitch'),
  backgroundImageUrl: z.string().optional(),
  pitchAppearance: PitchAppearanceConfigSchema.optional(),
  screenBackground: ScreenBackgroundConfigSchema.default({
    type: 'cinematic',
  }).optional(),

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
  /**
   * @deprecated Phase 構造化に伴い project.phases[].slides の参照を推奨。
   * 下位互換性のために attachProjectSlidesGetter で注入される非列挙ゲッター。
   */
  readonly slides: Slide[];
};

/**
 * TacticalProject に互換用 slides ゲッターを非列挙プロパティとして注入する。
 * JSON.stringify / structuredClone / Dexie 保存時にシリアライズされない。
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
