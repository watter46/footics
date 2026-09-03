export type BoundaryAspectRatio = '16:9' | '9:16' | '4:5' | '1:1';
// 後方互換・エイリアス
export type PitchAspectRatio = BoundaryAspectRatio;

export interface BoundaryConfig {
  id: BoundaryAspectRatio;
  label: string;
  subLabel: string;
  ratio: number;
  widthPx: number;
  heightPx: number;
  orientation: 'horizontal' | 'vertical';
  viewBox: string;
}

/**
 * X最適化メディア比率の境界線マスター設定。
 * 境界線枠（Boundary Box）を基準として全画面最大表示し、
 * その内側に上下左右 5%（可変）の均等余白を設けてピッチを描画する。
 */
export const BOUNDARY_CONFIGS: Record<BoundaryAspectRatio, BoundaryConfig> = {
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

export const PITCH_CONFIGS = BOUNDARY_CONFIGS;
export type PitchConfig = BoundaryConfig;

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

/**
 * 境界線サイズと余白率からピッチの各幾何要素を算出
 * 1. 境界線に対して内側に上下左右 marginPercent % の均等余白を確保
 * 2. 余白の内側（pitchWidth × pitchHeight）を完璧に埋めるようにピッチ比率を変形描画
 * 3. センターサークルは等方スケーリングにより完全な真円（歪みゼロ）を保証
 *
 * @param width 境界線の幅 (px)
 * @param height 境界線の高さ (px)
 * @param marginPercent 上下左右の余白率 (%、デフォルト: 5.0)
 * @param orientation ピッチの向き ('horizontal' | 'vertical')
 */
export function calculatePitchGeometry(
  width: number,
  height: number,
  marginPercent = 5.0,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): PitchLayoutGeometry {
  const marginRatio = marginPercent / 100;
  const pitchLeft = width * marginRatio;
  const pitchTop = height * marginRatio;
  const pitchWidth = width * (1 - 2 * marginRatio);
  const pitchHeight = height * (1 - 2 * marginRatio);

  const centerX = width / 2;
  const centerY = height / 2;

  // ピッチ領域（5%余白の内側）を完璧に埋めるためのスケーリング
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
