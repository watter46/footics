import { z } from 'zod';
import {
  type AspectRatio,
  type BoundaryBox,
  BoundaryBoxSchema,
  type PitchAppearanceConfig,
  PitchAppearanceConfigSchema,
  type PitchTransform,
  PitchTransformSchema,
} from '@/lib/types/tactical-unified';

export const AspectRatioSchema = z.enum(['16:9', '4:5', '1:1', '9:16']);
export type { AspectRatio };

export type AnimationOrientation = 'vertical' | 'horizontal';

export interface TacticalPlayerLike {
  id?: string | number;
  playerId?: number | string;
  photoUrl?: string;
  insideContent?: string;
  options?: {
    photoUrl?: string;
    insideContent?: string;
    [key: string]: unknown;
  };
  style?: {
    photoUrl?: string;
    insideContent?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TacticalSceneLike {
  id?: string;
  players?: Record<string, TacticalPlayerLike> | TacticalPlayerLike[];
  [key: string]: unknown;
}

export const TacticalExportSharePayloadSchema = z
  .object({
    version: z.number().default(1),
    createdAt: z.number(),
    title: z.string().optional(),
    scenes: z.array(
      z.custom<TacticalSceneLike>(
        (val) => typeof val === 'object' && val !== null,
        { message: 'Scene must be an object' },
      ),
    ), // Slide[] or TacticalScene[]
    orientation: z.enum(['vertical', 'horizontal']),
    teamVisibility: z.enum(['both', 'home', 'away']).optional().default('both'),
    photos: z.record(z.string(), z.string()).optional().default({}), // playerId -> base64 DataURL or Image URL
    exportFps: z
      .union([z.literal(30), z.literal(60)])
      .optional()
      .default(30),
    aspectRatio: AspectRatioSchema.optional(),
    boundaryBox: BoundaryBoxSchema.nullable().optional(),
    pitchTransform: PitchTransformSchema.nullable().optional(),
    pitchAppearance: PitchAppearanceConfigSchema.optional(),
  })
  .transform((data) => ({
    ...data,
    aspectRatio:
      data.aspectRatio ?? (data.orientation === 'vertical' ? '9:16' : '16:9'),
  }));

export type TacticalExportSharePayload = z.infer<
  typeof TacticalExportSharePayloadSchema
> & {
  scenes: TacticalSceneLike[];
  orientation: AnimationOrientation;
  exportFps: 30 | 60;
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  pitchAppearance?: PitchAppearanceConfig;
};

export interface TacticalExportShareSummary {
  shareId: string;
  title: string;
  createdAt: number;
  sceneCount: number;
  aspectRatio: AspectRatio;
  orientation: AnimationOrientation;
  hasBoundaryCrop: boolean;
}

export {
  blobToBase64,
  createBitmapFromUrlOrBase64,
  packPlayerPhotos,
  preloadMarbleTextureBitmap,
  preloadPlayerPhotos,
  preloadSlidePlayerPhotos,
  unpackPlayerPhotos,
} from './share-photos';
