import { describe, expect, it } from 'vitest';
import {
  clampNorm,
  clampNormPoint,
  getPitchAndNormPos,
  getStagePitchAndNormPos,
  normToPitch,
  normToPx,
  normToScreen,
  pitchToNorm,
  pitchToScreen,
  pitchToStage,
  pxToNorm,
  screenToPitch,
  stageToPitch,
  unprojectScreenYToCssRotateX,
} from '../canvas-coordinates';
import { calculatePitchTransform } from '../canvas-pitch-transform-helper';

const pitchRect = { x: 100, y: 50, width: 800, height: 500 };

describe('2D norm, px, and clamp transformations', () => {
  it('0-100% 正規化値とピクセル値の相互変換およびクランプ', () => {
    expect(normToPx(0, 800)).toBe(0);
    expect(normToPx(50, 800)).toBe(400);
    expect(pxToNorm(400, 800)).toBe(50);
    expect(pxToNorm(50, 0)).toBe(0);
    expect(pxToNorm(normToPx(37.42, 640), 640)).toBeCloseTo(37.42, 6);

    expect(normToPitch({ x: 50, y: 50 }, pitchRect)).toEqual({
      x: 400,
      y: 250,
    });
    expect(pitchToNorm({ x: 400, y: 250 }, pitchRect)).toEqual({
      x: 50,
      y: 50,
    });
    expect(normToPitch({ x: 0, y: 0 }, pitchRect)).toEqual({ x: 0, y: 0 });

    expect(clampNorm(50)).toBe(50);
    expect(clampNorm(-10)).toBe(0);
    expect(clampNorm(110)).toBe(100);
    expect(clampNormPoint({ x: -5, y: 105 })).toEqual({ x: 0, y: 100 });
    expect(clampNormPoint({ x: 5, y: 95 }, 10, 90)).toEqual({ x: 10, y: 90 });
  });
});

describe('screenToPitch & pitchToScreen: 2D & 3D transformations', () => {
  it('デフォルト状態およびPanでの変換', () => {
    const pt = { x: 200, y: 150 };
    const screen = pitchToScreen(pt, pitchRect, 0, 0, 1, 0);
    expect(screen).toEqual({ x: 300, y: 200 });
    expect(screenToPitch(screen, pitchRect, 0, 0, 1, 0)).toEqual(pt);

    const pt2 = { x: 100, y: 80 };
    const screen2 = pitchToScreen(pt2, pitchRect, 40, -30, 1, 0);
    expect(screen2).toEqual({
      x: pitchRect.x + 40 + 100,
      y: pitchRect.y - 30 + 80,
    });
    expect(screenToPitch(screen2, pitchRect, 40, -30, 1, 0)).toEqual(pt2);
  });

  it('Zoom + Tilt ありでの完全なラウンドトリップ相互変換', () => {
    for (const zoom of [0.5, 1.0, 2.0]) {
      for (const pt of [
        { x: 0, y: 0 },
        { x: 400, y: 250 },
        { x: 800, y: 500 },
      ]) {
        const screen = pitchToScreen(pt, pitchRect, 55, -25, zoom, 35);
        const back = screenToPitch(screen, pitchRect, 55, -25, zoom, 35);
        expect(back.x).toBeCloseTo(pt.x, 6);
        expect(back.y).toBeCloseTo(pt.y, 6);
      }
    }
  });

  it('Tilt clamp 挙動 (0度〜85度)', () => {
    const pt = { x: 300, y: 200 };
    expect(pitchToScreen(pt, pitchRect, 0, 0, 1, -15)).toEqual(
      pitchToScreen(pt, pitchRect, 0, 0, 1, 0),
    );
    expect(pitchToScreen(pt, pitchRect, 0, 0, 1, 95)).toEqual(
      pitchToScreen(pt, pitchRect, 0, 0, 1, 85),
    );
  });

  it('Konva Group 中心基準描画と pitchToScreen/screenToPitch の整合性', () => {
    for (const zoom of [0.5, 1.5]) {
      for (const pan of [
        { x: 0, y: 0 },
        { x: 60, y: -40 },
      ]) {
        const tf = calculatePitchTransform(pitchRect, pan.x, pan.y, zoom, 0);
        for (const pt of [
          { x: 0, y: 0 },
          { x: 400, y: 250 },
        ]) {
          const konvaX = tf.x + pt.x * tf.scaleX;
          const konvaY = tf.y + pt.y * tf.scaleY;
          const screenPos = pitchToScreen(pt, pitchRect, pan.x, pan.y, zoom, 0);
          expect(konvaX).toBeCloseTo(screenPos.x, 6);
          expect(konvaY).toBeCloseTo(screenPos.y, 6);
          const back = screenToPitch(
            { x: konvaX, y: konvaY },
            pitchRect,
            pan.x,
            pan.y,
            zoom,
            0,
          );
          expect(back.x).toBeCloseTo(pt.x, 6);
          expect(back.y).toBeCloseTo(pt.y, 6);
        }
      }
    }
  });
});

