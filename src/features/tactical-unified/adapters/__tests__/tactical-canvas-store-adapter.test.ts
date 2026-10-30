import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '../../stores/tactical-unified-store';
import { createTacticalCanvasStoreAdapter } from '../tactical-canvas-store-adapter';

describe('TacticalCanvasStoreAdapter', () => {
  beforeEach(() => {
    // ストアを初期リセット
    const state = useTacticalUnifiedStore.getState();
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    if (activeSlide) {
      state.updateSlide(state.activeSlideId, {
        arrows: [],
        zones: [],
        texts: [],
      });
    }
  });

  it('マスターストアのアクティブスライドの players を markers として提供すること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const canvasState = adapter.getState();

    const unifiedState = useTacticalUnifiedStore.getState();
    const activeSlide = unifiedState.project.slides.find(
      (s) => s.id === unifiedState.activeSlideId,
    );

    expect(activeSlide).toBeDefined();
    expect(canvasState.annotations.markers).toHaveLength(
      activeSlide?.players.length ?? 0,
    );
    expect(canvasState.annotations.markers.length).toBeGreaterThan(0);
  });

  it('addArrow を実行するとマスターストアのアクティブスライドに反映されること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const dummyArrow = {
      id: 'test-arrow-1',
      annotationType: 'arrow' as const,
      arrowType: 'pass' as const,
      curveType: 'straight' as const,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ffffff',
      strokeWidth: 2,
      dashArray: [],
      arrowHead: true,
    };

    adapter.getState().addArrow(dummyArrow);

    const unifiedState = useTacticalUnifiedStore.getState();
    const activeSlide = unifiedState.project.slides.find(
      (s) => s.id === unifiedState.activeSlideId,
    );
    expect(activeSlide?.arrows.some((a) => a.id === 'test-arrow-1')).toBe(true);

    // アダプター側でも最新が反映されていること
    expect(
      adapter
        .getState()
        .annotations.arrows.some((a) => a.id === 'test-arrow-1'),
    ).toBe(true);
  });

  it('updateMarker を実行するとマスターストアの選手マーカーが更新されること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const firstMarker = adapter.getState().annotations.markers[0];
    expect(firstMarker).toBeDefined();

    adapter.getState().updateMarker(firstMarker.id, { x: 42, y: 84 });

    const unifiedState = useTacticalUnifiedStore.getState();
    const activeSlide = unifiedState.project.slides.find(
      (s) => s.id === unifiedState.activeSlideId,
    );
    const updated = activeSlide?.players.find((p) => p.id === firstMarker.id);
    expect(updated?.x).toBe(42);
    expect(updated?.y).toBe(84);
  });

  it('undo / redo がマスターストアの履歴スタックと連動すること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const initialCount = adapter.getState().annotations.arrows.length;

    adapter.getState().addArrow({
      id: 'undo-arrow',
      annotationType: 'arrow',
      arrowType: 'dribble',
      curveType: 'straight',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      color: '#fff',
      strokeWidth: 2,
      dashArray: [],
      arrowHead: true,
    });

    expect(adapter.getState().annotations.arrows.length).toBe(initialCount + 1);
    expect(adapter.getState().canUndo()).toBe(true);

    adapter.getState().undo();
    expect(adapter.getState().annotations.arrows.length).toBe(initialCount);

    adapter.getState().redo();
    expect(adapter.getState().annotations.arrows.length).toBe(initialCount + 1);
  });

  it('無関係な状態更新時に selectedIds, annotations, capabilities, history, アクション関数の参照が維持されること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const initial = adapter.getState();

    // activeTool のみ変更
    useTacticalUnifiedStore.getState().setActiveTool('arrow_solid');

    const updated = adapter.getState();
    expect(updated.activeTool).toBe('arrow_solid');
    expect(updated.selectedIds).toBe(initial.selectedIds);
    expect(updated.annotations).toBe(initial.annotations);
    expect(updated.capabilities).toBe(initial.capabilities);
    expect(updated.history).toBe(initial.history);
    expect(updated.setActiveTool).toBe(initial.setActiveTool);
    expect(updated.addArrow).toBe(initial.addArrow);
  });

  it('同じ isDragging 値での setState はリスナー通知をスキップすること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const listener = vi.fn();
    adapter.subscribe(listener);

    // 初期状態は isDragging = false
    expect(adapter.getState().isDragging).toBe(false);

    // 同じ false を設定
    adapter.setState({ isDragging: false });
    expect(listener).not.toHaveBeenCalled();

    // 異なる true を設定
    adapter.setState({ isDragging: true });
    expect(listener).toHaveBeenCalledTimes(1);

    // 再度 true を設定
    adapter.setState({ isDragging: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('copySelectedObjects がマスターストアの copySelectedObjects に委譲され、アダプターの clipboard がマスターストアの射影となること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const store = useTacticalUnifiedStore.getState();

    const firstMarker = adapter.getState().annotations.markers[0];
    expect(firstMarker).toBeDefined();
    store.selectObject({ kind: 'player', id: firstMarker.id });

    adapter.getState().copySelectedObjects();

    // マスターストアの clipboard に保存されていること
    expect(useTacticalUnifiedStore.getState().clipboard).not.toBeNull();
    expect(
      useTacticalUnifiedStore
        .getState()
        .clipboard?.players.some((p) => p.id === firstMarker.id),
    ).toBe(true);

    // アダプターの getState().clipboard がマスターストアの射影になっていること
    const adapterClipboard = adapter.getState().clipboard;
    expect(adapterClipboard).not.toBeNull();
    expect(adapterClipboard?.markers.some((m) => m.id === firstMarker.id)).toBe(
      true,
    );
  });

  it('pasteObjects がマスターストアの pasteObjects に委譲されること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const store = useTacticalUnifiedStore.getState();

    const firstMarker = adapter.getState().annotations.markers[0];
    expect(firstMarker).toBeDefined();
    store.selectObject({ kind: 'player', id: firstMarker.id });
    adapter.getState().copySelectedObjects();

    const beforeCount = adapter.getState().annotations.markers.length;

    adapter.getState().pasteObjects();

    expect(adapter.getState().annotations.markers.length).toBe(beforeCount + 1);
  });

  it('duplicateSelectedObjects がマスターストアの duplicateSelectedObjects に委譲されること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const store = useTacticalUnifiedStore.getState();

    const firstMarker = adapter.getState().annotations.markers[0];
    expect(firstMarker).toBeDefined();
    store.selectObject({ kind: 'player', id: firstMarker.id });

    const beforeCount = adapter.getState().annotations.markers.length;

    adapter.getState().duplicateSelectedObjects();

    expect(adapter.getState().annotations.markers.length).toBe(beforeCount + 1);
    expect(
      useTacticalUnifiedStore
        .getState()
        .clipboard?.players.some((p) => p.id === firstMarker.id),
    ).toBe(true);
  });

  it('setColor, setStrokeWidth, setIsDragging, setDrawingPreview, setMarkerMode などがマスターストアと双方向同期すること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);

    // アダプターからの呼び出しがマスターストアに反映されること
    adapter.getState().setColor('#ff0000');
    expect(useTacticalUnifiedStore.getState().color).toBe('#ff0000');
    expect(adapter.getState().color).toBe('#ff0000');

    adapter.getState().setStrokeWidth(5);
    expect(useTacticalUnifiedStore.getState().strokeWidth).toBe(5);
    expect(adapter.getState().strokeWidth).toBe(5);

    adapter.getState().setMarkerMode('3d-only');
    expect(useTacticalUnifiedStore.getState().markerMode).toBe('3d-only');
    expect(adapter.getState().markerMode).toBe('3d-only');

    const preview = {
      isDrawing: true,
      tool: 'arrow_solid' as const,
      startX: 0,
      startY: 0,
      currentX: 10,
      currentY: 10,
      points: [0, 0, 10, 10],
    };
    adapter.getState().setDrawingPreview(preview);
    expect(useTacticalUnifiedStore.getState().drawingPreview).toEqual(preview);
    expect(adapter.getState().drawingPreview).toEqual(preview);

    // マスターストアからの変更がアダプターに反映されること
    useTacticalUnifiedStore.getState().setColor('#00ff00');
    expect(adapter.getState().color).toBe('#00ff00');
  });

  it('adapter.setState で UI 状態がマスターストアに反映され、同値更新時はリスナー通知をスキップすること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const listener = vi.fn();
    adapter.subscribe(listener);

    adapter.setState({ color: '#abcdef' });
    expect(useTacticalUnifiedStore.getState().color).toBe('#abcdef');
    expect(adapter.getState().color).toBe('#abcdef');
    expect(listener).toHaveBeenCalledTimes(1);

    // 同値更新
    adapter.setState({ color: '#abcdef' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('selectObject を呼んだときに isHudOpen が true になること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    useTacticalUnifiedStore.getState().setIsHudOpen(false);
    expect(useTacticalUnifiedStore.getState().isHudOpen).toBe(false);

    adapter.getState().selectObject({ kind: 'player', id: 'player-1' });
    expect(useTacticalUnifiedStore.getState().isHudOpen).toBe(true);
    expect(adapter.getState().isHudOpen).toBe(true);
  });

  it('setPitchTransform, resetPitchTransform, setPitchLocked が 2D 作業用 viewport のみを更新し、マスターストアの 3D カメラ用 pitchTransform を保護すること', () => {
    const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
    const initialSlideTransform = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      )?.pitchTransform;

    // 初期状態の pitchTransform は editorViewport (tilt: 0)
    expect(adapter.getState().pitchTransform).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      isLocked: false,
    });

    // setPitchTransform 実行
    adapter
      .getState()
      .setPitchTransform({ zoom: 2, panX: 50, panY: 30, tilt: 45 });

    // アダプター側は tilt: 0 で更新される
    expect(adapter.getState().pitchTransform).toEqual({
      panX: 50,
      panY: 30,
      zoom: 2,
      tilt: 0,
      isLocked: false,
    });

    // マスターストアのスライド側 pitchTransform は変更されていないこと (3D演出用カメラの保護)
    const currentSlideTransform = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      )?.pitchTransform;
    expect(currentSlideTransform).toEqual(initialSlideTransform);

    // setPitchLocked
    adapter.getState().setPitchLocked(true);
    expect(adapter.getState().pitchTransform.isLocked).toBe(true);

    // resetPitchTransform
    adapter.getState().resetPitchTransform();
    expect(adapter.getState().pitchTransform).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      isLocked: true, // locked 状態は維持
    });
  });
});
