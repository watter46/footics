import { z } from 'zod';
import {
  ArrowAnnotationSchema,
  TextAnnotationSchema,
  ZoneAnnotationSchema,
} from './annotations';
import { BallStateSchema } from './ball';
import {
  CameraTransitionModeSchema,
  EasingSchema,
  PitchTransformSchema,
} from './camera-config';
import { BoundaryBoxSchema, PitchAppearanceConfigSchema } from './pitch-config';
import { PlayerSchema } from './player';
import { AspectRatioSchema } from './primitives';

export {
  type CameraTransitionMode,
  CameraTransitionModeSchema,
  type Easing,
  EasingSchema,
  type PitchTransform,
  PitchTransformSchema,
} from './camera-config';
export {
  BASE_BOX,
  type BoundaryBox,
  BoundaryBoxSchema,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_BOUNDARY_BOX_1_1,
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_BOUNDARY_BOX_FULL,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  getDefaultBoundaryBoxForAspect,
  type PitchAppearanceConfig,
  PitchAppearanceConfigSchema,
  type ScreenBackgroundConfig,
  ScreenBackgroundConfigSchema,
  X_MEDIA_PRESETS,
  X_MEDIA_RATIOS,
  type XMediaPresetConfig,
  type XMediaRatio,
} from './pitch-config';

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
