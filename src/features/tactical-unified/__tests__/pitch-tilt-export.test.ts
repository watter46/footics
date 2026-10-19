import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import {
  applyPitchTransformToGroups,
  calculateExportCropRect,
  calculatePitchRect,
  calculatePitchTransform,
  getPitchAndNormPos,
  pitchToScreen,
  screenToPitch,
} from '@/features/tactical-unified/core';

describe('Pitch Center-Anchored Transform & Tilt 3D Inversion', () => {
  const pitchRect = { x: 50, y: 30, width: 800, height: 500 };

  it('calculatePitchTransform: ピッチ幾何学中心基準で deltaX / deltaY が算出され、scaleX/scaleY が等倍 zoom となる', () => {
    const zoom = 1.5;
    const panX = 100;
    const panY = -40;
    const transform = calculatePitchTransform(pitchRect, panX, panY, zoom, 0);

    const expectedDeltaX = (pitchRect.width / 2) * (1 - zoom); // 400 * (-0.5) = -200
    const expectedDeltaY = (pitchRect.height / 2) * (1 - zoom); // 250 * (-0.5) = -125

    expect(transform.x).toBe(pitchRect.x + panX + expectedDeltaX); // 50 + 100 - 200 = -50
    expect(transform.y).toBe(pitchRect.y + panY + expectedDeltaY); // 30 - 40 - 125 = -135
    expect(transform.scaleX).toBe(zoom);
    expect(transform.scaleY).toBe(zoom);

    // ピッチ幾何学中心の位置が (pitchRect.center + pan) と一致することを確認
    const centerX = transform.x + (pitchRect.width / 2) * transform.scaleX;
    const centerY = transform.y + (pitchRect.height / 2) * transform.scaleY;
    expect(centerX).toBe(pitchRect.x + pitchRect.width / 2 + panX);
    expect(centerY).toBe(pitchRect.y + pitchRect.height / 2 + panY);
  });

  it('calculatePitchTransform: 複数ズームレベルでの中心基準維持', () => {
    const zoomLevels = [0.5, 1.0, 1.5, 2.0];
    for (const zoom of zoomLevels) {
      const transform = calculatePitchTransform(pitchRect, 0, 0, zoom, 0);
      const centerX = transform.x + (pitchRect.width / 2) * transform.scaleX;
      const centerY = transform.y + (pitchRect.height / 2) * transform.scaleY;

      expect(centerX).toBeCloseTo(pitchRect.x + pitchRect.width / 2, 5);
      expect(centerY).toBeCloseTo(pitchRect.y + pitchRect.height / 2, 5);
    }
  });

  it('applyPitchTransformToGroups applies calculated transform to Konva groups and batches redraw', () => {
    const batchDraw = vi.fn();
    const mockLayer = { batchDraw } as unknown as Konva.Layer;

    const mockGroup1 = {
      x: vi.fn(),
      y: vi.fn(),
      scaleX: vi.fn(),
      scaleY: vi.fn(),
      getLayer: () => mockLayer,
    } as unknown as Konva.Group;

    const mockGroup2 = {
      x: vi.fn(),
      y: vi.fn(),
      scaleX: vi.fn(),
      scaleY: vi.fn(),
      getLayer: () => mockLayer,
    } as unknown as Konva.Group;

    applyPitchTransformToGroups(
      [mockGroup1, mockGroup2],
      pitchRect,
      50,
      20,
      1.5,
      0,
    );

    const expected = calculatePitchTransform(pitchRect, 50, 20, 1.5, 0);
    expect(mockGroup1.x).toHaveBeenCalledWith(expected.x);
    expect(mockGroup1.y).toHaveBeenCalledWith(expected.y);
    expect(mockGroup1.scaleX).toHaveBeenCalledWith(expected.scaleX);
    expect(mockGroup1.scaleY).toHaveBeenCalledWith(expected.scaleY);

    expect(mockGroup2.x).toHaveBeenCalledWith(expected.x);
    expect(mockGroup2.y).toHaveBeenCalledWith(expected.y);
    expect(mockGroup2.scaleX).toHaveBeenCalledWith(expected.scaleX);
    expect(mockGroup2.scaleY).toHaveBeenCalledWith(expected.scaleY);

    expect(batchDraw).toHaveBeenCalledTimes(1);
  });
});

