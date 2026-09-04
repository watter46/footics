import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateSlideTransitionProgress,
  easeInOutQuad,
  easeInQuad,
  easeOutQuad,
} from '../slide-transition-slice';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('slide-slices modular unit tests', () => {
  beforeEach(() => {
    // ストアのリセット
    const state = useTacticalUnifiedStore.getState();
    const initialSlideId = state.project.slides[0]?.id ?? '';
    state.setActiveSlide(initialSlideId);
    state.stopPlayback();
    state.setPlaybackSpeed(1.0);
    state.setLooping(false);
  });

  describe('SlidePlaybackSlice', () => {
    it('再生・一時停止・トグル・速度・ループ制御が正常に動作する', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.isPlaying).toBe(false);

      store.setIsPlaying(true);
      expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

      store.togglePlayback();
      expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

      store.togglePlayback();
      expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

      store.stopPlayback();
      expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

      store.setPlaybackSpeed(1.5);
      expect(useTacticalUnifiedStore.getState().playbackSpeed).toBe(1.5);

      store.setLooping(true);
      expect(useTacticalUnifiedStore.getState().isLooping).toBe(true);
    });
  });

  describe('SlideTransitionSlice', () => {
    it('イージング計算と進捗計算が正しく算出される', () => {
      expect(easeInQuad(0)).toBe(0);
      expect(easeInQuad(0.5)).toBe(0.25);
      expect(easeInQuad(1)).toBe(1);

      expect(easeOutQuad(0)).toBe(0);
      expect(easeOutQuad(0.5)).toBe(0.75);
      expect(easeOutQuad(1)).toBe(1);

      expect(easeInOutQuad(0)).toBe(0);
      expect(easeInOutQuad(0.5)).toBe(0.5);
      expect(easeInOutQuad(1)).toBe(1);

      // 進捗計算
      expect(calculateSlideTransitionProgress(0, 1000, 'linear')).toBe(0);
      expect(calculateSlideTransitionProgress(500, 1000, 'linear')).toBe(0.5);
      expect(calculateSlideTransitionProgress(1000, 1000, 'linear')).toBe(1);
      expect(calculateSlideTransitionProgress(1500, 1000, 'linear')).toBe(1);
    });

    it('updateSlideTransition でスライド遷移時間が更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.updateSlideTransition(slideId, {
        transitionDurationMs: 2500,
        pauseMs: 800,
        easing: 'ease-out',
      });

      const updated = useTacticalUnifiedStore
        .getState()
        .project.slides.find((sl) => sl.id === slideId);
      expect(updated?.transitionDurationMs).toBe(2500);
      expect(updated?.pauseMs).toBe(800);
      expect(updated?.easing).toBe('ease-out');
    });
  });

  describe('SlideCrudSlice', () => {
    it('addSlide, duplicateSlide, deleteSlide, reorderSlides が正常に動作する', () => {
      const store = useTacticalUnifiedStore.getState();
      const initialCount = store.project.slides.length;

      // 新規スライド追加 (object-free)
      const newSlideId = store.addSlide(undefined, 'object-free');
      expect(useTacticalUnifiedStore.getState().project.slides.length).toBe(
        initialCount + 1,
      );
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(newSlideId);

      // スライド複製 (full copy)
      const duplicatedId = store.duplicateSlide(newSlideId);
      expect(useTacticalUnifiedStore.getState().project.slides.length).toBe(
        initialCount + 2,
      );
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(
        duplicatedId,
      );

      // スライド削除
      store.deleteSlide(duplicatedId);
      expect(useTacticalUnifiedStore.getState().project.slides.length).toBe(
        initialCount + 1,
      );
    });
  });
});
