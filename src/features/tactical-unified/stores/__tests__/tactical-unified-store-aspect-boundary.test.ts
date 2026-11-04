/**
 * tactical-unified-store-aspect-boundary.test.ts
 * Unit tests for TacticalUnifiedStore - Aspect Ratio & Boundary operations
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AspectRatio,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  createDefaultProject,
} from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('tactical-unified-store - aspect ratio & boundary', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    useTacticalUnifiedStore.setState({
      selectedObjects: [],
      clipboard: null,
    });
  });

  it('setAspectRatio で座標が変換される (16:9 → 9:16)', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setAspectRatio('16:9');
    const player = createDefaultPlayer('home', 80, 30, '#034694');
    store.addPlayer(player);
    store.setAspectRatio('9:16');

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const p = slide?.players.find((item) => item.id === player.id);
    // 16:9→9:16: x_v = y_h = 30, y_v = 100 - x_h = 100 - 80 = 20
    expect(p?.x).toBeCloseTo(30);
    expect(p?.y).toBeCloseTo(20);
  });

  it('初期スライドおよび addSlide 時にピッチ白線フィット境界線がデフォルトで設定される', () => {
    const store = useTacticalUnifiedStore.getState();
    const initialSlide = store.project.slides[0];
    expect(initialSlide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });

    const newSlideId = store.addSlide(undefined, 'blank');
    const newSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === newSlideId);
    expect(newSlide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });
  });

  it('autoFitBoundaryBox でピッチの白線の外側に均等な余白を持たせてフィットする (横向き・縦向き)', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    store.setBoundaryBox(slideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });

    store.autoFitBoundaryBox(slideId);
    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    });

    // 横向き (16:9)
    store.setAspectRatio('16:9');
    store.setBoundaryBox(slideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });
    store.autoFitBoundaryBox(slideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    });

    // 縦向き (9:16)
    store.setAspectRatio('9:16');
    store.setBoundaryBox(slideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });
    store.autoFitBoundaryBox(slideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    });

    // スクリーンショット / 画像背景モードのときは画像境界（2%余白内）にフィットする
    store.setImageBackground('data:image/png;base64,sample');
    const imageSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === imageSlideId);
    expect(slide?.boundaryBox).toEqual({
      x: 2.0,
      y: 2.0,
      width: 96.0,
      height: 96.0,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });

    // 境界線を変更した後に autoFitBoundaryBox を実行しても画像境界にフィットする
    store.setBoundaryBox(imageSlideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });
    store.autoFitBoundaryBox(imageSlideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === imageSlideId);
    expect(slide?.boundaryBox).toEqual({
      x: 2.0,
      y: 2.0,
      width: 96.0,
      height: 96.0,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    });
  });

  describe('applyXMediaPreset', () => {
    it('横画面(16:9)で single_image_4_5 (4:5) を適用した際に中央配置された BoundaryBox が計算される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.applyXMediaPreset('single_image_4_5');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toBeDefined();
      expect(slide?.boundaryBox?.enabled).toBe(true);
      // 16:9キャンバスで4:5(0.8)はキャンバスより縦長なので高さ100%
      expect(slide?.boundaryBox?.height).toBe(100);
      expect(slide?.boundaryBox?.y).toBe(0);
      // width = 100 * 0.8 / (16/9) = 45
      expect(slide?.boundaryBox?.width).toBe(45);
      expect(slide?.boundaryBox?.x).toBe(27.5);
    });

    it('横画面(16:9)で pitch_overview_16_9 (16:9) を適用した際に全画面(100x100)の BoundaryBox になる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.applyXMediaPreset('pitch_overview_16_9');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
        visible: false,
        fitTarget: 'canvas',
      });
    });

    it('縦画面(9:16)で feed_video_9_16 (9:16) を適用した際に全画面(100x100)の BoundaryBox になる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('9:16');
      store.applyXMediaPreset('feed_video_9_16');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
        visible: false,
        fitTarget: 'canvas',
      });
    });

    it('pitch_fit を適用した際にピッチ外枠線に合わせた BoundaryBox が設定される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.applyXMediaPreset('pitch_fit');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
        visible: false,
        fitTarget: 'pitch',
      });
    });

    it('特定のスライドIDを指定してプリセットを適用できる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.addSlide();
      const slides = useTacticalUnifiedStore.getState().project.slides;
      const targetSlide = slides[1];

      store.applyXMediaPreset('single_image_4_5', targetSlide.id);

      const updatedSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === targetSlide.id);
      expect(updatedSlide?.boundaryBox?.width).toBe(45);
      expect(updatedSlide?.boundaryBox?.height).toBe(100);
    });
  });

  describe('L2-Tactical-021: アスペクト比即時変更と可変境界線ハイブリッド連動', () => {
    it('4種のアスペクト比変更 (16:9, 9:16, 4:5, 1:1) で project.aspectRatio が正しく更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      const ratios: AspectRatio[] = ['9:16', '4:5', '1:1', '16:9'];

      for (const ratio of ratios) {
        store.setAspectRatio(ratio);
        const state = useTacticalUnifiedStore.getState();
        expect(state.project.aspectRatio).toBe(ratio);
        const activeSlide = state.project.slides.find(
          (s) => s.id === state.activeSlideId,
        );
        expect(activeSlide?.aspectRatio).toBe(ratio);
      }
    });

    it('アスペクト比切り替え時に境界線が即座に全体フィット(100x100)にリセット初期化される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.setAspectRatio('4:5');

      // 事前に境界線をカスタム値に変更
      store.setBoundaryBox(slideId, {
        x: 15,
        y: 15,
        width: 60,
        height: 60,
        enabled: true,
      });

      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 15,
        y: 15,
        width: 60,
        height: 60,
        enabled: true,
      });

      // 16:9 にアスペクト比変更 (4:5 → 16:9)
      store.setAspectRatio('16:9');

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
        visible: false,
        fitTarget: 'canvas',
      });
      expect(useTacticalUnifiedStore.getState().project.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
        visible: false,
        fitTarget: 'canvas',
      });
    });

    it('アスペクト比切り替え後も、四方ポインタによる境界線の可変リサイズ・移動が通常通り動作する', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      // 1:1 に切り替え
      store.setAspectRatio('1:1');
      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
        visible: false,
        fitTarget: 'canvas',
      });

      // ユーザーによる四方ハンドルの個別リサイズ操作
      store.setBoundaryBox(slideId, {
        x: 5,
        y: 10,
        width: 80,
        height: 75,
        enabled: true,
      });

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 5,
        y: 10,
        width: 80,
        height: 75,
        enabled: true,
      });
    });

    it('addSlide 時に現在の project.aspectRatio の比率と境界線が継承される', () => {
      const store = useTacticalUnifiedStore.getState();
      // 16:9に変更して全体フィット(100x100)になる状態を作る
      store.setAspectRatio('16:9');

      const newSlideId = store.addSlide(undefined, 'blank');
      const newSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === newSlideId);

      expect(newSlide?.aspectRatio).toBe('16:9');
      expect(newSlide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
        visible: false,
        fitTarget: 'canvas',
      });
    });

    it('updateBoundaryBox は履歴を積まずに境界線を更新し、setBoundaryBox は履歴を積む', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.project.slides[0].id;
      const initialPastLength = useTacticalUnifiedStore.getState().past.length;

      // ドラッグ中の更新 (updateBoundaryBox)
      store.updateBoundaryBox(slideId, {
        x: 15,
        y: 20,
        width: 70,
        height: 60,
        enabled: true,
      });

      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox?.x).toBe(15);
      expect(useTacticalUnifiedStore.getState().past.length).toBe(
        initialPastLength,
      );

      // ドラッグ終了時・確定の更新 (setBoundaryBox)
      store.setBoundaryBox(slideId, {
        x: 20,
        y: 25,
        width: 60,
        height: 50,
        enabled: true,
      });

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox?.x).toBe(20);
      expect(useTacticalUnifiedStore.getState().past.length).toBe(
        initialPastLength + 1,
      );

      // Undo するとドラッグ確定直前(updateBoundaryBox時の状態 = 15)に戻り、履歴が小刻みにならず1回のUndoで戻る
      store.undo();
      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox?.x).toBe(15);
      expect(useTacticalUnifiedStore.getState().past.length).toBe(
        initialPastLength,
      );
    });
  });

  it('togglePitchLock でピッチの isLocked がトグルされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    expect(store.project.slides[0]?.pitchTransform?.isLocked ?? false).toBe(
      false,
    );

    store.togglePitchLock(slideId);
    expect(
      useTacticalUnifiedStore.getState().project.slides[0]?.pitchTransform
        ?.isLocked,
    ).toBe(true);

    store.togglePitchLock(slideId);
    expect(
      useTacticalUnifiedStore.getState().project.slides[0]?.pitchTransform
        ?.isLocked,
    ).toBe(false);
  });

  it('updatePitchTransform でピッチの panX, panY, zoom が更新される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.updatePitchTransform(slideId, {
      panX: 25,
      panY: -40,
      zoom: 1.5,
    });
    const transform =
      useTacticalUnifiedStore.getState().project.slides[0]?.pitchTransform;
    expect(transform?.panX).toBe(25);
    expect(transform?.panY).toBe(-40);
    expect(transform?.zoom).toBe(1.5);
    expect(transform?.isLocked).toBe(false);
  });

  it('addSlide / duplicateSlide で pitchTransform が引き継がれる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.updatePitchTransform(slideId, { panX: 50, panY: 30, zoom: 2 });
    const newSlideId = store.duplicateSlide(slideId);
    const newSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === newSlideId);
    expect(newSlide?.pitchTransform?.panX).toBe(50);
    expect(newSlide?.pitchTransform?.panY).toBe(30);
    expect(newSlide?.pitchTransform?.zoom).toBe(2);
  });

  it('setPitchPosition で pitchPosition と pitchTransform が更新され、autoFitBoundaryBox に反映される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.setAspectRatio('4:5');

    // 4:5 (1080x1350) において panX=108 (10%), panY=-135 (-10%)
    store.setPitchPosition(slideId, { x: 108, y: -135 });
    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);
    expect(slide?.pitchPosition?.x).toBe(108);
    expect(slide?.pitchPosition?.y).toBe(-135);
    expect(slide?.pitchTransform?.panX).toBe(108);
    expect(slide?.pitchTransform?.panY).toBe(-135);

    // autoFitBoundaryBox がピッチ移動オフセットに正規化%で追従することを確認
    store.autoFitBoundaryBox(slideId);
    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);
    expect(updatedSlide?.boundaryBox?.x).toBeCloseTo(10, 2);
    expect(updatedSlide?.boundaryBox?.y).toBeCloseTo(-10, 2);
  });

  it('updatePitchTransform でズーム・パン移動後に autoFitBoundaryBox を実行するとズーム後のピッチ外枠にフィットする', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.setAspectRatio('16:9'); // 1920x1080
    store.updatePitchTransform(slideId, { panX: 192, panY: 108, zoom: 1.5 });
    store.autoFitBoundaryBox(slideId);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);
    expect(slide?.boundaryBox?.x).toBeCloseTo(10, 2);
    expect(slide?.boundaryBox?.y).toBeCloseTo(10, 2);
    expect(slide?.boundaryBox?.width).toBeCloseTo(150, 2);
    expect(slide?.boundaryBox?.height).toBeCloseTo(150, 2);
    expect(slide?.boundaryBox?.fitTarget).toBe('pitch');
  });

  it('autoFitBoundaryBox に pitchRect (可変Stageサイズ) を渡した場合に正確なピッチ外枠にフィットする', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.setAspectRatio('16:9');
    store.updatePitchTransform(slideId, { panX: 120, panY: 67.5, zoom: 1.2 });
    store.autoFitBoundaryBox(slideId, { width: 1200, height: 675 });

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);
    expect(slide?.boundaryBox?.x).toBeCloseTo(10, 2);
    expect(slide?.boundaryBox?.y).toBeCloseTo(10, 2);
    expect(slide?.boundaryBox?.width).toBeCloseTo(120, 2);
    expect(slide?.boundaryBox?.height).toBeCloseTo(120, 2);
    expect(slide?.boundaryBox?.fitTarget).toBe('pitch');
  });

  it('centerPitchAndBoundary でピッチ・境界線が中央・初期倍率に戻り、選手座標は維持される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.updatePitchTransform(slideId, { panX: 100, panY: 50, zoom: 2 });
    store.setBoundaryBox(slideId, {
      x: 20,
      y: 20,
      width: 60,
      height: 60,
      enabled: true,
      fitTarget: 'custom',
    });
    store.movePlayer(
      slideId,
      store.project.slides[0]?.players[0]?.id ?? '',
      77,
      88,
    );

    store.centerPitchAndBoundary(slideId);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);
    expect(slide?.pitchTransform?.panX).toBe(0);
    expect(slide?.pitchTransform?.panY).toBe(0);
    expect(slide?.pitchTransform?.zoom).toBe(1);
    expect(slide?.pitchPosition).toBeUndefined();
    expect(slide?.players[0]?.x).toBe(77);
    expect(slide?.players[0]?.y).toBe(88);
  });

  it('アスペクト比切替を繰り返しても選手座標が中央へ収束せず元の値と一致する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    store.setAspectRatio('16:9');

    const initialPlayers =
      store.project.slides[0]?.players.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
      })) ?? [];

    const ratios: AspectRatio[] = ['4:5', '16:9', '9:16', '1:1', '16:9'];
    for (let i = 0; i < 10; i++) {
      for (const ratio of ratios) {
        store.setAspectRatio(ratio);
      }
    }

    const finalPlayers = store.project.slides[0]?.players ?? [];
    for (const initP of initialPlayers) {
      const currentP = finalPlayers.find((p) => p.id === initP.id);
      expect(currentP).toBeDefined();
      expect(currentP?.x).toBeCloseTo(initP.x, 1);
      expect(currentP?.y).toBeCloseTo(initP.y, 1);
    }
  });
});
