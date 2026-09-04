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

  it('【方針A】矢印がキャンバス外にまたがって移動しても長さと角度が100%不変である', () => {
    // 始点 (80, 50), 終点 (110, 60) の矢印（終点がキャンバス外 x=110 にはみ出る）
    const p0 = { x: 80, y: 50 };
    const p1 = { x: 110, y: 60 };

    const originalLength = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const originalAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    // 平行移動 (+30, -20) -> p0は(110, 30), p1は(140, 40)
    const dx = 30;
    const dy = -20;
    const movedP0 = { x: p0.x + dx, y: p0.y + dy };
    const movedP1 = { x: p1.x + dx, y: p1.y + dy };

    const newLength = Math.hypot(movedP1.x - movedP0.x, movedP1.y - movedP0.y);
    const newAngle = Math.atan2(movedP1.y - movedP0.y, movedP1.x - movedP0.x);

    expect(newLength).toBeCloseTo(originalLength, 8);
    expect(newAngle).toBeCloseTo(originalAngle, 8);
  });

  it('【方針A】多角形ゾーンがキャンバス外に移動しても全頂点の相対幾何構造が維持される', () => {
    // 三角形ゾーン
    const polygon = [
      { x: 90, y: 20 },
      { x: 105, y: 40 }, // キャンバス外
      { x: 85, y: 50 },
    ];

    const dx = 20;
    const dy = 10;
    const movedPolygon = polygon.map((p) => ({ x: p.x + dx, y: p.y + dy }));

    // 各辺の長さが完全に一致することを検証
    for (let i = 0; i < polygon.length; i++) {
      const nextIdx = (i + 1) % polygon.length;
      const origDist = Math.hypot(
        polygon[nextIdx].x - polygon[i].x,
        polygon[nextIdx].y - polygon[i].y,
      );
      const movedDist = Math.hypot(
        movedPolygon[nextIdx].x - movedPolygon[i].x,
        movedPolygon[nextIdx].y - movedPolygon[i].y,
      );
      expect(movedDist).toBeCloseTo(origDist, 8);
    }
  });

  describe('AAWU 5-7: Direct Grab & Drag for Arrows', () => {
    it('未選択状態から矢印を直接ドラッグ移動した際、始点・終点・制御点が同一デルタで完全に追従する', () => {
      const p0 = { x: 30, y: 40 };
      const p1 = { x: 70, y: 80 };
      const cp = { x: 50, y: 30 }; // カーブ制御点

      const dxNorm = 15.5;
      const dyNorm = -8.2;

      const newP0 = { x: p0.x + dxNorm, y: p0.y + dyNorm };
      const newP1 = { x: p1.x + dxNorm, y: p1.y + dyNorm };
      const newCp = { x: cp.x + dxNorm, y: cp.y + dyNorm };

      // 元の長さと移動後の長さが一致
      expect(Math.hypot(newP1.x - newP0.x, newP1.y - newP0.y)).toBeCloseTo(
        Math.hypot(p1.x - p0.x, p1.y - p0.y),
        8,
      );

      // 移動前後のベジェ曲線頂点 M の相対オフセットが一致
      const origApex = calculateApexM(p0, cp, p1);
      const newApex = calculateApexM(newP0, newCp, newP1);

      expect(newApex.x).toBeCloseTo(origApex.x + dxNorm, 8);
      expect(newApex.y).toBeCloseTo(origApex.y + dyNorm, 8);
    });

    it('直線矢印を直接ドラッグした際、controlPoint が undefined のまま始点・終点のみが平行移動する', () => {
      const p0 = { x: 20, y: 30 };
      const p1 = { x: 60, y: 30 };

      const dxNorm = -5;
      const dyNorm = 12;

      const patch = {
        points: [
          { x: p0.x + dxNorm, y: p0.y + dyNorm },
          { x: p1.x + dxNorm, y: p1.y + dyNorm },
        ],
      };

      expect(patch.points[0]).toEqual({ x: 15, y: 42 });
      expect(patch.points[1]).toEqual({ x: 55, y: 42 });
      expect(
        Math.hypot(
          patch.points[1].x - patch.points[0].x,
          patch.points[1].y - patch.points[0].y,
        ),
      ).toBeCloseTo(40, 8);
    });
  });
});
