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

  describe('ClipboardHelpers - Option Clearing on Clone', () => {
    it('Playerおよびリングマーカー複製時にオプションが一括解除され基本スタイルが維持される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player = {
        id: 'p-opts-1',
        name: 'Player 1',
        shirtNo: '10',
        position: 'FW',
        team: 'home' as const,
        area: 'pitch' as const,
        x: 30,
        y: 40,
        style: {
          markerType: 'circle' as const,
          insideContent: 'number' as const,
          bottomLabel: 'name' as const,
          color: '#3b82f6',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.2,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
        visionCone: {
          id: 'vc-1',
          angleRad: 1.0,
          spreadRad: 0.5,
          radius: 15,
          color: '#3b82f6',
          opacity: 0.4,
          visible: true,
        },
        connectLines: [
          {
            id: 'cl-1',
            toPlayerId: 'target-id',
            lineStyle: 'solid' as const,
            color: '#ffffff',
            strokeWidth: 2,
            visible: true,
          },
        ],
        badges: [
          {
            id: 'b-1',
            label: 'Captain',
            color: '#f59e0b',
            textColor: '#000000',
            offsetX: 0,
            offsetY: -12,
            visible: true,
          },
        ],
        focus: {
          enabled: true,
          color: '#ffffff',
          radius: 3,
          opacity: 0.35,
          style: 'spotlight' as const,
        },
        trajectory: {
          type: 'straight' as const,
        },
      };

      const ringMarker = {
        id: 'p-ring-1',
        name: 'Ring Marker',
        shirtNo: '7',
        position: 'MF',
        team: 'away' as const,
        area: 'pitch' as const,
        x: 60,
        y: 70,
        style: {
          markerType: 'ring' as const,
          insideContent: 'none' as const,
          bottomLabel: 'none' as const,
          color: '#e11d48',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.5,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
        visionCone: {
          id: 'vc-ring',
          angleRad: 0.5,
          spreadRad: 0.5,
          radius: 10,
          color: '#e11d48',
          opacity: 0.3,
          visible: true,
        },
        connectLines: [
          {
            id: 'cl-ring',
            toPlayerId: 'p-opts-1',
            lineStyle: 'dashed' as const,
            color: '#e11d48',
            strokeWidth: 3,
            visible: true,
          },
        ],
        badges: [
          {
            id: 'b-ring',
            label: 'Press',
            color: '#ef4444',
            textColor: '#ffffff',
            offsetX: 0,
            offsetY: -10,
            visible: true,
          },
        ],
        focus: {
          enabled: true,
          color: '#e11d48',
          radius: 4,
          opacity: 0.5,
          style: 'ring' as const,
        },
        trajectory: {
          type: 'arc_left' as const,
        },
      };

      store.addPlayer(player);
      store.addPlayer(ringMarker);

      store.selectObject({ id: player.id, kind: 'player' }, false);
      store.selectObject({ id: ringMarker.id, kind: 'player' }, true);
      store.copySelectedObjects(slideId);
      store.pasteObjects(slideId);

      const stateAfter = useTacticalUnifiedStore.getState();
      const slide = stateAfter.project.slides.find((s) => s.id === slideId);
      const [sel1, sel2] = stateAfter.selectedObjects;

      const p1 = slide?.players.find((p) => p.id === sel1?.id);
      const p2 = slide?.players.find((p) => p.id === sel2?.id);

      // オプション解除
      expect(p1?.visionCone).toBeUndefined();
      expect(p1?.connectLines).toEqual([]);
      expect(p1?.badges).toEqual([]);
      expect(p1?.focus).toBeUndefined();
      expect(p1?.trajectory).toBeUndefined();

      expect(p2?.visionCone).toBeUndefined();
      expect(p2?.connectLines).toEqual([]);
      expect(p2?.badges).toEqual([]);
      expect(p2?.focus).toBeUndefined();
      expect(p2?.trajectory).toBeUndefined();

      // 基本スタイル・属性維持
      expect(p1?.team).toBe('home');
      expect(p1?.name).toBe('Player 1');
      expect(p1?.style.color).toBe('#3b82f6');
      expect(p1?.style.markerType).toBe('circle');

      expect(p2?.team).toBe('away');
      expect(p2?.name).toBe('Ring Marker');
      expect(p2?.style.color).toBe('#e11d48');
      expect(p2?.style.sizeScale).toBe(1.5);
      expect(p2?.style.markerType).toBe('ring');
    });
  });
});
