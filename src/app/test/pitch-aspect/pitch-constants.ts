import {
  calculatePitchGeometry,
  DEFAULT_PITCH_MARGIN_PERCENT,
  PITCH_BOUNDARY_CONFIGS,
  type PitchBoundaryConfig,
  type PitchBounds,
  type PitchLayoutGeometry,
  type PitchOrientation,
} from '@/lib/tactical/pitch-geometry';
import type { AspectRatio } from '@/lib/types/tactical-unified';

export type BoundaryAspectRatio = AspectRatio;
// 後方互換・エイリアス
export type PitchAspectRatio = BoundaryAspectRatio;

export type BoundaryConfig = PitchBoundaryConfig;
export const BOUNDARY_CONFIGS = PITCH_BOUNDARY_CONFIGS;

export const PITCH_CONFIGS = BOUNDARY_CONFIGS;
export type PitchConfig = BoundaryConfig;

export type { PitchBounds, PitchLayoutGeometry, PitchOrientation };
export { calculatePitchGeometry, DEFAULT_PITCH_MARGIN_PERCENT };
