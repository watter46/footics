import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

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
