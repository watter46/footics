import { describe, expect, it } from 'vitest';
import {
  clampNorm,
  clampNormPoint,
  getPitchAndNormPos,
  normToPitch,
  normToPx,
  normToScreen,
  pitchToNorm,
  pitchToScreen,
  pxToNorm,
  screenToPitch,
} from './canvas-coordinates';

const pitchRect = {
  x: 100,
  y: 50,
  width: 800,
  height: 500,
};

describe('normToPx & pxToNorm', () => {
  it('0-100% 正規化値とピクセル値の相互変換が正しく計算される', () => {
    expect(normToPx(0, 800)).toBe(0);
    expect(normToPx(50, 800)).toBe(400);
    expect(normToPx(100, 800)).toBe(800);
    expect(normToPx(25.5, 1000)).toBe(255);

    expect(pxToNorm(0, 800)).toBe(0);
    expect(pxToNorm(400, 800)).toBe(50);
    expect(pxToNorm(800, 800)).toBe(100);
    expect(pxToNorm(255, 1000)).toBe(25.5);
  });

  it('サイズが0の場合に pxToNorm は 0 を返し、ゼロ除算を防ぐ', () => {
    expect(pxToNorm(50, 0)).toBe(0);
  });

  it('normToPx と pxToNorm のラウンドトリップ変換が一貫している', () => {
    const originalNorm = 37.42;
    const size = 640;
    const px = normToPx(originalNorm, size);
    const convertedNorm = pxToNorm(px, size);
    expect(convertedNorm).toBeCloseTo(originalNorm, 6);
  });
});

describe('normToPitch & pitchToNorm', () => {
  it('正規化座標(0-100%)とピッチ実ピクセル座標の相互変換', () => {
    const normCenter = { x: 50, y: 50 };
    const pitchCenter = normToPitch(normCenter, pitchRect);
    expect(pitchCenter).toEqual({ x: 400, y: 250 });

    const convertedNorm = pitchToNorm(pitchCenter, pitchRect);
    expect(convertedNorm).toEqual(normCenter);
  });

  it('ピッチの四隅 (0,0), (100,0), (0,100), (100,100) の変換', () => {
    expect(normToPitch({ x: 0, y: 0 }, pitchRect)).toEqual({ x: 0, y: 0 });
    expect(normToPitch({ x: 100, y: 0 }, pitchRect)).toEqual({
      x: 800,
      y: 0,
    });
    expect(normToPitch({ x: 0, y: 100 }, pitchRect)).toEqual({
      x: 0,
      y: 500,
    });
    expect(normToPitch({ x: 100, y: 100 }, pitchRect)).toEqual({
      x: 800,
      y: 500,
    });

    expect(pitchToNorm({ x: 0, y: 0 }, pitchRect)).toEqual({ x: 0, y: 0 });
    expect(pitchToNorm({ x: 800, y: 500 }, pitchRect)).toEqual({
      x: 100,
      y: 100,
    });
  });
});

describe('clampNorm & clampNormPoint', () => {
  it('clampNorm: 範囲内、上限超過、下限未満のクランプ', () => {
    expect(clampNorm(50)).toBe(50);
    expect(clampNorm(-10)).toBe(0);
    expect(clampNorm(110)).toBe(100);
    expect(clampNorm(0)).toBe(0);
    expect(clampNorm(100)).toBe(100);
  });

  it('clampNorm: カスタム min/max の指定', () => {
    expect(clampNorm(15, 20, 80)).toBe(20);
    expect(clampNorm(50, 20, 80)).toBe(50);
    expect(clampNorm(95, 20, 80)).toBe(80);
  });

  it('clampNormPoint: 2D座標点のクランプ', () => {
    expect(clampNormPoint({ x: -5, y: 105 })).toEqual({ x: 0, y: 100 });
    expect(clampNormPoint({ x: 50, y: 50 })).toEqual({ x: 50, y: 50 });
    expect(clampNormPoint({ x: -10, y: -20 })).toEqual({ x: 0, y: 0 });
    expect(clampNormPoint({ x: 150, y: 200 })).toEqual({ x: 100, y: 100 });
    expect(clampNormPoint({ x: 5, y: 95 }, 10, 90)).toEqual({
      x: 10,
      y: 90,
    });
  });
});

