import type { StagePixelPoint } from '@/lib/types/tactical/branded';

/**
 * 3Dチルト時のビルボードアイテムの深度キーを算出する。
 * Y座標昇順ソート用（値が小さいほど奥、大きいほど手前）。
 * 同一Y座標の場合は player < text < ball の順に手前に重ねるため微小オフセットを付加する。
 */
export function computeBillboardDepthKey(
  pointPx: StagePixelPoint,
  kind: 'player' | 'ball' | 'text',
  _tiltDeg: number,
): number {
  const kindOffset = kind === 'player' ? 0 : kind === 'text' ? 0.1 : 0.2;
  return pointPx.y + kindOffset;
}
