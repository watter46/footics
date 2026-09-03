import { describe, expect, it } from 'vitest';
import {
  BOUNDARY_CONFIGS,
  type BoundaryAspectRatio,
  calculatePitchGeometry,
} from '../pitch-constants';

describe('pitch-constants & 5% boundary margin geometry', () => {
  const ratios: BoundaryAspectRatio[] = ['16:9', '9:16', '4:5', '1:1'];

  it('すべての境界線アスペクト比が定義されており、正しいピクセル解像度を持つ', () => {
    for (const ratio of ratios) {
      const config = BOUNDARY_CONFIGS[ratio];
      expect(config).toBeDefined();
      expect(config.ratio).toBeGreaterThan(0);
      expect(config.widthPx).toBeGreaterThan(0);
      expect(config.heightPx).toBeGreaterThan(0);
      expect(config.widthPx / config.heightPx).toBeCloseTo(config.ratio, 3);
    }
  });

  it('calculatePitchGeometry: 上下左右に厳密な5%余白を形成する', () => {
    for (const ratio of ratios) {
      const config = BOUNDARY_CONFIGS[ratio];
      const geom = calculatePitchGeometry(
        config.widthPx,
        config.heightPx,
        5.0,
        config.orientation,
      );

      // 左余白が5%
      expect(geom.pitchLeft).toBeCloseTo(config.widthPx * 0.05, 2);
      // 上余白が5%
      expect(geom.pitchTop).toBeCloseTo(config.heightPx * 0.05, 2);
      // ピッチ幅が90%
      expect(geom.pitchWidth).toBeCloseTo(config.widthPx * 0.9, 2);
      // ピッチ高が90%
      expect(geom.pitchHeight).toBeCloseTo(config.heightPx * 0.9, 2);

      // 右余白 = width - (left + width) = 5%
      const rightMargin = config.widthPx - (geom.pitchLeft + geom.pitchWidth);
      expect(rightMargin).toBeCloseTo(config.widthPx * 0.05, 2);

      // 下余白 = height - (top + height) = 5%
      const bottomMargin = config.heightPx - (geom.pitchTop + geom.pitchHeight);
      expect(bottomMargin).toBeCloseTo(config.heightPx * 0.05, 2);
    }
  });

  it('センターサークルが厳密な真円（半径が等方的）であることを保証する', () => {
    for (const ratio of ratios) {
      const config = BOUNDARY_CONFIGS[ratio];
      const geom = calculatePitchGeometry(
        config.widthPx,
        config.heightPx,
        5.0,
        config.orientation,
      );

      // 中心点が境界線中心(W/2, H/2)と一致
      expect(geom.centerX).toBe(config.widthPx / 2);
      expect(geom.centerY).toBe(config.heightPx / 2);

      // センターサークルの半径が9.15m × meterScaleで正の数
      expect(geom.centerCircleRadius).toBeGreaterThan(0);
      expect(geom.centerCircleRadius).toBeCloseTo(9.15 * geom.meterScale, 2);
    }
  });

  it('ピッチ比率が5%余白の内側長方形（90%×90%）に完全一致して埋めることを保証する', () => {
    for (const ratio of ratios) {
      const config = BOUNDARY_CONFIGS[ratio];
      const geom = calculatePitchGeometry(
        config.widthPx,
        config.heightPx,
        5.0,
        config.orientation,
      );

      // ピッチ外枠の四辺が余白の内側にピッタリ合致
      expect(geom.pitchLeft).toBe(config.widthPx * 0.05);
      expect(geom.pitchTop).toBe(config.heightPx * 0.05);
      expect(geom.pitchWidth).toBe(config.widthPx * 0.9);
      expect(geom.pitchHeight).toBe(config.heightPx * 0.9);

      // ピッチのアスペクト比が境界線の比率と完全一致
      expect(geom.pitchWidth / geom.pitchHeight).toBeCloseTo(config.ratio, 3);
    }
  });
});