describe('screenToPitch & pitchToScreen', () => {
  it('デフォルト状態 (pan=0, zoom=1, tilt=0) での変換', () => {
    const pitchPoint = { x: 200, y: 150 };
    const screenPoint = pitchToScreen(pitchPoint, pitchRect, 0, 0, 1, 0);
    expect(screenPoint).toEqual({ x: 300, y: 200 });

    const backToPitch = screenToPitch(screenPoint, pitchRect, 0, 0, 1, 0);
    expect(backToPitch).toEqual(pitchPoint);
  });

  it('Pan (パン移動) ありでの相互変換', () => {
    const panX = 40;
    const panY = -30;
    const pitchPoint = { x: 100, y: 80 };

    const screenPoint = pitchToScreen(pitchPoint, pitchRect, panX, panY, 1, 0);
    expect(screenPoint).toEqual({
      x: pitchRect.x + panX + pitchPoint.x,
      y: pitchRect.y + panY + pitchPoint.y,
    });

    const backToPitch = screenToPitch(screenPoint, pitchRect, panX, panY, 1, 0);
    expect(backToPitch).toEqual(pitchPoint);
  });

  it('Zoom (拡大・縮小) ありでの相互変換', () => {
    const zoom = 1.75;
    const pitchPoint = { x: 250, y: 120 };

    const screenPoint = pitchToScreen(pitchPoint, pitchRect, 0, 0, zoom, 0);
    const backToPitch = screenToPitch(screenPoint, pitchRect, 0, 0, zoom, 0);

    expect(backToPitch.x).toBeCloseTo(pitchPoint.x, 6);
    expect(backToPitch.y).toBeCloseTo(pitchPoint.y, 6);
  });

  it('Zoom + Pan + Tilt ありでの完全なラウンドトリップ相互変換', () => {
    const panX = 55;
    const panY = -25;
    const zoom = 1.4;
    const tilt = 35;

    const testPitchPoints = [
      { x: 0, y: 0 },
      { x: 400, y: 250 },
      { x: 800, y: 500 },
      { x: 123.4, y: 456.7 },
    ];

    for (const pitchPoint of testPitchPoints) {
      const screenPoint = pitchToScreen(
        pitchPoint,
        pitchRect,
        panX,
        panY,
        zoom,
        tilt,
      );
      const reconstructed = screenToPitch(
        screenPoint,
        pitchRect,
        panX,
        panY,
        zoom,
        tilt,
      );

      expect(reconstructed.x).toBeCloseTo(pitchPoint.x, 6);
      expect(reconstructed.y).toBeCloseTo(pitchPoint.y, 6);
    }
  });

  it('Tilt の上限値 (85度) および下限値 (0度) の clamp 挙動', () => {
    const pitchPoint = { x: 300, y: 200 };

    const screenNegativeTilt = pitchToScreen(
      pitchPoint,
      pitchRect,
      0,
      0,
      1,
      -15,
    );
    const screenZeroTilt = pitchToScreen(pitchPoint, pitchRect, 0, 0, 1, 0);
    expect(screenNegativeTilt).toEqual(screenZeroTilt);

    const screenExcessiveTilt = pitchToScreen(
      pitchPoint,
      pitchRect,
      0,
      0,
      1,
      95,
    );
    const screenMaxTilt = pitchToScreen(pitchPoint, pitchRect, 0, 0, 1, 85);
    expect(screenExcessiveTilt).toEqual(screenMaxTilt);
  });
});

describe('normToScreen & getPitchAndNormPos', () => {
  it('normToScreen と getPitchAndNormPos の相互変換の一貫性', () => {
    const transform = {
      panX: 30,
      panY: 45,
      zoom: 1.25,
      tilt: 20,
    };

    const normPos = { x: 70, y: 30 };
    const screenPos = normToScreen(
      normPos,
      pitchRect,
      transform.panX,
      transform.panY,
      transform.zoom,
      transform.tilt,
    );

    const result = getPitchAndNormPos(screenPos, pitchRect, transform);

    expect(result.normPos.x).toBeCloseTo(normPos.x, 6);
    expect(result.normPos.y).toBeCloseTo(normPos.y, 6);
  });

  it('getPitchAndNormPos で空の transform オブジェクトを渡した場合にデフォルト値が使用される', () => {
    const screenPos = { x: 500, y: 300 };
    const result = getPitchAndNormPos(screenPos, pitchRect, {});

    expect(result.pitchPos).toEqual({ x: 400, y: 250 });
    expect(result.normPos).toEqual({ x: 50, y: 50 });
  });
});
