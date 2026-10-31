import { beforeEach, describe, expect, it } from 'vitest';
import { SlideSchema } from '@/lib/types/tactical/slide';
import { createSlideForMode } from '../slide-helpers';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('slide-transition-slice', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('updateSlideTransition updates transition parameters for a specific slide', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.project.slides[0].id;

    store.updateSlideTransition(slideId, {
      transitionDurationMs: 2000,
      pauseMs: 1000,
      easing: 'ease-in',
    });

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(updatedSlide?.transitionDurationMs).toBe(2000);
    expect(updatedSlide?.pauseMs).toBe(1000);
    expect(updatedSlide?.easing).toBe('ease-in');
  });

  it('updateAllSlideTransitions updates transition parameters for all slides in single history step', () => {
    const store = useTacticalUnifiedStore.getState();
    // スライドを2枚追加して合計3枚にする
    store.addSlide();
    store.addSlide();

    const initialSlides = useTacticalUnifiedStore.getState().project.slides;
    expect(initialSlides).toHaveLength(3);

    // 一括更新
    useTacticalUnifiedStore.getState().updateAllSlideTransitions({
      transitionDurationMs: 3000,
      pauseMs: 1500,
      easing: 'linear',
    });

    const updatedSlides = useTacticalUnifiedStore.getState().project.slides;
    for (const slide of updatedSlides) {
      expect(slide.transitionDurationMs).toBe(3000);
      expect(slide.pauseMs).toBe(1500);
      expect(slide.easing).toBe('linear');
    }

    // 1回の undo で全スライドが元に戻ること
    useTacticalUnifiedStore.getState().undo();
    const restoredSlides = useTacticalUnifiedStore.getState().project.slides;
    for (let i = 0; i < 3; i++) {
      expect(restoredSlides[i].transitionDurationMs).toBe(
        initialSlides[i].transitionDurationMs,
      );
      expect(restoredSlides[i].pauseMs).toBe(initialSlides[i].pauseMs);
      expect(restoredSlides[i].easing).toBe(initialSlides[i].easing);
    }
  });

  it('updateSlideTransition updates camera transition parameters for a specific slide', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.project.slides[0].id;

    store.updateSlideTransition(slideId, {
      cameraTransitionMode: 'slow',
      cameraDurationMs: 8000,
    });

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(updatedSlide?.cameraTransitionMode).toBe('slow');
    expect(updatedSlide?.cameraDurationMs).toBe(8000);

    useTacticalUnifiedStore.getState().undo();
    const restoredSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(restoredSlide?.cameraTransitionMode).toBeUndefined();
    expect(restoredSlide?.cameraDurationMs).toBeUndefined();
  });

  it('updateAllSlideTransitions updates camera transition parameters for all slides and can be undone', () => {
    const store = useTacticalUnifiedStore.getState();
    store.addSlide();

    useTacticalUnifiedStore.getState().updateAllSlideTransitions({
      cameraTransitionMode: 'continuous',
      cameraDurationMs: 15000,
    });

    const updatedSlides = useTacticalUnifiedStore.getState().project.slides;
    for (const slide of updatedSlides) {
      expect(slide.cameraTransitionMode).toBe('continuous');
      expect(slide.cameraDurationMs).toBe(15000);
    }

    useTacticalUnifiedStore.getState().undo();
    const restoredSlides = useTacticalUnifiedStore.getState().project.slides;
    for (const slide of restoredSlides) {
      expect(slide.cameraTransitionMode).not.toBe('continuous');
    }
  });

  it('validates cameraTransitionMode and cameraDurationMs via SlideSchema', () => {
    const baseSlide = {
      id: 'slide-1',
      index: 0,
      players: [],
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: true },
    };

    const parsedDefault = SlideSchema.parse(baseSlide);
    expect(parsedDefault.cameraTransitionMode).toBe('sync');
    expect(parsedDefault.cameraDurationMs).toBe(10000);

    const parsedCustom = SlideSchema.parse({
      ...baseSlide,
      cameraTransitionMode: 'slow',
      cameraDurationMs: 5000,
    });
    expect(parsedCustom.cameraTransitionMode).toBe('slow');
    expect(parsedCustom.cameraDurationMs).toBe(5000);

    expect(() =>
      SlideSchema.parse({ ...baseSlide, cameraDurationMs: 499 }),
    ).toThrow();
    expect(() =>
      SlideSchema.parse({ ...baseSlide, cameraDurationMs: 30001 }),
    ).toThrow();
    expect(() =>
      SlideSchema.parse({ ...baseSlide, cameraTransitionMode: 'invalid' }),
    ).toThrow();
  });

  it('createSlideForMode preserves camera transition parameters for object-free mode', () => {
    const store = useTacticalUnifiedStore.getState();
    const currentSlide = {
      ...store.project.slides[0],
      cameraTransitionMode: 'slow' as const,
      cameraDurationMs: 12000,
    };
    const newSlide = createSlideForMode(
      currentSlide,
      store.project,
      'object-free',
    );
    expect(newSlide.cameraTransitionMode).toBe('slow');
    expect(newSlide.cameraDurationMs).toBe(12000);
  });
});
