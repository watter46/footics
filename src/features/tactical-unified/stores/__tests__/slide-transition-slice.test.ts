import { beforeEach, describe, expect, it } from 'vitest';
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
});
