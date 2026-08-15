export const BENCH_CONFIG = {
  COLS: 3,
  X_START: 15,
  X_STEP: 35,
  Y_START: 10,
  Y_STEP: 15,
} as const;

/**
 * ベンチのインデックスからXY座標を計算する
 */
export function getBenchPos(index: number): { x: number; y: number } {
  const { COLS, X_START, X_STEP, Y_START, Y_STEP } = BENCH_CONFIG;
  return {
    x: X_START + (index % COLS) * X_STEP,
    y: Y_START + Math.floor(index / COLS) * Y_STEP,
  };
}

/**
 * ホーム視点（Normal）の座標を、現在の表示モードに合わせて変換する
 * isFlipped が真なら 180度回転 (100 - x, 100 - y) を適用
 */
export function toViewPos(
  actual: { x: number; y: number },
  isFlipped: boolean,
): { x: number; y: number } {
  if (!isFlipped) return actual;
  return {
    x: 100 - actual.x,
    y: 100 - actual.y,
  };
}

/**
 * 表示上の座標（マウス位置等）を、保存用のホーム視点（Normal）データに変換する
 * 計算式は toViewPos と同じ（180度回転は可逆的なため）
 */
export function toActualPos(
  view: { x: number; y: number },
  isFlipped: boolean,
): { x: number; y: number } {
  return toViewPos(view, isFlipped);
}
