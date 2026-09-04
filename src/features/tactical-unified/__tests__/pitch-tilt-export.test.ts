import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import {
  applyPitchTransformToGroups,
  calculateExportCropRect,
  calculatePitchRect,
  calculatePitchTransform,
  getPitchAndNormPos,
  screenToPitch,
} from '@/features/tactical-unified/objects/canvas';

describe('L3-Tactical-028: Pitch Tilt (2.5D) Bottom-Anchored Transform', () => {
  const pitchRect = { x: 50, y: 30, width: 800, height: 500 };

  it('calculatePitchTransform: 0° tilt yields scaleY == zoom and deltaY == 0', () => {
    const transform = calculatePitchTransform(pitchRect, 100, -40, 1.5, 0);
    expect(transform.x).toBe(150); // 50 + 100
    expect(transform.y).toBe(-10); // 30 - 40
    expect(transform.scaleX).toBe(1.5);
    expect(transform.scaleY).toBe(1.5);
  });

  it('calculatePitchTransform: 25° tilt correctly anchors bottom edge while foreshortening scaleY', () => {
    const zoom = 1.0;
    const transform = calculatePitchTransform(pitchRect, 0, 0, zoom, 25);
    const expectedCos = Math.cos((25 * Math.PI) / 180);
    const expectedDeltaY = pitchRect.height * zoom * (1 - expectedCos);

    expect(transform.x).toBe(pitchRect.x);
    expect(transform.scaleX).toBe(zoom);
    expect(transform.scaleY).toBeCloseTo(zoom * expectedCos, 5);
    expect(transform.y).toBeCloseTo(pitchRect.y + expectedDeltaY, 5);

    // Verify bottom edge remains fixed
    const bottomY = transform.y + pitchRect.height * transform.scaleY;
    expect(bottomY).toBeCloseTo(pitchRect.y + pitchRect.height * zoom, 5);
  });

  it('calculatePitchTransform: 45° tilt anchors bottom edge while top tilts forward', () => {
    const zoom = 1.2;
    const panX = 20;
    const panY = 10;
    const transform = calculatePitchTransform(pitchRect, panX, panY, zoom, 45);
    const expectedCos = Math.cos((45 * Math.PI) / 180);
    const expectedDeltaY = pitchRect.height * zoom * (1 - expectedCos);

    expect(transform.x).toBe(pitchRect.x + panX);
    expect(transform.scaleX).toBe(zoom);
    expect(transform.scaleY).toBeCloseTo(zoom * expectedCos, 5);
    expect(transform.y).toBeCloseTo(pitchRect.y + panY + expectedDeltaY, 5);

    // Verify bottom edge remains fixed at (pitchRect.y + panY + pitchHeight * zoom)
    const bottomY = transform.y + pitchRect.height * transform.scaleY;
    expect(bottomY).toBeCloseTo(
      pitchRect.y + panY + pitchRect.height * zoom,
      5,
    );
  });

  it('calculatePitchTransform: 60° tilt foreshortens scaleY to 50% and anchors bottom edge', () => {
    const zoom = 1.0;
    const transform = calculatePitchTransform(pitchRect, 0, 0, zoom, 60);
    expect(transform.scaleX).toBe(1.0);
    expect(transform.scaleY).toBeCloseTo(0.5, 5);
    // deltaY = 500 * 1.0 * (1 - 0.5) = 250
    expect(transform.y).toBeCloseTo(pitchRect.y + 250, 5);

    // Bottom edge remains at 30 + 500 = 530
    const bottomY = transform.y + pitchRect.height * transform.scaleY;
    expect(bottomY).toBeCloseTo(pitchRect.y + pitchRect.height, 5);
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
      45,
    );

    const expected = calculatePitchTransform(pitchRect, 50, 20, 1.5, 45);
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

describe('L3-Tactical-028: Screen Coordinates Inversion under Tilt', () => {
  const pitchRect = { x: 50, y: 30, width: 800, height: 500 };

  it('screenToPitch and getPitchAndNormPos correctly invert coordinates under tilt', () => {
    const panX = 40;
    const panY = 20;
    const zoom = 1.4;
    const tilt = 30;

    const transform = calculatePitchTransform(
      pitchRect,
      panX,
      panY,
      zoom,
      tilt,
    );

    // Pick a point on the pitch (e.g. at pitch center: 400, 250)
    const pitchInternalX = 400;
    const pitchInternalY = 250;

    // Projected screen position
    const screenX = transform.x + pitchInternalX * transform.scaleX;
    const screenY = transform.y + pitchInternalY * transform.scaleY;

    // Invert using screenToPitch
    const inverted = screenToPitch(
      { x: screenX, y: screenY },
      pitchRect,
      panX,
      panY,
      zoom,
      tilt,
    );

    expect(inverted.x).toBeCloseTo(pitchInternalX, 5);
    expect(inverted.y).toBeCloseTo(pitchInternalY, 5);

    // Verify getPitchAndNormPos
    const { pitchPos, normPos } = getPitchAndNormPos(
      { x: screenX, y: screenY },
      pitchRect,
      { panX, panY, zoom, tilt },
    );
    expect(pitchPos.x).toBeCloseTo(pitchInternalX, 5);
    expect(pitchPos.y).toBeCloseTo(pitchInternalY, 5);
    expect(normPos.x).toBeCloseTo((pitchInternalX / pitchRect.width) * 100, 5);
    expect(normPos.y).toBeCloseTo((pitchInternalY / pitchRect.height) * 100, 5);
  });
});

describe('L3-Tactical-028: Boundary Box Export Crop Rect under Tilt', () => {
  const stageSize = { width: 1000, height: 600 };
  const aspectRatio = '16:9' as const;

  it('境界線枠(boundaryBox)が有効な場合、ピッチチルト時でも境界線の矩形領域がそのままクロップ領域として返される', () => {
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
