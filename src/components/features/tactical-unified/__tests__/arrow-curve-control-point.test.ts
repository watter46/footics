import { describe, expect, it } from 'vitest';

describe('AAWU 5-1: Quadratic Bezier Curve Control Point & Apex Parity', () => {
  // 2次ベジェ曲線 B(t)
  const bezierPoint = (
    p0: { x: number; y: number },
    cp: { x: number; y: number },
    p1: { x: number; y: number },
    t: number,
  ) => ({
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * cp.x + t * t * p1.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * cp.y + t * t * p1.y,
  });

  // 頂点 M (t=0.5) の計算
  const calculateApexM = (
    p0: { x: number; y: number },
    cp: { x: number; y: number },
    p1: { x: number; y: number },
  ) => ({
    x: 0.25 * p0.x + 0.5 * cp.x + 0.25 * p1.x,
    y: 0.25 * p0.y + 0.5 * cp.y + 0.25 * p1.y,
  });

  // 頂点 M からの制御点 P_control 逆算
  const calculateControlPoint = (
    p0: { x: number; y: number },
    m: { x: number; y: number },
    p1: { x: number; y: number },
  ) => ({
    x: 2 * m.x - 0.5 * (p0.x + p1.x),
    y: 2 * m.y - 0.5 * (p0.y + p1.y),
  });

  it('頂点 M (t=0.5) の位置は 0.25*P0 + 0.5*P_ctrl + 0.25*P1 と完全に一致する', () => {
    const p0 = { x: 100, y: 200 };
    const p1 = { x: 500, y: 200 };
    const cp = { x: 300, y: 50 };

    const tHalf = bezierPoint(p0, cp, p1, 0.5);
    const apexM = calculateApexM(p0, cp, p1);

    expect(apexM.x).toBeCloseTo(tHalf.x, 6);
    expect(apexM.y).toBeCloseTo(tHalf.y, 6);
    expect(apexM).toEqual({ x: 300, y: 125 });
  });

  it('ユーザーがポインタを M にドラッグしたとき、逆算された P_control により曲線頂点が M に完全吸着する', () => {
    const p0 = { x: 100, y: 200 };
    const p1 = { x: 500, y: 200 };

    // ユーザーがハンドルを (300, 100) にドラッグしたと仮定
    const targetM = { x: 300, y: 100 };
    const cp = calculateControlPoint(p0, targetM, p1);

    // 逆算された制御点: 2 * 300 - 0.5 * (100 + 500) = 600 - 300 = 300
    // Y: 2 * 100 - 0.5 * (200 + 200) = 200 - 200 = 0
    expect(cp).toEqual({ x: 300, y: 0 });

    // この制御点でベジェ曲線の t=0.5 を評価
    const curveApex = bezierPoint(p0, cp, p1, 0.5);

    expect(curveApex.x).toBeCloseTo(targetM.x, 6);
    expect(curveApex.y).toBeCloseTo(targetM.y, 6);
  });

  it('斜め方向や任意の座標配置でも頂点 M とドラッグ位置が寸分狂わず一致する', () => {
    const p0 = { x: 120, y: 340 };
    const p1 = { x: 780, y: 120 };

    const arbitraryPointerPositions = [
      { x: 450, y: 230 }, // 中点 (450, 230)
      { x: 200, y: 50 }, // 大きく左上に曲げる
      { x: 600, y: 500 }, // 大きく右下に曲げる
      { x: 900, y: -100 }, // 枠外
    ];

    for (const targetM of arbitraryPointerPositions) {
      const cp = calculateControlPoint(p0, targetM, p1);
      const curveApex = bezierPoint(p0, cp, p1, 0.5);

      expect(curveApex.x).toBeCloseTo(targetM.x, 5);
      expect(curveApex.y).toBeCloseTo(targetM.y, 5);
    }
  });

  it('直線状態（P_ctrl 未指定）のとき、頂点 M は P0 と P1 の中点に完全に一致する', () => {
    const p0 = { x: 150, y: 250 };
    const p1 = { x: 450, y: 650 };

    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    // 直線時は P_ctrl = mid とみなせる
    const apex = calculateApexM(p0, mid, p1);

    expect(apex).toEqual(mid);
    expect(apex).toEqual({ x: 300, y: 450 });
  });

  it('曲げ幅が非常に大きく制御点が 0% 未満または 100% 超になる場合でも頂点 M は指定位置に完全吸着する', () => {
    // 0-100% 正規化座標系での極端なカーブテスト
    const p0 = { x: 20, y: 50 };
    const p1 = { x: 80, y: 50 };

    // 頂点 M をピッチ上端近く (50, 10) まで大きく曲げる
    const targetM = { x: 50, y: 10 };
    const cp = calculateControlPoint(p0, targetM, p1);

    // 制御点 Y は 2*10 - 50 = -30 (負の値) になる
    expect(cp.x).toEqual(50);
    expect(cp.y).toEqual(-30);

    // この制御点でベジェ曲線を評価
    const curveApex = bezierPoint(p0, cp, p1, 0.5);
    expect(curveApex.x).toBeCloseTo(targetM.x, 6);
    expect(curveApex.y).toBeCloseTo(targetM.y, 6);

    // 逆算頂点 M も targetM と完全一致
    const apex = calculateApexM(p0, cp, p1);
    expect(apex.x).toBeCloseTo(targetM.x, 6);
    expect(apex.y).toBeCloseTo(targetM.y, 6);
  });
});
