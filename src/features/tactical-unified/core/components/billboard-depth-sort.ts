import type { BallObjectProps } from '@/features/tactical-unified/objects/ball/types';
import type { Player, TextAnnotation } from '@/lib/types/tactical-unified';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import {
  type CameraState,
  DEFAULT_CAMERA_STATE,
  worldToScreen,
} from '../utils/matrix-coordinates';

export function sortBillboardItemsByDepth<T extends { x?: number; y: number }>(
  items: readonly T[],
  pitchRect: PitchRectBounds,
  camera: Partial<CameraState> = DEFAULT_CAMERA_STATE,
): T[] {
  return [...items].sort((a, b) => {
    const screenA = worldToScreen({ x: a.x ?? 50, y: a.y }, pitchRect, camera);
    const screenB = worldToScreen({ x: b.x ?? 50, y: b.y }, pitchRect, camera);
    return screenA.y - screenB.y;
  });
}

export type BillboardItem =
  | { kind: 'player'; data: Player; x: number; y: number }
  | { kind: 'ball'; data: BallObjectProps['ball']; x: number; y: number }
  | { kind: 'text'; data: TextAnnotation; x: number; y: number };

export function buildBillboardItems(
  markers: readonly Player[],
  ball: BallObjectProps['ball'] | null | undefined,
  showBall: boolean,
  texts: readonly TextAnnotation[],
): BillboardItem[] {
  return [
    ...markers.map((m) => ({
      kind: 'player' as const,
      data: m,
      x: m.x,
      y: m.y,
    })),
    ...(showBall && ball
      ? [{ kind: 'ball' as const, data: ball, x: ball.x, y: ball.y }]
      : []),
    ...texts.map((t) => ({
      kind: 'text' as const,
      data: t,
      x: t.x,
      y: t.y,
    })),
  ];
}
