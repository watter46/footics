/**
 * pitch-svg.ts
 * Responsive Pitch SVG generator and image cache for tactical boards.
 *
 * Supports 4 aspect ratios:
 * - 16:9 (horizontal)
 * - 9:16 (vertical)
 * - 4:5  (vertical)
 * - 1:1  (vertical)
 *
 * Guarantees:
 * - Default 3% margin
 * - 100% true isotropic center circle without distortion
 * - Symmetrical pitch markings matching FIFA geometry
 */

import {
  calculatePitchGeometryForAspect,
  DEFAULT_PITCH_MARGIN_PERCENT,
} from '@/lib/tactical/pitch-geometry';
import type { AspectRatio } from '@/lib/types/tactical-unified';

export interface PitchSvgOptions {
  marginPercent?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  grass?: boolean;
  onlyMarkings?: boolean;
}

/**
 * Generate a complete standalone SVG markup string for the given aspect ratio and options.
 */
export function generatePitchSvg(
  aspectRatio: AspectRatio,
  options: PitchSvgOptions = {},
): string {
  const {
    marginPercent = DEFAULT_PITCH_MARGIN_PERCENT,
    strokeColor = '#e2b48d',
    strokeOpacity = 0.85,
    strokeWidth = 4,
    grass = true,
    onlyMarkings = false,
  } = options;

  const {
    pitchLeft,
    pitchTop,
    pitchWidth,
    pitchHeight,
    centerX,
    centerY,
    meterScale,
    centerCircleRadius,
    paDepth,
    paWidth,
    gaDepth,
    gaWidth,
    penaltySpotDist,
    cornerArcRadius,
    config,
  } = calculatePitchGeometryForAspect(aspectRatio, marginPercent);

  const isHorizontal = config.orientation === 'horizontal';
  const left = pitchLeft;
  const right = pitchLeft + pitchWidth;
  const top = pitchTop;
  const bottom = pitchTop + pitchHeight;

  const r = centerCircleRadius;
  const arcOffset = Math.sqrt(
    Math.max(0, r * r - (paDepth - penaltySpotDist) ** 2),
  );

  // Pitch surface background (solid black)
  const pitchBgSvg = `<rect x="${left.toFixed(2)}" y="${top.toFixed(2)}" width="${pitchWidth.toFixed(2)}" height="${pitchHeight.toFixed(2)}" fill="#000000"/>`;

  // Pitch markings
  let markingsSvg = '';
  if (isHorizontal) {
    markingsSvg = `
  <!-- Touchlines & Goal lines -->
  <rect x="${left.toFixed(2)}" y="${top.toFixed(2)}" width="${pitchWidth.toFixed(2)}" height="${pitchHeight.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Halfway Line -->
  <line x1="${centerX.toFixed(2)}" y1="${top.toFixed(2)}" x2="${centerX.toFixed(2)}" y2="${bottom.toFixed(2)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Center Circle & Spot -->
  <circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${(0.4 * meterScale).toFixed(2)}" fill="${strokeColor}" opacity="${strokeOpacity}"/>
  <!-- Penalty Areas -->
  <rect x="${left.toFixed(2)}" y="${(centerY - paWidth / 2).toFixed(2)}" width="${paDepth.toFixed(2)}" height="${paWidth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <rect x="${(right - paDepth).toFixed(2)}" y="${(centerY - paWidth / 2).toFixed(2)}" width="${paDepth.toFixed(2)}" height="${paWidth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Goal Areas -->
  <rect x="${left.toFixed(2)}" y="${(centerY - gaWidth / 2).toFixed(2)}" width="${gaDepth.toFixed(2)}" height="${gaWidth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <rect x="${(right - gaDepth).toFixed(2)}" y="${(centerY - gaWidth / 2).toFixed(2)}" width="${gaDepth.toFixed(2)}" height="${gaWidth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Penalty Spots -->
  <circle cx="${(left + penaltySpotDist).toFixed(2)}" cy="${centerY.toFixed(2)}" r="${(0.3 * meterScale).toFixed(2)}" fill="${strokeColor}" opacity="${strokeOpacity}"/>
  <circle cx="${(right - penaltySpotDist).toFixed(2)}" cy="${centerY.toFixed(2)}" r="${(0.3 * meterScale).toFixed(2)}" fill="${strokeColor}" opacity="${strokeOpacity}"/>
  <!-- Penalty Arcs -->
  <path d="M ${(left + paDepth).toFixed(2)} ${(centerY - arcOffset).toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(left + paDepth).toFixed(2)} ${(centerY + arcOffset).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${(right - paDepth).toFixed(2)} ${(centerY - arcOffset).toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(right - paDepth).toFixed(2)} ${(centerY + arcOffset).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Corner Arcs -->
  <path d="M ${left.toFixed(2)} ${(top + cornerArcRadius).toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${(left + cornerArcRadius).toFixed(2)} ${top.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${(right - cornerArcRadius).toFixed(2)} ${top.toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${right.toFixed(2)} ${(top + cornerArcRadius).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${(left + cornerArcRadius).toFixed(2)} ${bottom.toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${left.toFixed(2)} ${(bottom - cornerArcRadius).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${right.toFixed(2)} ${(bottom - cornerArcRadius).toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${(right - cornerArcRadius).toFixed(2)} ${bottom.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
`;
  } else {
    markingsSvg = `
  <!-- Touchlines & Goal lines -->
  <rect x="${left.toFixed(2)}" y="${top.toFixed(2)}" width="${pitchWidth.toFixed(2)}" height="${pitchHeight.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Halfway Line -->
  <line x1="${left.toFixed(2)}" y1="${centerY.toFixed(2)}" x2="${right.toFixed(2)}" y2="${centerY.toFixed(2)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Center Circle & Spot -->
  <circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${(0.4 * meterScale).toFixed(2)}" fill="${strokeColor}" opacity="${strokeOpacity}"/>
  <!-- Penalty Areas -->
  <rect x="${(centerX - paWidth / 2).toFixed(2)}" y="${top.toFixed(2)}" width="${paWidth.toFixed(2)}" height="${paDepth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <rect x="${(centerX - paWidth / 2).toFixed(2)}" y="${(bottom - paDepth).toFixed(2)}" width="${paWidth.toFixed(2)}" height="${paDepth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Goal Areas -->
  <rect x="${(centerX - gaWidth / 2).toFixed(2)}" y="${top.toFixed(2)}" width="${gaWidth.toFixed(2)}" height="${gaDepth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <rect x="${(centerX - gaWidth / 2).toFixed(2)}" y="${(bottom - gaDepth).toFixed(2)}" width="${gaWidth.toFixed(2)}" height="${gaDepth.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Penalty Spots -->
  <circle cx="${centerX.toFixed(2)}" cy="${(top + penaltySpotDist).toFixed(2)}" r="${(0.3 * meterScale).toFixed(2)}" fill="${strokeColor}" opacity="${strokeOpacity}"/>
  <circle cx="${centerX.toFixed(2)}" cy="${(bottom - penaltySpotDist).toFixed(2)}" r="${(0.3 * meterScale).toFixed(2)}" fill="${strokeColor}" opacity="${strokeOpacity}"/>
  <!-- Penalty Arcs -->
  <path d="M ${(centerX - arcOffset).toFixed(2)} ${(top + paDepth).toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(centerX + arcOffset).toFixed(2)} ${(top + paDepth).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${(centerX - arcOffset).toFixed(2)} ${(bottom - paDepth).toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(centerX + arcOffset).toFixed(2)} ${(bottom - paDepth).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <!-- Corner Arcs -->
  <path d="M ${left.toFixed(2)} ${(top + cornerArcRadius).toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${(left + cornerArcRadius).toFixed(2)} ${top.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${(right - cornerArcRadius).toFixed(2)} ${top.toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${right.toFixed(2)} ${(top + cornerArcRadius).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${(left + cornerArcRadius).toFixed(2)} ${bottom.toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${left.toFixed(2)} ${(bottom - cornerArcRadius).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
  <path d="M ${right.toFixed(2)} ${(bottom - cornerArcRadius).toFixed(2)} A ${cornerArcRadius.toFixed(2)} ${cornerArcRadius.toFixed(2)} 0 0 0 ${(right - cornerArcRadius).toFixed(2)} ${bottom.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}"/>
`;
  }

  if (onlyMarkings) {
    return `<svg viewBox="${config.viewBox}" xmlns="http://www.w3.org/2000/svg">
  ${markingsSvg}
</svg>`.trim();
  }

  return `<svg viewBox="${config.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid Frame Background -->
  <rect x="0" y="0" width="${config.widthPx}" height="${config.heightPx}" fill="#000000"/>
  ${pitchBgSvg}
  ${markingsSvg}
</svg>`.trim();
}

