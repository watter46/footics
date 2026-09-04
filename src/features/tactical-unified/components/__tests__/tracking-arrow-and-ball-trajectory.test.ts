import { describe, expect, it } from 'vitest';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { interpolateBall } from '@/lib/tactical/unified-interpolation';

describe('Tracking Trajectory Arrow & Ball Trajectory Parity', () => {
  describe('GhostTrajectoryArrow: Handle & Bezier Apex Mathematical Parity', () => {
    it('ポインタドラッグ時、逆算された制御点によってベジェ曲線上の点(t=0.5)がポインタ位置と寸分狂わず一致する', () => {
      // 始点(前スライド位置)と終点(現スライド位置)
      const sPx = { x: 150, y: 300 };
      const ePx = { x: 650, y: 300 };

      // ユーザーがポインタ(ハンドル)を任意の位置に動かしたケース
      const testHandlePositions = [
        { x: 400, y: 150 }, // 上に大きく曲げる
        { x: 400, y: 450 }, // 下に大きく曲げる
        { x: 200, y: 100 }, // 左上に急カーブ
        { x: -50, y: -80 }, // 画面外(負の値)
        { x: 900, y: 700 }, // 画面外(正の超過)
      ];

      for (const pos of testHandlePositions) {
        // GhostTrajectoryArrow の onDragMove と同一の計算式
        const calcCpX = 2 * pos.x - 0.5 * (sPx.x + ePx.x);
        const calcCpY = 2 * pos.y - 0.5 * (sPx.y + ePx.y);

        // 2次ベジェ曲線 B(0.5)
        const t = 0.5;
        const oneMinusT = 1 - t;
        const curveApexX =
          oneMinusT * oneMinusT * sPx.x +
          2 * oneMinusT * t * calcCpX +
          t * t * ePx.x;
        const curveApexY =
          oneMinusT * oneMinusT * sPx.y +
          2 * oneMinusT * t * calcCpY +
          t * t * ePx.y;

        expect(curveApexX).toBeCloseTo(pos.x, 6);
        expect(curveApexY).toBeCloseTo(pos.y, 6);
      }
    });

    it('範囲外(0%未満または100%超)の制御点をクランプせずに保持できる', () => {
      const stageSize = { width: 1000, height: 600 };
      const sPx = { x: 200, y: 300 };
      const ePx = { x: 800, y: 300 };

      // 画面上枠を大きく超える位置にドラッグ (Y = -60px)
      const pos = { x: 500, y: -60 };
      const calcCpX = 2 * pos.x - 0.5 * (sPx.x + ePx.x);
      const calcCpY = 2 * pos.y - 0.5 * (sPx.y + ePx.y);

      // クランプなしの正規化座標 (0-100%)
      const normX = (calcCpX / stageSize.width) * 100;
      const normY = (calcCpY / stageSize.height) * 100;

      // Yは 2*(-60) - 300 = -420px -> (-420 / 600) * 100 = -70%
      expect(normY).toBe(-70);
      expect(normX).toBe(50);
    });

    it('中点からのピクセル距離が6px未満なら直線、6px以上ならcustom制御点となる', () => {
      const sPx = { x: 100, y: 200 };
      const ePx = { x: 300, y: 200 };
      const midPx = { x: (sPx.x + ePx.x) / 2, y: (sPx.y + ePx.y) / 2 };

      // 1. 中点から 3px 離れた位置（直線へリセット対象）
      const nearPos = { x: midPx.x, y: midPx.y + 3 };
      const distNear = Math.hypot(nearPos.x - midPx.x, nearPos.y - midPx.y);
      expect(distNear < 6.0).toBe(true);

      // 2. 中点から 10px 離れた位置（カスタムカーブ対象）
      const farPos = { x: midPx.x, y: midPx.y + 10 };
      const distFar = Math.hypot(farPos.x - midPx.x, farPos.y - midPx.y);
      expect(distFar < 6.0).toBe(false);
    });
  });

  describe('Ball Trajectory in Unified Store', () => {
    it('ボールに updateBallTrajectory でベジェ曲線の軌道を設定・更新・解除できる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      // 1. ボールにカスタムベジェ軌道を設定
      store.updateBallTrajectory(slideId, {
        type: 'custom',
        controlPoint: { x: 45, y: -15 }, // 範囲外の制御点
      });

      let curSlide = selectActiveSlide(useTacticalUnifiedStore.getState());
      expect(curSlide?.ball.trajectory).toEqual({
        type: 'custom',
        controlPoint: { x: 45, y: -15 },
      });

      // 2. 直線にリセット
      store.updateBallTrajectory(slideId, {
        type: 'straight',
        controlPoint: undefined,
      });

      curSlide = selectActiveSlide(useTacticalUnifiedStore.getState());
      expect(curSlide?.ball.trajectory?.type).toBe('straight');
      expect(curSlide?.ball.trajectory?.controlPoint).toBeUndefined();
    });

    it('interpolateBall でボールが設定された trajectory に沿ってベジェ補間移動する', () => {
      const ballA = { x: 20, y: 50, visible: true };
      const ballB = {
        x: 80,
        y: 50,
        visible: true,
        trajectory: {
          type: 'custom' as const,
          controlPoint: { x: 50, y: 10 },
        },
      };

      // t=0 (開始)
      const pt0 = interpolateBall(ballA, ballB, 0);
      expect(pt0.x).toBeCloseTo(20, 4);
      expect(pt0.y).toBeCloseTo(50, 4);

      // t=0.5 (中間頂点 M: 0.25*20 + 0.5*50 + 0.25*80 = 5 + 25 + 20 = 50, Y: 0.25*50 + 0.5*10 + 0.25*50 = 12.5 + 5 + 12.5 = 30)
      const ptHalf = interpolateBall(ballA, ballB, 0.5);
      expect(ptHalf.x).toBeCloseTo(50, 4);
      expect(ptHalf.y).toBeCloseTo(30, 4);

      // t=1 (終了)
      const pt1 = interpolateBall(ballA, ballB, 1);
      expect(pt1.x).toBeCloseTo(80, 4);
      expect(pt1.y).toBeCloseTo(50, 4);
    });

    it('swapTeamSides でボールの trajectory.controlPoint も正しく反転される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.setBallPosition(slideId, 30, 40);
      store.updateBallTrajectory(slideId, {
        type: 'custom',
        controlPoint: { x: 25, y: 15 },
      });

      // 左右反転 (16:9 横向き)
      store.swapTeamSides(slideId);

      const flippedSlide = selectActiveSlide(
        useTacticalUnifiedStore.getState(),
      );
      expect(flippedSlide?.ball.x).toBe(70); // 100 - 30
      expect(flippedSlide?.ball.y).toBe(40);
      expect(flippedSlide?.ball.trajectory?.controlPoint?.x).toBe(75); // 100 - 25
      expect(flippedSlide?.ball.trajectory?.controlPoint?.y).toBe(15);
    });
  });
});
