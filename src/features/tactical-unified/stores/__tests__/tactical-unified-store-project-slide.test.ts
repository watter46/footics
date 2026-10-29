/**
 * tactical-unified-store-project-slide.test.ts
 * Unit tests for TacticalUnifiedStore - Project & Slide operations
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { TacticalProject } from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  createDefaultProject,
} from '@/lib/types/tactical-unified';
import { selectActivePhaseSlides } from '../tactical-unified-selectors';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('tactical-unified-store - project & slide', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    useTacticalUnifiedStore.setState({
      selectedObjects: [],
      clipboard: null,
    });
  });

  it('初期状態でスライドが1枚存在し、4-4-2の両チーム22名が配置される', () => {
    const state = useTacticalUnifiedStore.getState();
    const slides = selectActivePhaseSlides(state);
    expect(slides).toHaveLength(1);
    expect(slides[0]?.players).toHaveLength(22);
  });

  it('addSlide でスライドが追加される', () => {
    const store = useTacticalUnifiedStore.getState();
    store.addSlide();
    expect(
      selectActivePhaseSlides(useTacticalUnifiedStore.getState()),
    ).toHaveLength(2);
  });

  it('deleteSlide で最後の1枚は削除できない', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.project.activeSlideId;
    store.deleteSlide(slideId);
    expect(
      selectActivePhaseSlides(useTacticalUnifiedStore.getState()),
    ).toHaveLength(1);
  });

  it('loadProject でプロジェクトがロードされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const newProject: TacticalProject = createDefaultProject('test-id');
    newProject.title = 'Test Project';
    store.loadProject(newProject);
    expect(useTacticalUnifiedStore.getState().project.title).toBe(
      'Test Project',
    );
    expect(useTacticalUnifiedStore.getState().isDirty).toBe(false);
  });

  it('isDirty が操作後に true になる', () => {
    const store = useTacticalUnifiedStore.getState();
    expect(store.isDirty).toBe(false);
    store.addSlide();
    expect(useTacticalUnifiedStore.getState().isDirty).toBe(true);
  });

  it('restoreDefaultPitch と setImageBackground で背景が正しく切り替わり、選手が白紙クリアされ、境界線が全面フィットする', () => {
    const store = useTacticalUnifiedStore.getState();
    const initialSlides = selectActivePhaseSlides(store);
    expect(
      initialSlides[0]?.players.filter((p) => p.area === 'pitch'),
    ).toHaveLength(22);

    store.setImageBackground('data:image/png;base64,sample');
    const imageState = useTacticalUnifiedStore.getState();
    const imageSlides = selectActivePhaseSlides(imageState);
    expect(imageState.project.backgroundType).toBe('image');
    expect(imageState.project.backgroundImageUrl).toBe(
      'data:image/png;base64,sample',
    );
    expect(
      imageSlides[0]?.players.filter((p) => p.area === 'pitch'),
    ).toHaveLength(0);
    expect(
      imageSlides[0]?.players.filter((p) => p.area === 'bench'),
    ).toHaveLength(22);
    expect(imageSlides[0]?.boundaryBox).toEqual({
      x: 2.0,
      y: 2.0,
      width: 96.0,
      height: 96.0,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    });

    store.restoreDefaultPitch();
    expect(useTacticalUnifiedStore.getState().project.backgroundType).toBe(
      'pitch',
    );
    expect(
      useTacticalUnifiedStore.getState().project.backgroundImageUrl,
    ).toBeUndefined();
  });

  it('すでに編集中または画像背景のスライドがある状態で setImageBackground すると、既存スライドを破壊せず新規スライドが追加される', () => {
    const store = useTacticalUnifiedStore.getState();
    // 1枚目キャプチャ適用
    store.setImageBackground('data:image/png;base64,capture1');
    expect(
      selectActivePhaseSlides(useTacticalUnifiedStore.getState()),
    ).toHaveLength(1);
    const firstSlideId = useTacticalUnifiedStore.getState().activeSlideId;

    // 1枚目のピッチ上にリングマーカーまたは選手を配置して編集
    store.addPlayerFromPalette('home', 40, 50, 'ring');

    // 2枚目のキャプチャを実行
    store.setImageBackground('data:image/png;base64,capture2');

    const state = useTacticalUnifiedStore.getState();
    const slides = selectActivePhaseSlides(state);
    // スライドが2枚に増加していること
    expect(slides).toHaveLength(2);
    // 1枚目のスライドは capture1 のまま保持され、リングマーカーも残っていること
    const firstSlide = slides.find((s) => s.id === firstSlideId);
    expect(firstSlide?.backgroundImageUrl).toBe(
      'data:image/png;base64,capture1',
    );
    expect(firstSlide?.players.some((p) => p.style.markerType === 'ring')).toBe(
      true,
    );

    // 新規アクティブスライドは capture2 で初期化されていること
    expect(state.activeSlideId).not.toBe(firstSlideId);
    const activeSlide = slides.find((s) => s.id === state.activeSlideId);
    expect(activeSlide?.backgroundImageUrl).toBe(
      'data:image/png;base64,capture2',
    );
  });

  it('continuousDrawing のトグルと設定が正しく動作する', () => {
    const store = useTacticalUnifiedStore.getState();
    expect(store.continuousDrawing).toBe(false);

    store.toggleContinuousDrawing();
    expect(useTacticalUnifiedStore.getState().continuousDrawing).toBe(true);

    store.setContinuousDrawing(false);
    expect(useTacticalUnifiedStore.getState().continuousDrawing).toBe(false);
  });

  it('resetSlideObjects でスライド内のアノテーションと選手オプションが一括リセットされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 30, 30, '#034694');
    store.addPlayer(player);

    store.addArrow(slideId, {
      id: 'arrow-reset-test',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 30, y: 30 },
        { x: 50, y: 30 },
      ],
      color: '#38bdf8',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    store.setPlayerFocus(slideId, player.id, {
      enabled: true,
      color: '#fbbf24',
      radius: 20,
      opacity: 0.35,
      style: 'spotlight',
    });

    store.resetSlideObjects(slideId);

    const slides = selectActivePhaseSlides(useTacticalUnifiedStore.getState());
    const slide = slides.find((s) => s.id === slideId);
    expect(slide?.arrows).toHaveLength(0);
    expect(slide?.zones).toHaveLength(0);
    expect(slide?.texts).toHaveLength(0);
    const resetPlayer = slide?.players.find((p) => p.id === player.id);
    expect(resetPlayer?.focus).toBeUndefined();
    expect(resetPlayer?.visionCone).toBeUndefined();
    expect(resetPlayer?.badges).toEqual([]);
    expect(resetPlayer?.connectLines).toEqual([]);
  });

  describe('saveStatus & auto-save state', () => {
    it('初期状態は saveStatus: idle, lastSavedAt: null', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.saveStatus).toBe('idle');
      expect(store.lastSavedAt).toBeNull();
    });

    it('setSaveStatus と setLastSavedAt で保存状態とタイムスタンプが更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setSaveStatus('saving');
      expect(useTacticalUnifiedStore.getState().saveStatus).toBe('saving');

      const now = Date.now();
      store.setLastSavedAt(now);
      expect(useTacticalUnifiedStore.getState().lastSavedAt).toBe(now);

      store.setSaveStatus('saved');
      expect(useTacticalUnifiedStore.getState().saveStatus).toBe('saved');
    });

    it('resetProject で初期プロジェクトが生成され選択状態がリセットされる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.addSlide();
      expect(
        selectActivePhaseSlides(useTacticalUnifiedStore.getState()),
      ).toHaveLength(2);

      store.resetProject();
      expect(
        selectActivePhaseSlides(useTacticalUnifiedStore.getState()),
      ).toHaveLength(1);
      expect(useTacticalUnifiedStore.getState().isDirty).toBe(false);
    });
  });

  it('resetSlideKeepSquad でメンバー構成を維持しつつ配置・ボール・境界線をリセットし、自由描画を白紙化する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    // 選手を移動
    const slides = selectActivePhaseSlides(store);
    const player0 = slides[0]?.players[0];
    expect(player0).toBeDefined();
    store.movePlayer(slideId, player0?.id ?? '', 88, 99);

    // ボールを移動
    store.setBallPosition(slideId, 10, 20);

    // 境界線を変更
    store.setBoundaryBox(slideId, {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      fitTarget: 'custom',
    });

    // 矢印を追加
    store.addArrow(slideId, {
      id: 'arrow-keep-test',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ffffff',
      strokeWidth: 2,
      dashArray: [],
      arrowHead: true,
    });

    // resetSlideKeepSquad 実行
    store.resetSlideKeepSquad(slideId);

    const updatedSlides = selectActivePhaseSlides(
      useTacticalUnifiedStore.getState(),
    );
    const slide = updatedSlides.find((sl) => sl.id === slideId);

    // 自由描画は消去
    expect(slide?.arrows).toEqual([]);
    expect(slide?.zones).toEqual([]);
    expect(slide?.texts).toEqual([]);

    // ボールは (50, 50)
    expect(slide?.ball.x).toBe(50);
    expect(slide?.ball.y).toBe(50);

    // 境界線は全画面 (100% x 100%)
    expect(slide?.boundaryBox?.x).toBe(0);
    expect(slide?.boundaryBox?.y).toBe(0);
    expect(slide?.boundaryBox?.width).toBe(100);
    expect(slide?.boundaryBox?.height).toBe(100);
    expect(slide?.boundaryBox?.visible).toBe(false);
    expect(slide?.boundaryBox?.fitTarget).toBe('pitch');

    // 選手0の座標は初期位置に戻る (x !== 88)
    const updatedPlayer0 = slide?.players.find((p) => p.id === player0?.id);
    expect(updatedPlayer0?.x).not.toBe(88);
    expect(updatedPlayer0?.y).not.toBe(99);
    expect(updatedPlayer0?.shirtNo).toBe(player0?.shirtNo);
  });

  it('初期配置と resetSlideKeepSquad 後の全選手座標が完全一致する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const initialSlides = selectActivePhaseSlides(store);
    const initialPositions =
      initialSlides[0]?.players.map((p) => ({
        id: p.id,
        shirtNo: p.shirtNo,
        team: p.team,
        x: p.x,
        y: p.y,
      })) ?? [];

    // 全選手を移動
    for (const p of initialPositions) {
      store.movePlayer(slideId, p.id, 10, 10);
    }

    // resetSlideKeepSquad 実行
    store.resetSlideKeepSquad(slideId);

    const resetSlides = selectActivePhaseSlides(
      useTacticalUnifiedStore.getState(),
    );
    const resetPositions =
      resetSlides[0]?.players.map((p) => ({
        id: p.id,
        shirtNo: p.shirtNo,
        team: p.team,
        x: p.x,
        y: p.y,
      })) ?? [];

    expect(resetPositions).toHaveLength(initialPositions.length);
    for (const initP of initialPositions) {
      const resetP = resetPositions.find((p) => p.id === initP.id);
      expect(resetP).toBeDefined();
      expect(resetP?.x).toBeCloseTo(initP.x, 3);
      expect(resetP?.y).toBeCloseTo(initP.y, 3);
    }
  });
});