// ── In-Memory Image & Data URL Caches ──
const svgDataUrlCache = new Map<string, string>();
const svgImageCache = new Map<string, HTMLImageElement>();

function getCacheKey(
  aspectRatio: AspectRatio,
  options?: PitchSvgOptions,
): string {
  const margin = options?.marginPercent ?? DEFAULT_PITCH_MARGIN_PERCENT;
  const grass = options?.grass ?? true;
  const strokeColor = options?.strokeColor ?? '#e2b48d';
  const strokeWidth = options?.strokeWidth ?? 4;
  const strokeOpacity = options?.strokeOpacity ?? 0.85;
  const onlyMarkings = options?.onlyMarkings ?? false;
  return `${aspectRatio}-${margin}-${grass}-${strokeColor}-${strokeWidth}-${strokeOpacity}-${onlyMarkings}`;
}

export function getPitchSvgDataUrl(
  aspectRatio: AspectRatio,
  options?: PitchSvgOptions,
): string {
  const key = getCacheKey(aspectRatio, options);
  const cached = svgDataUrlCache.get(key);
  if (cached) return cached;

  const svg = generatePitchSvg(aspectRatio, options);
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  svgDataUrlCache.set(key, dataUrl);
  return dataUrl;
}

export function getCachedPitchSvgImage(
  aspectRatio: AspectRatio,
  options?: PitchSvgOptions,
): HTMLImageElement | null {
  const key = getCacheKey(aspectRatio, options);
  const img = svgImageCache.get(key);
  return img?.complete ? img : null;
}

export function loadPitchSvgImage(
  aspectRatio: AspectRatio,
  options?: PitchSvgOptions,
): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }
  const key = getCacheKey(aspectRatio, options);
  const cached = svgImageCache.get(key);
  if (cached?.complete) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const dataUrl = getPitchSvgDataUrl(aspectRatio, options);
    img.onload = () => {
      svgImageCache.set(key, img);
      resolve(img);
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = dataUrl;
  });
}

/**
 * Preload and cache all 4 aspect ratios in background
 */
export function preloadAllPitchSvgImages(): void {
  if (typeof window === 'undefined') return;
  const allAspects: AspectRatio[] = ['16:9', '9:16', '4:5', '1:1'];
  for (const ratio of allAspects) {
    loadPitchSvgImage(ratio).catch(() => {});
  }
}
