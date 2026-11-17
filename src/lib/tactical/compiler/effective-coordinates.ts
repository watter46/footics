import {
  clampToScreenNorm,
  type ScreenNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { EphemeralDragDelta } from './scene-graph-dto';

export function resolveEffectiveScreenNormPos(
  basePos: { readonly x: number; readonly y: number },
  entityId: string,
  activeDragDelta: EphemeralDragDelta | null | undefined,
): ScreenNormPoint {
  if (activeDragDelta?.entityIds.includes(entityId)) {
    return {
      x: clampToScreenNorm(
        basePos.x + activeDragDelta.deltaScreenNormX,
        0,
        100,
      ),
      y: clampToScreenNorm(
        basePos.y + activeDragDelta.deltaScreenNormY,
        0,
        100,
      ),
    };
  }
  return toScreenNormPoint(basePos.x, basePos.y, false);
}
