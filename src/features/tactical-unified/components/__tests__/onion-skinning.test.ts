import { beforeEach, describe, expect, it } from 'vitest';
import {
  selectActiveSlide,
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';

describe('AAWU 3-3: Drag-only Onion Skinning & Canvas Preview', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  describe('selectPreviousSlide selector', () => {
    it('returns null when there is only one slide', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.project.slides.length).toBe(1);

      const prevSlide = selectPreviousSlide(store);
      expect(prevSlide).toBeNull();
    });

    it('returns null when the first slide of multiple slides is active', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;
      store.addSlide(slide1Id, 'object-free');

      // 1枚目をアクティブにする
      store.setActiveSlide(slide1Id);

      const state = useTacticalUnifiedStore.getState();
      expect(state.project.slides.length).toBe(2);
      expect(state.activeSlideId).toBe(slide1Id);

      const prevSlide = selectPreviousSlide(state);
      expect(prevSlide).toBeNull();
    });

    it('returns the previous slide when the second or later slide is active', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;
      const slide2Id = store.addSlide(slide1Id, 'object-free');
      const slide3Id = store.addSlide(slide2Id, 'object-free');

      // スライド2アクティブ時 -> スライド1が取得できる
      store.setActiveSlide(slide2Id);
      const state2 = useTacticalUnifiedStore.getState();
      expect(selectPreviousSlide(state2)?.id).toBe(slide1Id);

      // スライド3アクティブ時 -> スライド2が取得できる
      store.setActiveSlide(slide3Id);
      const state3 = useTacticalUnifiedStore.getState();
      expect(selectPreviousSlide(state3)?.id).toBe(slide2Id);
    });

    it('updates previous slide reference correctly when slides are reordered', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;
      const slide2Id = store.addSlide(slide1Id, 'object-free');
      const slide3Id = store.addSlide(slide2Id, 'object-free');

      // 順序を [slide3, slide1, slide2] に並べ替え
      store.reorderSlides([slide3Id, slide1Id, slide2Id]);

      // slide1 をアクティブにする -> 前スライドは slide3 になる
      store.setActiveSlide(slide1Id);
      const state = useTacticalUnifiedStore.getState();
      expect(selectPreviousSlide(state)?.id).toBe(slide3Id);

      // slide3 をアクティブにする -> 先頭なので null になる
      store.setActiveSlide(slide3Id);
      const stateFirst = useTacticalUnifiedStore.getState();
      expect(selectPreviousSlide(stateFirst)).toBeNull();
    });
  });

  describe('Player onion skinning data resolution', () => {
    it('accurately resolves previous player position for onion skin ghost rendering', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;
      const activeSlide1 = selectActiveSlide(store);
      expect(activeSlide1).toBeDefined();
      const testPlayer = activeSlide1?.players[0];
      expect(testPlayer).toBeDefined();
      if (!testPlayer) return;

      // スライド1で選手の初期位置を(25, 35)に設定
      store.movePlayer(slide1Id, testPlayer.id, 25, 35);

      // スライド2を追加 (選手座標を引き継ぐ)
      const slide2Id = store.addSlide(slide1Id, 'object-free');
      store.setActiveSlide(slide2Id);

      // スライド2で選手を(60, 80)に移動
      store.movePlayer(slide2Id, testPlayer.id, 60, 80);

      const stateSlide2 = useTacticalUnifiedStore.getState();
      const prevSlide = selectPreviousSlide(stateSlide2);
      expect(prevSlide).not.toBeNull();

      const prevPlayer = prevSlide?.players.find((p) => p.id === testPlayer.id);
      expect(prevPlayer).toBeDefined();
      // 前スライドでのゴースト座標
      expect(prevPlayer?.x).toBe(25);
      expect(prevPlayer?.y).toBe(35);

      // 現在のスライドでの座標
      const curSlide = selectActiveSlide(stateSlide2);
      expect(curSlide).toBeDefined();
      const curPlayer = curSlide?.players.find((p) => p.id === testPlayer.id);
      expect(curPlayer?.x).toBe(60);
      expect(curPlayer?.y).toBe(80);
    });

    it('does not resolve ghost when player was added only in current slide or was on bench', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;
      const slide2Id = store.addSlide(slide1Id, 'object-free');
      store.setActiveSlide(slide2Id);

      // スライド2のみに新しい選手を追加
      const newPlayerId = store.addCustomPlayer(
        slide2Id,
        'home',
        'New Striker',
        '9',
        'CF',
        'pitch',
      );

      const state = useTacticalUnifiedStore.getState();
      const prevSlide = selectPreviousSlide(state);
      const prevPlayer = prevSlide?.players.find((p) => p.id === newPlayerId);
      expect(prevPlayer).toBeUndefined();
    });
  });

  describe('Ball onion skinning data resolution', () => {
    it('accurately resolves previous ball position for ghost rendering', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;

      // スライド1でボールを(30, 40)に配置
      store.setBallPosition(slide1Id, 30, 40);

      // スライド2を追加
      const slide2Id = store.addSlide(slide1Id, 'object-free');
      store.setActiveSlide(slide2Id);

      // スライド2でボールを(75, 85)に移動
      store.setBallPosition(slide2Id, 75, 85);

      const stateSlide2 = useTacticalUnifiedStore.getState();
      const prevSlide = selectPreviousSlide(stateSlide2);
      expect(prevSlide?.ball.x).toBe(30);
      expect(prevSlide?.ball.y).toBe(40);

      const curSlide = selectActiveSlide(stateSlide2);
      expect(curSlide?.ball.x).toBe(75);
      expect(curSlide?.ball.y).toBe(85);
    });
  });
});
