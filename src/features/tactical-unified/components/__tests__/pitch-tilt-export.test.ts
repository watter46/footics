import type Konva from 'konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPitchAndNormPos,
  screenToPitch,
} from '@/features/tactical-unified/components/canvas/canvas-coordinates';
import {
  applyPitchTransformToGroups,
  calculatePitchTransform,
} from '@/features/tactical-unified/components/canvas/canvas-pitch-transform-helper';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

describe('L3-Tactical-028: Pitch Tilt (2.5D) Transform & Coordinate Mapping', () => {
  const pitchRect = { x: 50, y: 30, width: 800, height: 500 };

  it('calculatePitchTransform: 0° tilt yields scaleY == zoom and deltaY == 0', () => {
    const transform = calculatePitchTransform(pitchRect, 100, -40, 1.5, 0);
    expect(transform.x).toBe(150); // 50 + 100
    expect(transform.y).toBe(-10); // 30 - 40
    expect(transform.scaleX).toBe(1.5);
    expect(transform.scaleY).toBe(1.5);
  });

  it('calculatePitchTransform: 25° tilt correctly calculates foreshortened scaleY and centered deltaY', () => {
    const zoom = 1.0;
    const transform = calculatePitchTransform(pitchRect, 0, 0, zoom, 25);
    const expectedCos = Math.cos((25 * Math.PI) / 180);
    const expectedDeltaY = (pitchRect.height * zoom * (1 - expectedCos)) / 2;

    expect(transform.x).toBe(pitchRect.x);
    expect(transform.scaleX).toBe(zoom);
    expect(transform.scaleY).toBeCloseTo(zoom * expectedCos, 5);
    expect(transform.y).toBeCloseTo(pitchRect.y + expectedDeltaY, 5);
  });

  it('calculatePitchTransform: 45° tilt correctly foreshortens scaleY and centers deltaY', () => {
    const zoom = 1.2;
    const transform = calculatePitchTransform(pitchRect, 20, 10, zoom, 45);
    const expectedCos = Math.cos((45 * Math.PI) / 180);
    const expectedDeltaY = (pitchRect.height * zoom * (1 - expectedCos)) / 2;

    expect(transform.x).toBe(pitchRect.x + 20);
    expect(transform.scaleX).toBe(zoom);
    expect(transform.scaleY).toBeCloseTo(zoom * expectedCos, 5);
    expect(transform.y).toBeCloseTo(pitchRect.y + 10 + expectedDeltaY, 5);
  });

  it('calculatePitchTransform: 60° tilt foreshortens scaleY to 50% and centers deltaY', () => {
    const zoom = 1.0;
    const transform = calculatePitchTransform(pitchRect, 0, 0, zoom, 60);
    expect(transform.scaleX).toBe(1.0);
    expect(transform.scaleY).toBeCloseTo(0.5, 5);
    // deltaY = (500 * 1.0 * (1 - 0.5)) / 2 = 125
    expect(transform.y).toBeCloseTo(pitchRect.y + 125, 5);
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

describe('L3-Tactical-028: Pitch Tilt Store Actions & Boundary Box Independence', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setIsExporting(false);
  });

  it('updatePitchTransform updates tilt and preserves existing panX, panY, zoom, isLocked', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.updatePitchTransform(slideId, {
      panX: 50,
      panY: -30,
      zoom: 1.5,
      isLocked: true,
    });

    // Update tilt to 45°
    store.updatePitchTransform(slideId, { tilt: 45 });

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);

    expect(slide?.pitchTransform?.tilt).toBe(45);
    expect(slide?.pitchTransform?.panX).toBe(50);
    expect(slide?.pitchTransform?.panY).toBe(-30);
    expect(slide?.pitchTransform?.zoom).toBe(1.5);
    expect(slide?.pitchTransform?.isLocked).toBe(true);
  });

  it('ピッチのチルト角度を変更しても境界線(boundaryBox)の配置・サイズは影響を受けない', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const initialBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
    };
    store.setBoundaryBox(slideId, initialBox);

    // Pitch tilted to 60°
    store.updatePitchTransform(slideId, { tilt: 60 });

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);

    // Boundary box is unchanged and in screen plane
    expect(slide?.boundaryBox).toEqual(initialBox);
    expect(slide?.pitchTransform?.tilt).toBe(60);
  });

  it('duplicateSlide でピッチの tilt 状態が正しく複製先に引き継がれる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.updatePitchTransform(slideId, {
      tilt: 45,
      zoom: 1.8,
      panX: 100,
      panY: 50,
    });

    store.duplicateSlide(slideId);

    const slides = useTacticalUnifiedStore.getState().project.slides;
    expect(slides.length).toBe(2);
    const duplicated = slides[1];
    expect(duplicated?.pitchTransform?.tilt).toBe(45);
    expect(duplicated?.pitchTransform?.zoom).toBe(1.8);
    expect(duplicated?.pitchTransform?.panX).toBe(100);
    expect(duplicated?.pitchTransform?.panY).toBe(50);
  });
});
