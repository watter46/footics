export interface PitchDimensions {
  width: number;
  height: number;
}

export interface PitchPoint {
  x: number;
  y: number;
}

/**
 * Normalizes pitch coordinates (default pitch: 105m x 68m) into percentage (0 - 100%).
 * Clamps output within [0, 100].
 */
export function normalizePitchCoordinate(
  point: PitchPoint,
  dimensions: PitchDimensions = { width: 105, height: 68 },
): PitchPoint {
  const safeWidth = dimensions.width > 0 ? dimensions.width : 105;
  const safeHeight = dimensions.height > 0 ? dimensions.height : 68;
  const rawX = (point.x / safeWidth) * 100;
  const rawY = (point.y / safeHeight) * 100;

  return {
    x: Math.max(0, Math.min(100, Math.round(rawX * 10) / 10)),
    y: Math.max(0, Math.min(100, Math.round(rawY * 10) / 10)),
  };
}
