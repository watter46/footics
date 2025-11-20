/**
 * 背景パターン種別
 */
export type PatternKey =
  | "solid"
  | "gradient"
  | "verticalStripe"
  | "horizontalStripe"
  | "grid"
  | "diagonalStripe"
  | "geometric"
  | "gridDiagonal"
  | "polygonTile";

/**
 * グラデーション種別
 */
export type GradientType = "linear" | "radial";

/**
 * グラデーション方向（linearの場合のみ）
 */
export type GradientDirection =
  | "to-br"
  | "to-tr"
  | "to-r"
  | "to-l"
  | "to-b"
  | "to-t";

/**
 * 単色
 */
export interface SolidOption {
  key: "solid";
  label: "Solid";
  color: string;
  opacity: number;
}

/**
 * グラデーション
 */
export interface GradientOption {
  key: "gradient";
  label: "Gradient";
  gradientType: GradientType;
  fromColor: string;
  toColor: string;
  direction: GradientDirection;
}

/**
 * 縦ストライプ
 */
export interface VerticalStripeOption {
  key: "verticalStripe";
  label: "Vertical";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * 横ストライプ
 */
export interface HorizontalStripeOption {
  key: "horizontalStripe";
  label: "Horizontal";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * グリッド
 */
export interface GridOption {
  key: "grid";
  label: "Grid";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * ノイズ
 */
export interface NoiseOption {
  key: "noise";
  label: "Noise";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * 斜めストライプ
 */
export interface DiagonalStripeOption {
  key: "diagonalStripe";
  label: "Diagonal";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * サークルグリッド
 */
export interface CircleGridOption {
  key: "circleGrid";
  label: "Circle";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * 幾何学パターン
 */
export interface GeometricOption {
  key: "geometric";
  label: "Geometric";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * 斜め格子（ダイヤ型グリッド）
 */
export interface GridDiagonalOption {
  key: "gridDiagonal";
  label: "GridDiagonal";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * 多角形タイル（Polygon Tile）
 */
export interface PolygonTileOption {
  key: "polygonTile";
  label: "PolygonTile";
  baseColor: string;
  patternColor: string;
  patternOpacity: number;
}

/**
 * すべてのフィールド背景パターン型のユニオン
 */
export type FieldBackgroundOptions =
  | SolidOption
  | GradientOption
  | VerticalStripeOption
  | HorizontalStripeOption
  | DiagonalStripeOption
  | GridOption
  | GeometricOption
  | GridDiagonalOption
  | PolygonTileOption;

export type FieldBackgroundOptionsMap = {
  solid: SolidOption;
  gradient: GradientOption;
  verticalStripe: VerticalStripeOption;
  horizontalStripe: HorizontalStripeOption;
  grid: GridOption;
  diagonalStripe: DiagonalStripeOption;
  geometric: GeometricOption;
  gridDiagonal: GridDiagonalOption;
  polygonTile: PolygonTileOption;
};
