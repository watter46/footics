import { z } from 'zod';

// ─────────────────────────────────────────
// カメラ・トランジション・3Dピッチ変形設定
// ─────────────────────────────────────────

export const EasingSchema = z.enum([
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
]);
export type Easing = z.infer<typeof EasingSchema>;

export const CameraTransitionModeSchema = z.enum([
  'sync',
  'slow',
  'continuous',
  'cut',
]);
export type CameraTransitionMode = z.infer<typeof CameraTransitionModeSchema>;

export const GlobalCameraKeyframeSchema = z.object({
  id: z.string(),
  timeMs: z.number().min(0),
  tilt: z.number().min(0).max(65),
  yaw: z.number(),
  easing: EasingSchema.default('ease-in-out').optional(),
});
export type GlobalCameraKeyframe = z.infer<typeof GlobalCameraKeyframeSchema>;

export const ActionCameraCueSchema = z.object({
  id: z.string(),
  startTimeMs: z.number().min(0),
  durationMs: z.number().min(100).default(1000),
  transitionInMs: z.number().min(0).optional(),
  holdMs: z.number().min(0).default(0).optional(),
  returnDurationMs: z.number().min(100).default(800).optional(),
  zoom: z.number().min(0.4).max(3.0),
  panX: z.number(),
  panY: z.number(),
  autoReturn: z.boolean().default(false),
  easing: EasingSchema.default('ease-in-out').optional(),
});
export type ActionCameraCue = z.infer<typeof ActionCameraCueSchema>;

export const DirectorCameraTrackSchema = z.object({
  enabled: z.boolean().default(true),
  globalKeyframes: z.array(GlobalCameraKeyframeSchema).default([]),
  actionCues: z.array(ActionCameraCueSchema).default([]),
});
export type DirectorCameraTrack = z.infer<typeof DirectorCameraTrackSchema>;

export const PitchTransformSchema = z.object({
  panX: z.number().default(0),
  panY: z.number().default(0),
  zoom: z.number().default(1),
  tilt: z.number().default(0),
  yaw: z.number().default(90).optional(),
  isLocked: z.boolean().default(true),
});
export type PitchTransform = z.infer<typeof PitchTransformSchema>;
