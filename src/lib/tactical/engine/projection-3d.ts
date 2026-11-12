import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import {
  type StagePixelPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { PitchTransform } from '@/lib/types/tactical/slide';

/**
 * 3Dチルト時のビルボードアイテムの深度キーを算出する。
 * Y座標昇順ソート用（値が小さいほど奥、大きいほど手前）。
 * 同一Y座標の場合は player < ball < text の順に手前に重ねるため微小オフセットを付加する。
 */
export function computeBillboardDepthKey(
  pointPx: StagePixelPoint,
  kind: 'player' | 'ball' | 'text',
  tiltDeg: number,
): number {
  const kindBias = kind === 'player' ? 0 : kind === 'ball' ? 0.1 : 0.2;
  const tiltFactor = Math.cos((tiltDeg * Math.PI) / 180);
  return pointPx.y * Math.max(0.1, tiltFactor) + kindBias;
}

/**
 * StagePixelPoint に対して PitchTransform (pan, zoom, tilt) を適用した投影座標を算出する。
 */
export function projectStagePixelWithPitchTransform(
  pointPx: StagePixelPoint,
  viewport: StageViewport,
  pitchTransform?: Partial<PitchTransform> | null,
): StagePixelPoint {
  if (!pitchTransform) return pointPx;
  const zoom = pitchTransform.zoom ?? 1;
  const panX = pitchTransform.panX ?? 0;
  const panY = pitchTransform.panY ?? 0;
  const tilt = pitchTransform.tilt ?? 0;
  if (zoom === 1 && panX === 0 && panY === 0 && tilt === 0) {
    return pointPx;
  }
  const cx = (viewport.offsetX ?? 0) + viewport.width / 2;
  const cy = (viewport.offsetY ?? 0) + viewport.height / 2;
  const dx = (pointPx.x - cx) * zoom + (panX / 100) * viewport.width;
  const dyRaw = (pointPx.y - cy) * zoom + (panY / 100) * viewport.height;
  const tiltRad = (tilt * Math.PI) / 180;
  const cosT = Math.cos(tiltRad);
  const perspective =
    1 + (dyRaw / Math.max(1, viewport.height)) * Math.sin(tiltRad) * 0.35;
  const projectedX = cx + dx * perspective;
  const projectedY = cy + dyRaw * cosT;
  return toStagePixelPoint(projectedX, projectedY);
}
