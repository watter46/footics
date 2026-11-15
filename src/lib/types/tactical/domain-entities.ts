import { z } from 'zod';
import {
  ScreenNormCoordSchema,
  ScreenNormPointSchema,
} from '@/lib/types/tactical/branded';
import {
  ArrowEffectConfigSchema,
  ConnectLineSchema,
  MarkerEffectConfigSchema,
  MarkerStyleSchema,
  PlayerBadgeSchema,
  PlayerFocusSchema,
  PlayerTrajectoryEffectConfigSchema,
  VisionConeSchema,
  ZoneEffectConfigSchema,
} from '@/lib/types/tactical/effect-config';

// (a) Player 直和型: PitchPlayer | BenchPlayer
const BasePlayerFields = {
  id: z.string(),
  playerId: z.string().optional(),
  name: z.string().optional(),
  shirtNo: z.string().optional(),
  position: z.string().optional(),
  team: z.enum(['home', 'away', 'neutral']),
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
  style: MarkerStyleSchema,
  locked: z.boolean().optional(),
  isCustom: z.boolean().optional(),
};

export const DomainPlayerTrajectorySchema = z.object({
  type: z
    .enum(['straight', 'arc_left', 'arc_right', 'custom'])
    .default('straight'),
  curveOffset: z.number().optional(),
  controlPoint: ScreenNormPointSchema.optional(),
});
export type DomainPlayerTrajectory = Readonly<
  z.infer<typeof DomainPlayerTrajectorySchema>
>;

export const PitchPlayerSchema = z
  .object({
    ...BasePlayerFields,
    area: z.literal('pitch'),
    visionCone: VisionConeSchema.optional(),
    connectLines: z.array(ConnectLineSchema).default([]),
    badges: z.array(PlayerBadgeSchema).default([]),
    focus: PlayerFocusSchema.optional(),
    trajectory: DomainPlayerTrajectorySchema.optional(),
    trajectoryEffect: PlayerTrajectoryEffectConfigSchema.optional(),
    markerEffect: MarkerEffectConfigSchema.optional(),
  })
  .strict();

export const BenchPlayerSchema = z
  .object({
    ...BasePlayerFields,
    area: z.literal('bench'),
  })
  .strict();

export const DomainPlayerSchema = z.discriminatedUnion('area', [
  PitchPlayerSchema,
  BenchPlayerSchema,
]);
export type PitchPlayer = Readonly<z.infer<typeof PitchPlayerSchema>>;
export type BenchPlayer = Readonly<z.infer<typeof BenchPlayerSchema>>;
export type DomainPlayer = PitchPlayer | BenchPlayer;

// (b) ZoneAnnotation 直和型: RectZone | EllipseZone | PolygonZone (isComplete 排除)
const BaseZoneFields = {
  id: z.string(),
  annotationType: z.literal('zone').default('zone'),
  zoneType: z
    .enum(['highlight', 'space', 'danger', 'pressing', 'buildup', 'generic'])
    .default('generic'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#f59e0b'),
  opacity: z.number().min(0).max(1).default(0.25),
  strokeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  strokeOpacity: z.number().min(0).max(1).default(1).optional(),
  strokeWidth: z.number().min(0).max(8).default(3),
  label: z.string().max(200).optional(),
  locked: z.boolean().optional(),
  effect: ZoneEffectConfigSchema.optional(),
};

export const RectZoneSchema = z.object({
  ...BaseZoneFields,
  shapeType: z.literal('rect'),
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional(),
});

export const EllipseZoneSchema = z.object({
  ...BaseZoneFields,
  shapeType: z.literal('ellipse'),
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional(),
});

export const PolygonZoneSchema = z.object({
  ...BaseZoneFields,
  shapeType: z.literal('polygon'),
  points: z.array(ScreenNormPointSchema).min(3),
});

export const DomainZoneAnnotationSchema = z.discriminatedUnion('shapeType', [
  RectZoneSchema,
  EllipseZoneSchema,
  PolygonZoneSchema,
]);

export type RectZone = Readonly<z.infer<typeof RectZoneSchema>>;
export type EllipseZone = Readonly<z.infer<typeof EllipseZoneSchema>>;
export type PolygonZone = Readonly<z.infer<typeof PolygonZoneSchema>>;
export type DomainZoneAnnotation = RectZone | EllipseZone | PolygonZone;

// (c) ArrowAnnotation (arrowHead 廃止、startMarker / endMarker 統一)
export const ArrowMarkerTypeSchema = z.enum(['none', 'arrow', 'dot']);
export type ArrowMarkerType = z.infer<typeof ArrowMarkerTypeSchema>;

export const DomainArrowAnnotationSchema = z
  .object({
    id: z.string(),
    annotationType: z.literal('arrow').default('arrow'),
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
    points: z.array(ScreenNormPointSchema).min(2),
    controlPoint: ScreenNormPointSchema.optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#ffffff'),
    strokeWidth: z.number().min(1).max(10).default(3),
    dashArray: z.array(z.number()).default([]),
    startMarker: ArrowMarkerTypeSchema.default('none'),
    endMarker: ArrowMarkerTypeSchema.default('arrow'),
    label: z.string().max(200).optional(),
    sourcePlayerId: z.string().optional(),
    targetPlayerId: z.string().optional(),
    locked: z.boolean().optional(),
    effect: ArrowEffectConfigSchema.optional(),
  })
  .strict();
export type DomainArrowAnnotation = Readonly<
  z.infer<typeof DomainArrowAnnotationSchema>
>;

// (d) Ball & Text (Branded ScreenNormCoord 適用)
export const DomainBallStateSchema = z.object({
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
  visible: z.boolean().default(true),
  color: z.string().optional(),
  sizeScale: z.number().min(0.4).max(2.0).optional(),
  trajectory: DomainPlayerTrajectorySchema.optional(),
  locked: z.boolean().optional(),
});
export type DomainBallState = Readonly<z.infer<typeof DomainBallStateSchema>>;

export const DomainTextAnnotationSchema = z.object({
  id: z.string(),
  annotationType: z.literal('text').default('text'),
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
  content: z.string().max(10000),
  fontSize: z.number().min(8).max(72).default(16),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#ffffff'),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  locked: z.boolean().optional(),
});
export type DomainTextAnnotation = Readonly<
  z.infer<typeof DomainTextAnnotationSchema>
>;
