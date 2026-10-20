import { describe, expect, it } from 'vitest';
import {
  getPitchRectNormalized,
  mapPlayersToPitchRect,
  pitchToStageCoord,
  stageToPitchCoord,
} from '../pitch-stage-mapping';

describe('pitch-stage-mapping', () => {
  it('Stageがピッチより横長なら左右に余白、縦長なら上下に余白を取り中央揃え', () => {
    // 1000x600 (1.667) に 4:5 (0.8): 高さ全面、幅 48%
    const r = getPitchRectNormalized(1000 / 600, '4:5');
    expect(r.height).toBeCloseTo(100);
    expect(r.width).toBeCloseTo(48);
    expect(r.x).toBeCloseTo(26);
    expect(r.y).toBeCloseTo(0);
    // 600x1000 (0.6) に 16:9: 幅全面、高さ ≈ 33.75%
    const v = getPitchRectNormalized(0.6, '16:9');
    expect(v.width).toBeCloseTo(100);
    expect(v.height).toBeCloseTo((100 * 0.6) / (16 / 9));
    expect(v.y).toBeCloseTo((100 - v.height) / 2);
  });

  it('未計測(null)は全面を返す', () => {
    expect(getPitchRectNormalized(null, '4:5')).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  it('ピッチ基準 → Stage 座標でピッチ矩形内に収まり、逆変換で往復一致', () => {
    const rect = getPitchRectNormalized(1000 / 600, '4:5');
    const p = pitchToStageCoord({ x: 0, y: 100 }, rect);
    expect(p.x).toBeCloseTo(rect.x);
    expect(p.y).toBeCloseTo(100);
    const back = stageToPitchCoord(
      pitchToStageCoord({ x: 30, y: 70 }, rect),
      rect,
    );
    expect(back.x).toBeCloseTo(30);
    expect(back.y).toBeCloseTo(70);
  });

  it('mapPlayersToPitchRect は全員をピッチ矩形内へ写像', () => {
    const rect = getPitchRectNormalized(1000 / 600, '4:5');
    const out = mapPlayersToPitchRect(
      [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      rect,
    );
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(rect.x - 1e-9);
      expect(p.x).toBeLessThanOrEqual(rect.x + rect.width + 1e-9);
    }
  });
});
