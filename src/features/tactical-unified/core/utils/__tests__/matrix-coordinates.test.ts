import { describe, expect, it } from 'vitest';
import {
  buildMVPMatrix,
  type CameraParams,
  projectPitchToScreen,
  unprojectScreenToPitch,
} from './matrix-coordinates';

const baseParams: CameraParams = {
  tilt: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  stageWidth: 1200,
  stageHeight: 800,
  fov: 60,
};

describe('matrix-coordinates 2D bypass and basic MVP', () => {
  it('buildMVPMatrix should return a valid 16-element mat4 matrix', () => {
    const mvp = buildMVPMatrix(baseParams);
    expect(mvp).toHaveLength(16);
    expect(Number.isNaN(mvp[0])).toBe(false);
  });

  it('1. チルト0度でproject→unprojectが一致すること（往復整合性）', () => {
    const params: CameraParams = { ...baseParams, tilt: 0 };
    const testPoints = [
      { x: 0.5, y: 0.5 }, // ピッチ中央
      { x: 0.1, y: 0.1 }, // 左上
      { x: 0.9, y: 0.9 }, // 右下
      { x: 0.2, y: 0.8 }, // 任意点
    ];

    for (const pt of testPoints) {
      const screen = projectPitchToScreen(pt, params);
      const unprojected = unprojectScreenToPitch(screen, params);

      expect(unprojected).not.toBeNull();
      expect(unprojected?.x).toBeCloseTo(pt.x, 4);
      expect(unprojected?.y).toBeCloseTo(pt.y, 4);
    }
  });

  it('tilt=0 で Pan (px) が Stage ピクセル空間での平行移動として正しく反映されること', () => {
    const params: CameraParams = {
      tilt: 0,
      zoom: 1,
      panX: 50,
      panY: 30,
      stageWidth: 1000,
      stageHeight: 600,
      pitchWidth: 800,
      pitchHeight: 500,
      pitchX: 100,
      pitchY: 50,
    };

    const screen = projectPitchToScreen({ x: 0.5, y: 0.5 }, params);
    expect(screen.x).toBeCloseTo(550, 4);
    expect(screen.y).toBeCloseTo(330, 4);

    const unprojected = unprojectScreenToPitch(screen, params);
    expect(unprojected).not.toBeNull();
    expect(unprojected?.x).toBeCloseTo(0.5, 4);
    expect(unprojected?.y).toBeCloseTo(0.5, 4);
  });
});

describe('matrix-coordinates 3D perspective transformations', () => {
  it('2. チルト30度でも往復整合性が保たれること', () => {
    const params: CameraParams = { ...baseParams, tilt: 30 };
    const testPoints = [
      { x: 0.5, y: 0.5 },
      { x: 0.2, y: 0.3 },
      { x: 0.8, y: 0.7 },
      { x: 0.1, y: 0.9 },
    ];

    for (const pt of testPoints) {
      const screen = projectPitchToScreen(pt, params);
      const unprojected = unprojectScreenToPitch(screen, params);

      expect(unprojected).not.toBeNull();
      expect(unprojected?.x).toBeCloseTo(pt.x, 4);
      expect(unprojected?.y).toBeCloseTo(pt.y, 4);
    }
  });

  it('3. ズーム2倍でも往復整合性が保たれること', () => {
    const params: CameraParams = { ...baseParams, zoom: 2.0, tilt: 25 };
    const testPoints = [
      { x: 0.5, y: 0.5 },
      { x: 0.4, y: 0.6 },
      { x: 0.45, y: 0.55 },
    ];

    for (const pt of testPoints) {
      const screen = projectPitchToScreen(pt, params);
      const unprojected = unprojectScreenToPitch(screen, params);

      expect(unprojected).not.toBeNull();
      expect(unprojected?.x).toBeCloseTo(pt.x, 4);
      expect(unprojected?.y).toBeCloseTo(pt.y, 4);
    }
  });

  it('4. パン・チルト・ズームの複合状態でも往復整合性が保たれること', () => {
    const complexParams: CameraParams = {
      tilt: 45,
      zoom: 1.5,
      panX: 50,
      panY: -30,
      stageWidth: 1920,
      stageHeight: 1080,
      fov: 60,
    };

    const testPoints = [
      { x: 0.5, y: 0.5 },
      { x: 0.3, y: 0.4 },
      { x: 0.7, y: 0.6 },
    ];

    for (const pt of testPoints) {
      const screen = projectPitchToScreen(pt, complexParams);
      const unprojected = unprojectScreenToPitch(screen, complexParams);

      expect(unprojected).not.toBeNull();
      expect(unprojected?.x).toBeCloseTo(pt.x, 4);
      expect(unprojected?.y).toBeCloseTo(pt.y, 4);
    }
  });

  it('5. 3D透視投影で地平線より上の空領域をクリックした場合は null を返すこと', () => {
    const params: CameraParams = {
      ...baseParams,
      tilt: 60,
    };
    // 画面上部（地平線より上）
    const horizonAbove = { x: 600, y: -200 };
    expect(unprojectScreenToPitch(horizonAbove, params)).toBeNull();
  });
});

