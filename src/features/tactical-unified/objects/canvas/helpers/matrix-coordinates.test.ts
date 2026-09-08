import { describe, expect, it } from 'vitest';
import {
  buildMVPMatrix,
  type CameraParams,
  projectPitchToScreen,
  unprojectScreenToPitch,
} from './matrix-coordinates';

describe('matrix-coordinates 3D coordinate transformations', () => {
  const baseParams: CameraParams = {
    tilt: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    stageWidth: 1200,
    stageHeight: 800,
    fov: 60,
  };

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

  it('4. ピッチ外（norm = {x:2, y:2}相当の画面外）でunprojectがnullを返すこと', () => {
    const params: CameraParams = { ...baseParams };

    // ピッチ外 (norm = { x: 2, y: 2 }) を投影したスクリーン座標
    const screenFarOutside = projectPitchToScreen({ x: 2, y: 2 }, params);
    const unprojected = unprojectScreenToPitch(screenFarOutside, params);

    expect(unprojected).toBeNull();

    // 画面の極端な端
    const screenTopCorner = { x: -1000, y: -1000 };
    expect(unprojectScreenToPitch(screenTopCorner, params)).toBeNull();
  });

  it('5. パン・チルト・ズームの複合状態でも往復整合性が保たれること', () => {
    const complexParams: CameraParams = {
      tilt: 45,
      zoom: 1.5,
      panX: 0.1,
      panY: -0.05,
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
});
