import type { BoundaryBox } from '@/lib/types/tactical-unified';

export interface BoundaryCropInfo {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  exportWidth: number;
  exportHeight: number;
  isCropped: boolean;
}

/**
 * Calculates crop dimensions from Boundary Box and stage dimensions with even-number snapping.
 */
export function calculateBoundaryCrop(
  box: BoundaryBox | undefined | null,
  stageWidth: number,
  stageHeight: number,
  scale = 2,
  pitchRect?: { x: number; y: number; width: number; height: number },
): BoundaryCropInfo {
  const rect = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageWidth,
    height: stageHeight,
  };
  let cropX = rect.x;
  let cropY = rect.y;
  let cropW = rect.width;
  let cropH = rect.height;
  let isCropped = false;

  const hasCustomPitchRect =
    rect.x !== 0 ||
    rect.y !== 0 ||
    rect.width !== stageWidth ||
    rect.height !== stageHeight;
  const isBoxCropped =
    Boolean(box?.enabled) &&
    (box?.width ?? 0) > 0 &&
    (box?.height ?? 0) > 0 &&
    ((box?.width ?? 100) < 100 ||
      (box?.height ?? 100) < 100 ||
      (box?.x ?? 0) > 0 ||
      (box?.y ?? 0) > 0);

  if (box?.enabled && box.width > 0 && box.height > 0) {
    cropX = rect.x + (box.x / 100) * rect.width;
    cropY = rect.y + (box.y / 100) * rect.height;
    cropW = (box.width / 100) * rect.width;
    cropH = (box.height / 100) * rect.height;
    isCropped = hasCustomPitchRect || isBoxCropped;
  }

  // Baseline Resolution Guarantee depending on selected scale preset:
  // scale >= 2.5 (2K / 1440p QHD): 2560x1440 for 16:9, 1440x2560 for 9:16
  // scale >= 1.5 (1080p Full HD): 1920x1080 for 16:9, 1080x1920 for 9:16
  // scale < 1.5 (720p HD): 1280x720 for 16:9, 720x1280 for 9:16
  const isSquare = stageWidth === stageHeight;
  const isFourFive = Math.abs(stageWidth / stageHeight - 4 / 5) < 0.05;
  const isFourThree = Math.abs(stageWidth / stageHeight - 4 / 3) < 0.05;
  const isVertical = stageHeight > stageWidth && !isFourFive;

  let baseWidth: number;
  let baseHeight: number;

  if (scale >= 2.5) {
    // 2K / 1440p (Ultra Quality)
    if (isFourFive) {
      baseWidth = 1440;
      baseHeight = 1800;
    } else if (isVertical) {
      baseWidth = 1440;
      baseHeight = 2560;
    } else if (isSquare) {
      baseWidth = 1440;
      baseHeight = 1440;
    } else if (isFourThree) {
      baseWidth = 1920;
      baseHeight = 1440;
    } else {
      baseWidth = 2560;
      baseHeight = 1440;
    }
  } else if (scale >= 1.5) {
    // 1080p (Full HD - Recommended)
    if (isFourFive) {
      baseWidth = 1080;
      baseHeight = 1350;
    } else if (isVertical) {
      baseWidth = 1080;
      baseHeight = 1920;
    } else if (isSquare) {
      baseWidth = 1080;
      baseHeight = 1080;
    } else if (isFourThree) {
      baseWidth = 1440;
      baseHeight = 1080;
    } else {
      baseWidth = 1920;
      baseHeight = 1080;
    }
  } else {
    // 720p (HD - Lightweight)
    if (isFourFive) {
      baseWidth = 720;
      baseHeight = 900;
    } else if (isVertical) {
      baseWidth = 720;
      baseHeight = 1280;
    } else if (isSquare) {
      baseWidth = 720;
      baseHeight = 720;
    } else if (isFourThree) {
      baseWidth = 960;
      baseHeight = 720;
    } else {
      baseWidth = 1280;
      baseHeight = 720;
    }
  }

  const minScaleX = baseWidth / stageWidth;
  const minScaleY = baseHeight / stageHeight;
  const effectiveScale = Math.max(scale, Math.max(minScaleX, minScaleY));

  let exportWidth = Math.round(cropW * effectiveScale);
  let exportHeight = Math.round(cropH * effectiveScale);

  // 8-pixel macroblock alignment ensures maximum GPU hardware acceleration throughput
  // while strictly preserving standard broadcast resolutions (1080p: 1920x1080, 2K: 2560x1440, 720p: 1280x720)
  exportWidth = Math.max(64, Math.round(exportWidth / 8) * 8);
  exportHeight = Math.max(64, Math.round(exportHeight / 8) * 8);

  return {
    cropX,
    cropY,
    cropW,
    cropH,
    exportWidth,
    exportHeight,
    isCropped,
  };
}