describe('normToScreen & getPitchAndNormPos', () => {
  it('normToScreen と getPitchAndNormPos の相互変換の一貫性およびデフォルト値', () => {
    const tf = { panX: 30, panY: 45, zoom: 1.25, tilt: 20 };
    const screen = normToScreen(
      { x: 70, y: 30 },
      pitchRect,
      tf.panX,
      tf.panY,
      tf.zoom,
      tf.tilt,
    );
    const res = getPitchAndNormPos(screen, pitchRect, tf);
    expect(res.normPos.x).toBeCloseTo(70, 6);
    expect(res.normPos.y).toBeCloseTo(30, 6);

    const resDef = getPitchAndNormPos({ x: 500, y: 300 }, pitchRect, {});
    expect(resDef.pitchPos).toEqual({ x: 400, y: 250 });
    expect(resDef.normPos).toEqual({ x: 50, y: 50 });
  });
});

describe('stageToPitch & pitchToStage & getStagePitchAndNormPos', () => {
  it('stageToPitch と pitchToStage のラウンドトリップ相互変換の一貫性', () => {
    for (const zoom of [0.5, 1.5]) {
      for (const pan of [
        { x: 0, y: 0 },
        { x: 50, y: -30 },
      ]) {
        for (const pt of [
          { x: 0, y: 0 },
          { x: 400, y: 250 },
          { x: 800, y: 500 },
        ]) {
          const stagePos = pitchToStage(pt, pitchRect, pan.x, pan.y, zoom);
          const back = stageToPitch(stagePos, pitchRect, pan.x, pan.y, zoom);
          expect(back.x).toBeCloseTo(pt.x, 6);
          expect(back.y).toBeCloseTo(pt.y, 6);
        }
      }
    }
  });

  it('Konva Group (calculatePitchTransform) の描画位置と pitchToStage/stageToPitch の完全一致', () => {
    const zoom = 1.6;
    const pan = { x: 75, y: -45 };
    const tf = calculatePitchTransform(pitchRect, pan.x, pan.y, zoom, 0);

    const pt = { x: 300, y: 200 };
    const konvaStageX = tf.x + pt.x * tf.scaleX;
    const konvaStageY = tf.y + pt.y * tf.scaleY;

    const stagePos = pitchToStage(pt, pitchRect, pan.x, pan.y, zoom);
    expect(stagePos.x).toBeCloseTo(konvaStageX, 6);
    expect(stagePos.y).toBeCloseTo(konvaStageY, 6);

    const inverted = stageToPitch(
      { x: konvaStageX, y: konvaStageY },
      pitchRect,
      pan.x,
      pan.y,
      zoom,
    );
    expect(inverted.x).toBeCloseTo(pt.x, 6);
    expect(inverted.y).toBeCloseTo(pt.y, 6);
  });

  it('getStagePitchAndNormPos: CSS 3D Tilt が有効な場合でも二重逆変換を発生させず Stage 2D 平面を正確に逆変換する', () => {
    const tf = { panX: 40, panY: -20, zoom: 1.4, tilt: 45 };
    const pt = { x: 400, y: 250 };

    const stagePos = pitchToStage(pt, pitchRect, tf.panX, tf.panY, tf.zoom);
    const { pitchPos, normPos } = getStagePitchAndNormPos(
      stagePos,
      pitchRect,
      tf,
    );

    expect(pitchPos.x).toBeCloseTo(pt.x, 6);
    expect(pitchPos.y).toBeCloseTo(pt.y, 6);
    expect(normPos.x).toBeCloseTo(50, 6);
    expect(normPos.y).toBeCloseTo(50, 6);
  });

  it('3D チルト適用時 (tilt = 30°)、ピッチ上半分および全域のスクリーンポインタが正確にピッチ座標へ逆変換される', () => {
    const tilt = 30;
    const testPoints = [
      { x: 0, y: 0 },
      { x: 400, y: 50 },
      { x: 400, y: 250 },
      { x: 400, y: 500 },
    ];

    for (const pt of testPoints) {
      const screenPos = pitchToScreen(pt, pitchRect, 0, 0, 1, tilt);
      const res = getPitchAndNormPos(screenPos, pitchRect, {
        panX: 0,
        panY: 0,
        zoom: 1,
        tilt,
      });

      expect(res.pitchPos.x).toBeCloseTo(pt.x, 4);
      expect(res.pitchPos.y).toBeCloseTo(pt.y, 4);

      const isInsidePitch =
        res.pitchPos.x >= -0.5 &&
        res.pitchPos.x <= pitchRect.width + 0.5 &&
        res.pitchPos.y >= -0.5 &&
        res.pitchPos.y <= pitchRect.height + 0.5;
      expect(isInsidePitch).toBe(true);
    }
  });
});

