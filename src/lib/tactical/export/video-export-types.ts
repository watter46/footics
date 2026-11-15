import type { ResolveSyntheticDirectorCameraOptions } from '@/lib/tactical/engine/director-camera';
import type {
  DirectorCameraTrack,
  PitchTransform,
} from '@/lib/types/tactical/camera-config';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type {
  BoundaryBox,
  PitchAppearanceConfig,
  ScreenBackgroundConfig,
} from '@/lib/types/tactical/pitch-config';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { ExportProgress } from '@/lib/types/tactical/project-config';
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
  slides?: readonly DomainSlide[];
  aspectRatio?: AspectRatio;
  pitchTransform?: PitchTransform | null;
  pitchAppearance?: PitchAppearanceConfig;
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
