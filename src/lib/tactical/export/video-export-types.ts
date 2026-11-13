import type { ResolveSyntheticDirectorCameraOptions } from '@/lib/tactical/unified-interpolation';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type {
  DirectorCameraTrack,
  ExportProgress,
} from '@/lib/types/tactical/project';
import type {
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';
import type { BoundaryCropInfo } from './video-crop-calc';

export interface VideoExportOptions {
  format: 'mp4' | 'webm';
  fps: number;
  scale?: number;
  quality?: 'low' | 'medium' | 'high';
  bitrate?: number;
  h264Profile?: 'baseline' | 'main' | 'high';
  keyFrameIntervalSec?: number;
  latencyMode?: 'realtime' | 'quality';
  maxQueueSize?: number;
  transparent?: boolean;
  totalDurationMs: number;
  boundaryBox?: BoundaryBox | null;
  stageWidth: number;
  stageHeight: number;
  slides?: readonly (Slide | DomainSlide)[];
  aspectRatio?: AspectRatio;
  pitchTransform?: PitchTransform | null;
  pitchAppearance?: PitchAppearanceConfig;
  mvpMatrix?: Float32Array | null;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  teamVisibility?: 'both' | 'home' | 'away';
  fullCodecString?: string;
  marbleTexture?: CanvasImageSource | null;
  screenBackground?: ScreenBackgroundConfig;
  directorCamera?: DirectorCameraTrack | null;
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
  isWorkerContext?: boolean;
  onRenderFrame?: (timeMs: number) => Promise<void> | void;
  onCaptureFrame?: (cropInfo: BoundaryCropInfo) => HTMLCanvasElement | null;
  onSetBackgroundVisible?: (visible: boolean) => void;
  onProgress?: (progress: ExportProgress) => void;
  checkCancelled?: () => boolean;
}
