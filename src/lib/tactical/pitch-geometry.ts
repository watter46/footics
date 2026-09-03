/**
 * pitch-geometry.ts
 * Pitch geometry and circle scaling calculations for all supported aspect ratios.
 *
 * Support for 4 aspect ratios:
 * - Horizontal: 16:9, 1:1
 * - Vertical: 9:16, 4:5
 *
 * Default margin: 3% (marginPercent = 3.0)
 * Center circle guarantees true isotropic circle (distortion-free).
 */

import type { AspectRatio } from '@/lib/types/tactical-unified';

export const DEFAULT_PITCH_MARGIN_PERCENT = 3.0;

export type PitchOrientation = 'horizontal' | 'vertical';

export interface PitchLayoutGeometry {
  pitchLeft: number;
  pitchTop: number;
  pitchWidth: number;
  pitchHeight: number;
  centerX: number;
  centerY: number;
  meterScale: number;
  scaleLength: number;
  scaleWidth: number;
  centerCircleRadius: number;
  paDepth: number;
  paWidth: number;
  gaDepth: number;
  gaWidth: number;
  penaltySpotDist: number;
  cornerArcRadius: number;
}

export interface PitchBoundaryConfig {
  id: AspectRatio;
  label: string;
  subLabel: string;
  ratio: number;
  widthPx: number;
  heightPx: number;
  orientation: PitchOrientation;
  viewBox: string;
}

/**
 * X最適化メディア比率の境界線マスター設定。
 * 境界線枠（Boundary Box）を基準として全画面最大表示し、
 * その内側に上下左右 3%（デフォルト）の均等余白を設けてピッチを描画する。
 */
export const PITCH_BOUNDARY_CONFIGS: Record<AspectRatio, PitchBoundaryConfig> =
  {
    '16:9': {
      id: '16:9',
      label: '16:9 (横長・X/YouTube俯瞰)',
      subLabel: '1920 × 1080',
      ratio: 16 / 9,
      widthPx: 1920,
      heightPx: 1080,
      orientation: 'horizontal',
      viewBox: '0 0 1920 1080',
    },
    '9:16': {
      id: '9:16',
      label: '9:16 (縦長・スマホ全画面)',
      subLabel: '1080 × 1920',
      ratio: 9 / 16,
      widthPx: 1080,
      heightPx: 1920,
      orientation: 'vertical',
      viewBox: '0 0 1080 1920',
    },
    '4:5': {
      id: '4:5',
      label: '4:5 (縦長・Xタイムライン最大化)',
      subLabel: '1080 × 1350',
      ratio: 4 / 5,
      widthPx: 1080,
      heightPx: 1350,
      orientation: 'vertical',
      viewBox: '0 0 1080 1350',
    },
    '1:1': {
      id: '1:1',
      label: '1:1 (正方形)',
      subLabel: '1080 × 1080',
      ratio: 1 / 1,
      widthPx: 1080,
      heightPx: 1080,
      orientation: 'horizontal',
      viewBox: '0 0 1080 1080',
    },
  };

export interface PitchBounds {
  xMin: number;
  xMax: number;
  xMid: number;
  yMin: number;
  yMax: number;
  yMid: number;
  pitchWidth: number;
  pitchHeight: number;
}

/**
 * 指定された余白率における正規化座標系 (0-100) でのピッチ境界線（白線内側）を算出
 * @param marginPercent 上下左右の余白率 (%、デフォルト: 3.0)
 */
export function calculateNormalizedPitchBounds(
  marginPercent = DEFAULT_PITCH_MARGIN_PERCENT,
): PitchBounds {
  const pitchWidth = 100 - 2 * marginPercent;
  const pitchHeight = 100 - 2 * marginPercent;
  return {
    xMin: marginPercent,
    xMax: 100 - marginPercent,
    xMid: 50.0,
    yMin: marginPercent,
    yMax: 100 - marginPercent,
    yMid: 50.0,
    pitchWidth,
    pitchHeight,
  };
}

/**
 * 境界線サイズと余白率からピッチの各幾何要素を算出
 * 1. 境界線に対して内側に上下左右 marginPercent % の均等余白を確保（デフォルト: 3%）
 * 2. 余白の内側（pitchWidth × pitchHeight）を完璧に埋めるようにピッチ比率を変形描画
 * 3. センターサークルは等方スケーリングにより完全な真円（歪みゼロ）を保証
 *
 * @param width 境界線の幅 (px)
 * @param height 境界線の高さ (px)
 * @param marginPercent 上下左右の余白率 (%、デフォルト: 3.0)
 * @param orientation ピッチの向き ('horizontal' | 'vertical'、デフォルト: 'horizontal')
 */
export function calculatePitchGeometry(
  width: number,
  height: number,
  marginPercent = DEFAULT_PITCH_MARGIN_PERCENT,
  orientation: PitchOrientation = 'horizontal',
): PitchLayoutGeometry {
  const marginRatio = marginPercent / 100;
  const pitchLeft = width * marginRatio;
  const pitchTop = height * marginRatio;
  const pitchWidth = width * (1 - 2 * marginRatio);
  const pitchHeight = height * (1 - 2 * marginRatio);

  const centerX = width / 2;
  const centerY = height / 2;

  // ピッチ領域（余白の内側）を完璧に埋めるためのスケーリング
  // 横向き: 長さ=pitchWidth (FIFA規格105m基準), 幅=pitchHeight (FIFA規格68m基準)
  // 縦向き: 長さ=pitchHeight (FIFA規格105m基準), 幅=pitchWidth (FIFA規格68m基準)
  const isHorizontal = orientation === 'horizontal';
  const lengthPx = isHorizontal ? pitchWidth : pitchHeight;
  const widthPx = isHorizontal ? pitchHeight : pitchWidth;

  const scaleLength = lengthPx / 105;
  const scaleWidth = widthPx / 68;

  // センターサークルは等方真円スケーリング (歪みゼロ保証)
  // 短辺方向にも収まるよう等方スケールを適用
  const meterScale = Math.min(scaleLength, scaleWidth);
  const centerCircleRadius = 9.15 * meterScale;

  // ペナルティエリア・ゴールエリア（ピッチ比率に調和させて配置）
  const paDepth = 16.5 * scaleLength;
  const paWidth = 40.32 * scaleWidth;
  const gaDepth = 5.5 * scaleLength;
  const gaWidth = 18.32 * scaleWidth;
  const penaltySpotDist = 11.0 * scaleLength;
  const cornerArcRadius = 1.0 * meterScale;

  return {
    pitchLeft,
    pitchTop,
    pitchWidth,
    pitchHeight,
    centerX,
    centerY,
    meterScale,
    scaleLength,
    scaleWidth,
    centerCircleRadius,
    paDepth,
    paWidth,
    gaDepth,
    gaWidth,
    penaltySpotDist,
    cornerArcRadius,
  };
}

/**
 * AspectRatio ごとのマスター設定に基づいてピッチ幾何要素を算出
 * @param aspectRatio アスペクト比 ('16:9' | '9:16' | '4:5' | '1:1')
 * @param marginPercent 上下左右の余白率 (%、デフォルト: 3.0)
 */
export function calculatePitchGeometryForAspect(
  aspectRatio: AspectRatio,
  marginPercent = DEFAULT_PITCH_MARGIN_PERCENT,
): PitchLayoutGeometry & { config: PitchBoundaryConfig } {
  const config = PITCH_BOUNDARY_CONFIGS[aspectRatio];
  const geom = calculatePitchGeometry(
    config.widthPx,
    config.heightPx,
    marginPercent,
    config.orientation,
  );
  return {
    ...geom,
    config,
  };
}
