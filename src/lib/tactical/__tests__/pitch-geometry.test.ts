import { describe, expect, it } from 'vitest';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import {
  calculateNormalizedPitchBounds,
  calculatePitchGeometry,
  calculatePitchGeometryForAspect,
  DEFAULT_PITCH_MARGIN_PERCENT,
  PITCH_BOUNDARY_CONFIGS,
} from '../pitch-geometry';

describe('pitch-geometry & 3% default boundary margin geometry', () => {
  const allRatios: AspectRatio[] = ['16:9', '9:16', '4:5', '1:1'];

  it('DEFAULT_PITCH_MARGIN_PERCENT が 3.0 である', () => {
    expect(DEFAULT_PITCH_MARGIN_PERCENT).toBe(3.0);
  });

  it('4種すべてのアスペクト比マスター設定が正しく定義されている', () => {
    for (const ratio of allRatios) {
      const config = PITCH_BOUNDARY_CONFIGS[ratio];
      expect(config).toBeDefined();
      expect(config.id).toBe(ratio);
      expect(config.ratio).toBeGreaterThan(0);
      expect(config.widthPx).toBeGreaterThan(0);
      expect(config.heightPx).toBeGreaterThan(0);
      expect(config.widthPx / config.heightPx).toBeCloseTo(config.ratio, 3);
    }

    expect(PITCH_BOUNDARY_CONFIGS['16:9'].orientation).toBe('horizontal');
    expect(PITCH_BOUNDARY_CONFIGS['1:1'].orientation).toBe('horizontal');
    expect(PITCH_BOUNDARY_CONFIGS['9:16'].orientation).toBe('vertical');
    expect(PITCH_BOUNDARY_CONFIGS['4:5'].orientation).toBe('vertical');
  });

  it('calculateNormalizedPitchBounds: 3%余白で正規化ピッチ境界線を正しく導出する', () => {
    const bounds = calculateNormalizedPitchBounds();
    expect(bounds.xMin).toBe(3.0);
    expect(bounds.xMax).toBe(97.0);
    expect(bounds.yMin).toBe(3.0);
    expect(bounds.yMax).toBe(97.0);
    expect(bounds.xMid).toBe(50.0);
    expect(bounds.yMid).toBe(50.0);
    expect(bounds.pitchWidth).toBe(94.0);
    expect(bounds.pitchHeight).toBe(94.0);
  });

  it('calculatePitchGeometry: デフォルトで上下左右に厳密な3%余白を形成する', () => {
    for (const ratio of allRatios) {
      const config = PITCH_BOUNDARY_CONFIGS[ratio];
      // デフォルト引数（marginPercent = 3.0）で計算
      const geom = calculatePitchGeometry(
        config.widthPx,
        config.heightPx,
        DEFAULT_PITCH_MARGIN_PERCENT,
        config.orientation,
      );

      // 左余白が3%
      expect(geom.pitchLeft).toBeCloseTo(config.widthPx * 0.03, 2);
      // 上余白が3%
      expect(geom.pitchTop).toBeCloseTo(config.heightPx * 0.03, 2);
      // ピッチ幅が94%
      expect(geom.pitchWidth).toBeCloseTo(config.widthPx * 0.94, 2);
      // ピッチ高が94%
      expect(geom.pitchHeight).toBeCloseTo(config.heightPx * 0.94, 2);

      // 右余白 = width - (left + width) = 3%
      const rightMargin = config.widthPx - (geom.pitchLeft + geom.pitchWidth);
      expect(rightMargin).toBeCloseTo(config.widthPx * 0.03, 2);

      // 下余白 = height - (top + height) = 3%
      const bottomMargin = config.heightPx - (geom.pitchTop + geom.pitchHeight);
      expect(bottomMargin).toBeCloseTo(config.heightPx * 0.03, 2);
    }
  });

  it('すべての比率でセンターサークルが歪みゼロの真円（等方スケーリング）であることを保証する', () => {
    for (const ratio of allRatios) {
      const config = PITCH_BOUNDARY_CONFIGS[ratio];
      const geom = calculatePitchGeometry(
        config.widthPx,
        config.heightPx,
        3.0,
        config.orientation,
      );

      // 中心点が境界線中心 (W/2, H/2) と完全一致
      expect(geom.centerX).toBe(config.widthPx / 2);
      expect(geom.centerY).toBe(config.heightPx / 2);

      // 等方スケール meterScale が短辺方向基準 (Math.min)
      expect(geom.meterScale).toBe(Math.min(geom.scaleLength, geom.scaleWidth));

      // センターサークル半径が 9.15m × meterScale
      expect(geom.centerCircleRadius).toBeGreaterThan(0);
      expect(geom.centerCircleRadius).toBeCloseTo(9.15 * geom.meterScale, 2);
    }
  });

  it('ピッチ比率が3%余白の内側長方形（94%×94%）に完全一致して埋めることを保証する', () => {
    for (const ratio of allRatios) {
      const config = PITCH_BOUNDARY_CONFIGS[ratio];
      const geom = calculatePitchGeometry(
        config.widthPx,
        config.heightPx,
        3.0,
        config.orientation,
      );

      expect(geom.pitchWidth / geom.pitchHeight).toBeCloseTo(config.ratio, 3);
    }
  });

  it('calculatePitchGeometryForAspect: AspectRatio型指定で正確な幾何オブジェクトとconfigを返す', () => {
    for (const ratio of allRatios) {
      const result = calculatePitchGeometryForAspect(ratio);
      expect(result.config.id).toBe(ratio);
      expect(result.pitchWidth).toBeCloseTo(result.config.widthPx * 0.94, 2);
      expect(result.pitchHeight).toBeCloseTo(result.config.heightPx * 0.94, 2);
      expect(result.centerCircleRadius).toBeGreaterThan(0);
    }
  });
});
