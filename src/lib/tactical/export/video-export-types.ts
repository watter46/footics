import type {
  AspectRatio,
  BoundaryBox,
  ExportProgress,
  PitchAppearanceConfig,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
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
  slides?: Slide[];
  aspectRatio?: AspectRatio;
  pitchTransform?: PitchTransform | null;
  pitchAppearance?: PitchAppearanceConfig;
  mvpMatrix?: Float32Array | null;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  onRenderFrame?: (timeMs: number) => Promise<void> | void;
  onCaptureFrame?: (cropInfo: BoundaryCropInfo) => HTMLCanvasElement | null;
  onSetBackgroundVisible?: (visible: boolean) => void;
  onProgress?: (progress: ExportProgress) => void;
  checkCancelled?: () => boolean;
}
