import { z } from 'zod';
import { FORMATION_LIST } from '@/lib/data/formations';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import {
  DomainArrowAnnotationSchema,
  DomainBallStateSchema,
  DomainPlayerSchema,
  DomainTextAnnotationSchema,
  DomainZoneAnnotationSchema,
} from '@/lib/types/tactical/domain-entities';
import { AspectRatioSchema } from '@/lib/types/tactical/primitives';
import {
  DirectorCameraTrackSchema,
  TeamColorSchema,
} from '@/lib/types/tactical/project';
import {
  BoundaryBoxSchema,
  CameraTransitionModeSchema,
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  EasingSchema,
  PitchAppearanceConfigSchema,
  PitchTransformSchema,
  ScreenBackgroundConfigSchema,
} from '@/lib/types/tactical/slide';

export const DomainSlideSchema = z
  .object({
    id: z.string(),
    index: z.number().int().min(0),
    label: z.string().max(200).optional(),
    players: z.array(DomainPlayerSchema).default([]),
    arrows: z.array(DomainArrowAnnotationSchema).default([]),
    zones: z.array(DomainZoneAnnotationSchema).default([]),
    texts: z.array(DomainTextAnnotationSchema).default([]),
    ball: DomainBallStateSchema.default({
      x: clampToScreenNorm(50),
      y: clampToScreenNorm(50),
      visible: true,
    }),
    transitionDurationMs: z.number().min(100).max(30000).default(1000),
    pauseMs: z.number().min(0).max(10000).default(500),
    easing: EasingSchema.default('ease-in-out'),
    cameraTransitionMode: CameraTransitionModeSchema.default('sync').optional(),
    cameraDurationMs: z.number().min(500).max(60000).default(10000).optional(),
    pitchTransform: PitchTransformSchema.optional(),
    isSidesSwapped: z.boolean().optional(),
  })
  .strict();
export type DomainSlide = Readonly<z.infer<typeof DomainSlideSchema>>;

export const DomainTacticalPhaseSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1).max(200),
    aspectRatio: AspectRatioSchema.default('4:5'),
    boundaryBox: BoundaryBoxSchema,
    backgroundType: z.enum(['pitch', 'image', 'blank']).default('pitch'),
    backgroundImageUrl: z.string().optional(),
    directorCamera: DirectorCameraTrackSchema.optional(),
    slides: z.array(DomainSlideSchema).min(1),
  })
  .strict();
export type DomainTacticalPhase = Readonly<
  z.infer<typeof DomainTacticalPhaseSchema>
>;

export const DomainTacticalProjectSchema = z
  .object({
    id: z.string(),
    version: z.literal('3.0.0').default('3.0.0'),
    title: z.string().max(500).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    homeColor: TeamColorSchema.default({ primary: '#034694' }),
    awayColor: TeamColorSchema.default({ primary: '#ef4444' }),
    pitchAppearance: PitchAppearanceConfigSchema.default(
      DEFAULT_PITCH_APPEARANCE,
    ),
    screenBackground: ScreenBackgroundConfigSchema.default(
      DEFAULT_SCREEN_BACKGROUND,
    ),
    phases: z.array(DomainTacticalPhaseSchema).min(1),
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
  })
  .strict();
export type DomainTacticalProject = Readonly<
  z.infer<typeof DomainTacticalProjectSchema>
>;
