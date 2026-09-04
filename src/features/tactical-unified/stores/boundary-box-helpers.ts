import type { AspectRatio, BoundaryBox } from '@/lib/types/tactical-unified';
import { DEFAULT_BOUNDARY_BOX_SCREENSHOT } from '@/lib/types/tactical-unified';

/**
 * ピッチフィット用の境界ボックスを計算する純粋関数
 */
export function computePitchFitBoundaryBox(
  isPitchBg: boolean,
  _aspectRatio: AspectRatio = '16:9',
  pitchPosition?: { x: number; y: number },
): BoundaryBox {
  if (!isPitchBg) {
    const base = { ...DEFAULT_BOUNDARY_BOX_SCREENSHOT };
    if (pitchPosition) {
      base.x = Math.round((base.x + pitchPosition.x) * 100) / 100;
      base.y = Math.round((base.y + pitchPosition.y) * 100) / 100;
    }
    return base;
  }
  const base: BoundaryBox = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    enabled: true,
    fitTarget: 'pitch',
  };

  if (pitchPosition) {
    base.x = Math.round((base.x + pitchPosition.x) * 100) / 100;
    base.y = Math.round((base.y + pitchPosition.y) * 100) / 100;
  }
  return base;
}
