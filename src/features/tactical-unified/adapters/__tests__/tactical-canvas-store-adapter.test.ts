import { beforeEach, describe, expect, it } from 'vitest';
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
});
