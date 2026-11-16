import type { ResolveSyntheticDirectorCameraOptions } from '@/lib/tactical/engine/director-camera';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
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

export interface UseExportPreviewAnimationParams {
  slides: readonly DomainSlide[];
  aspectRatio: AspectRatio;
  /** キャンバス自体の出力アスペクト比（省略時は aspectRatio、レイアウト画面では '16:9' 固定） */
  canvasAspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  directorCamera?: DirectorCameraTrack | null;
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  screenBackground?: ScreenBackgroundConfig;
  teamVisibility?: 'both' | 'home' | 'away';
  externalIsPlaying?: boolean;
  onToggleExternalPlay?: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  sliderRef: React.RefObject<HTMLInputElement | null>;
}

export const PREVIEW_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
};

export const ASPECT_CONTAINER_CLASSES: Record<AspectRatio, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16] max-h-[340px]',
  '4:5': 'aspect-[4/5] max-h-[340px]',
  '1:1': 'aspect-square max-h-[340px]',
};

export const SPLIT_PREVIEW_CONTAINER_CLASSES: Record<AspectRatio, string> = {
  '16:9': 'aspect-video w-full max-h-full',
  '9:16': 'aspect-[9/16] h-full max-h-full w-auto max-w-full',
  '4:5': 'aspect-[4/5] h-full max-h-full w-auto max-w-full',
  '1:1': 'aspect-square h-full max-h-full w-auto max-w-full',
};

export const CINEMATIC_MASK_FILL = 'rgba(5, 7, 12, 0.72)';

export function hasActivePitchTransform(pt?: PitchTransform | null): boolean {
  if (!pt) return false;
  return (
    pt.tilt !== 0 ||
    (pt.yaw !== undefined && pt.yaw !== 90) ||
    pt.zoom !== 1 ||
    pt.panX !== 0 ||
    pt.panY !== 0
  );
}

export function resolveExportPreviewCropInfo(
  boundaryBox: BoundaryBox | null | undefined,
  basePreviewDim: { width: number; height: number },
) {
  const box = boundaryBox?.enabled !== false ? boundaryBox : null;
  const { width: w, height: h } = basePreviewDim;
  const pitchRect = w > 0 ? { x: 0, y: 0, width: w, height: h } : undefined;
  const cropInfo = calculateBoundaryCrop(box, w, h, 1, pitchRect);
  const shouldCropPreview = cropInfo.isCropped;
  const previewWidth = shouldCropPreview ? cropInfo.exportWidth : w;
  const previewHeight = shouldCropPreview ? cropInfo.exportHeight : h;
  const previewAspectStyle = shouldCropPreview
    ? `${previewWidth} / ${previewHeight}`
    : undefined;
  return {
    shouldCropPreview,
    previewWidth,
    previewHeight,
    previewAspectStyle,
  };
}