describe('Screen Coordinates Inversion under Tilt & Zoom', () => {
  const pitchRect = { x: 50, y: 30, width: 800, height: 500 };

  it('screenToPitch and getPitchAndNormPos correctly invert coordinates under tilt and zoom', () => {
    const panX = 40;
    const panY = 20;
    const zoom = 1.4;
    const tilt = 30;

    // Pick a point on the pitch (e.g. at pitch center: 400, 250)
    const pitchInternalX = 400;
    const pitchInternalY = 250;

    const screenPoint = pitchToScreen(
      { x: pitchInternalX, y: pitchInternalY },
      pitchRect,
      panX,
      panY,
      zoom,
      tilt,
    );

    // Invert using screenToPitch
    const inverted = screenToPitch(
      screenPoint,
      pitchRect,
      panX,
      panY,
      zoom,
      tilt,
    );

    expect(inverted.x).toBeCloseTo(pitchInternalX, 5);
    expect(inverted.y).toBeCloseTo(pitchInternalY, 5);

    // Verify getPitchAndNormPos
    const { pitchPos, normPos } = getPitchAndNormPos(screenPoint, pitchRect, {
      panX,
      panY,
      zoom,
      tilt,
    });
    expect(pitchPos.x).toBeCloseTo(pitchInternalX, 5);
    expect(pitchPos.y).toBeCloseTo(pitchInternalY, 5);
    expect(normPos.x).toBeCloseTo((pitchInternalX / pitchRect.width) * 100, 5);
    expect(normPos.y).toBeCloseTo((pitchInternalY / pitchRect.height) * 100, 5);
  });
});

describe('Boundary Box Export Crop Rect under Zoom & Tilt', () => {
  const stageSize = { width: 1000, height: 600 };
  const aspectRatio = '16:9' as const;

  it('境界線枠(boundaryBox)が有効な場合、境界線の矩形領域がそのままクロップ領域として返される', () => {
    const boundaryBox = {
      x: 20,
      y: 15,
      width: 60,
      height: 70,
      enabled: true,
    };

    const crop = calculateExportCropRect({
      stageSize,
      aspectRatio,
      boundaryBox,
    });

    const pitchRect = calculatePitchRect(stageSize, aspectRatio);
    expect(crop.width).toBe((60 / 100) * pitchRect.width);
    expect(crop.height).toBe((70 / 100) * pitchRect.height);
    expect(crop.x).toBe(pitchRect.x + (20 / 100) * pitchRect.width);
    expect(crop.y).toBe(pitchRect.y + (15 / 100) * pitchRect.height);
  });

  it('fitTargetがcanvasの場合、Stage全体のサイズを基準にクロップ矩形を算出する', () => {
    const boundaryBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      fitTarget: 'canvas' as const,
    };

    const crop = calculateExportCropRect({
      stageSize,
      aspectRatio,
      boundaryBox,
    });

    expect(crop.x).toBe(100);
    expect(crop.y).toBe(60);
    expect(crop.width).toBe(800);
    expect(crop.height).toBe(480);
  });

  it('boundaryBoxが無効な場合はピッチ矩形全体を返す', () => {
    const crop = calculateExportCropRect({
      stageSize,
      aspectRatio,
      boundaryBox: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: false,
      },
    });

    const pitchRect = calculatePitchRect(stageSize, aspectRatio);
    expect(crop).toEqual({
      x: pitchRect.x,
      y: pitchRect.y,
      width: pitchRect.width,
      height: pitchRect.height,
    });
  });
});