describe('matrix-coordinates rectangular pitch and extrapolation', () => {
  it('6. ピッチ外でもドラッグ継続のため外挿座標が返り、clamp: trueでは[0, 1]に制限されること', () => {
    const params: CameraParams = { ...baseParams };

    // ピッチ外 (norm = { x: 1.5, y: 1.5 }) を投影したスクリーン座標
    const screenOutside = projectPitchToScreen({ x: 1.5, y: 1.5 }, params);
    const unprojected = unprojectScreenToPitch(screenOutside, params);

    expect(unprojected).not.toBeNull();
    expect(unprojected?.x).toBeCloseTo(1.5, 4);
    expect(unprojected?.y).toBeCloseTo(1.5, 4);

    // clamp: true の場合
    const unprojectedClamped = unprojectScreenToPitch(screenOutside, {
      ...params,
      clamp: true,
    });
    expect(unprojectedClamped).toEqual({ x: 1, y: 1 });
  });

  it('7. 16:9 などの長方形ピッチで境界付近や外側をクリックしても不正なnull落ちが発生しないこと', () => {
    const rectParams: CameraParams = {
      tilt: 0,
      zoom: 1.2,
      panX: 40,
      panY: -20,
      stageWidth: 1280,
      stageHeight: 720,
      pitchWidth: 1050,
      pitchHeight: 680,
      pitchX: 115,
      pitchY: 20,
    };

    // 境界上、境界直近の内外、外側のテスト点
    const testPoints = [
      { x: 0.0, y: 0.0 }, // 左上境界
      { x: 1.0, y: 1.0 }, // 右下境界
      { x: -0.05, y: 0.5 }, // 左外側
      { x: 1.05, y: 0.5 }, // 右外側
      { x: 0.5, y: -0.08 }, // 上外側
      { x: 0.5, y: 1.08 }, // 下外側
    ];

    for (const pt of testPoints) {
      const screen = projectPitchToScreen(pt, rectParams);
      const unprojected = unprojectScreenToPitch(screen, rectParams);

      expect(unprojected).not.toBeNull();
      expect(unprojected?.x).toBeCloseTo(pt.x, 4);
      expect(unprojected?.y).toBeCloseTo(pt.y, 4);
    }
  });

  it('8. 長方形ピッチの 3D (tilt > 0) でも往復整合性が保たれること', () => {
    const rect3DParams: CameraParams = {
      tilt: 35,
      zoom: 1.0,
      panX: 20,
      panY: 10,
      stageWidth: 1920,
      stageHeight: 1080,
      pitchWidth: 1200,
      pitchHeight: 800,
    };

    const testPoints = [
      { x: 0.5, y: 0.5 },
      { x: 0.1, y: 0.2 },
      { x: 0.9, y: 0.8 },
      { x: 1.1, y: 0.5 }, // 外側
    ];

    for (const pt of testPoints) {
      const screen = projectPitchToScreen(pt, rect3DParams);
      const unprojected = unprojectScreenToPitch(screen, rect3DParams);

      expect(unprojected).not.toBeNull();
      expect(unprojected?.x).toBeCloseTo(pt.x, 3);
      expect(unprojected?.y).toBeCloseTo(pt.y, 3);
    }
  });
});
