/**
 * math-utils.ts
 * 座標変換共通ヘルパー (正規化座標 0〜100 <-> ピクセル座標)
 */

export function normX(v: number, w: number): number {
  return (v / 100) * w;
}

export function normY(v: number, h: number): number {
  return (v / 100) * h;
}

export function pxToNormX(px: number, w: number): number {
  return (px / w) * 100;
}

export function pxToNormY(py: number, h: number): number {
  return (py / h) * 100;
}

export function cpPxToNormX(px: number, w: number): number {
  return (px / w) * 100;
}

export function cpPxToNormY(py: number, h: number): number {
  return (py / h) * 100;
}