describe('unprojectScreenYToCssRotateX', () => {
  const stageCenterY = 300;
  const perspective = 1200;

  it('tiltDeg = 0 の場合は screenY - stageCenterY をそのまま返す', () => {
    expect(unprojectScreenYToCssRotateX(300, stageCenterY, 0)).toBe(0);
    expect(unprojectScreenYToCssRotateX(450, stageCenterY, 0)).toBe(150);
    expect(unprojectScreenYToCssRotateX(120, stageCenterY, 0)).toBe(-180);
  });

  it('tiltDeg = 30° および 60° で正変換（CSS rotateX + perspective）とのラウンドトリップが一致する', () => {
    for (const tilt of [30, 60]) {
      const theta = (tilt * Math.PI) / 180;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      for (const localY of [-200, -100, 0, 100, 200]) {
        const y3d = localY * cosTheta;
        const z3d = localY * sinTheta;
        const scale = perspective / (perspective - z3d);
        const screenY = stageCenterY + y3d * scale;
        const unprojected = unprojectScreenYToCssRotateX(
          screenY,
          stageCenterY,
          tilt,
          perspective,
        );
        expect(unprojected).not.toBeNull();
        if (unprojected !== null) {
          expect(unprojected).toBeCloseTo(localY, 4);
        }
      }
    }
  });

  it('地平線以上の座標では null を返す', () => {
    const tilt = 60;
    const horizonDy = -perspective / Math.tan((tilt * Math.PI) / 180);
    expect(
      unprojectScreenYToCssRotateX(
        stageCenterY + horizonDy - 50,
        stageCenterY,
        tilt,
        perspective,
      ),
    ).toBeNull();
    expect(
      unprojectScreenYToCssRotateX(
        stageCenterY + horizonDy,
        stageCenterY,
        tilt,
        perspective,
      ),
    ).toBeNull();
    expect(
      unprojectScreenYToCssRotateX(
        stageCenterY + horizonDy + 50,
        stageCenterY,
        tilt,
        perspective,
      ),
    ).not.toBeNull();
  });
});
