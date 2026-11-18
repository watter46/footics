import {
  getScreenOuterPitchRect,
  PITCH_BOUNDARY_CONFIGS,
} from '@/lib/tactical/shared/pitch-geometry';
import type { PitchTransform } from '@/lib/types/tactical/camera-config';
import {
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  X_MEDIA_PRESETS,
} from '@/lib/types/tactical/pitch-config';
import type {
  AspectRatio,
  XMediaPresetKey,
} from '@/lib/types/tactical/primitives';

export interface AutoFitBoundaryOptions {
  readonly aspectRatio: AspectRatio;
  readonly backgroundType?: 'pitch' | 'image' | 'blank';
  readonly pitchTransform?: PitchTransform;
  readonly pitchRect?: { readonly width: number; readonly height: number };
}

/**
 * ピッチ外枠または背景画像枠にフィットする BoundaryBox を算出する純粋関数。
 */
export function computeAutoFitBoundaryBox(
  options: AutoFitBoundaryOptions,
): BoundaryBox {
  const {
    aspectRatio,
    backgroundType = 'pitch',
    pitchTransform,
    pitchRect,
  } = options;
  const isImageBg = backgroundType === 'image';
  const config =
    PITCH_BOUNDARY_CONFIGS[aspectRatio] ?? PITCH_BOUNDARY_CONFIGS['16:9'];
  const pitchWidth = pitchRect?.width ?? config.widthPx;
  const pitchHeight = pitchRect?.height ?? config.heightPx;

  const panX = pitchTransform?.panX ?? 0;
  const panY = pitchTransform?.panY ?? 0;
  const zoom = pitchTransform?.zoom ?? 1;
  const hasTransform = panX !== 0 || panY !== 0 || zoom !== 1;

  if (isImageBg) {
    return {
      x:
        Math.round(
          ((panX / pitchWidth) * 100 +
            DEFAULT_BOUNDARY_BOX_SCREENSHOT.x * zoom) *
            100,
        ) / 100,
      y:
        Math.round(
          ((panY / pitchHeight) * 100 +
            DEFAULT_BOUNDARY_BOX_SCREENSHOT.y * zoom) *
            100,
        ) / 100,
      width:
        Math.round(DEFAULT_BOUNDARY_BOX_SCREENSHOT.width * zoom * 100) / 100,
      height:
        Math.round(DEFAULT_BOUNDARY_BOX_SCREENSHOT.height * zoom * 100) / 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    };
  }

  if (hasTransform) {
    return {
      x: Math.round((panX / pitchWidth) * 100 * 100) / 100,
      y: Math.round((panY / pitchHeight) * 100 * 100) / 100,
      width: Math.round(100 * zoom * 100) / 100,
      height: Math.round(100 * zoom * 100) / 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    };
  }

  const outer = getScreenOuterPitchRect(aspectRatio);
  return {
    x: outer.left,
    y: outer.top,
    width: outer.width,
    height: outer.height,
    enabled: true,
    visible: false,
    fitTarget: 'pitch',
  };
}

/**
 * X メディアプリセットキーに応じた BoundaryBox を算出する純粋関数。
 */
export function computeXMediaPresetBoundaryBox(
  presetKey: XMediaPresetKey | 'pitch_fit',
  aspectRatio: AspectRatio,
): BoundaryBox {
  if (presetKey === 'pitch_fit') {
    const outer = getScreenOuterPitchRect(aspectRatio);
    return {
      x: outer.left,
      y: outer.top,
      width: outer.width,
      height: outer.height,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    };
  }
  const preset = X_MEDIA_PRESETS[presetKey];
  return createXBoundaryBox(preset?.ratio ?? '16:9', '16:9');
}
