import { describe, expect, it } from 'vitest';
import { createCanvasStore } from '../store/canvas-store';
import type { CanvasConfig } from '../types';

describe('canvas-store', () => {
  it('initializes store immediately with config (Zero-Flicker) without players or pitch', () => {
    const initialAnnotations = JSON.stringify({
      arrows: [
        {
          id: 'arrow-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 50 },
          ],
          color: '#3b82f6',
          strokeWidth: 3,
          dashArray: [],
          arrowHead: true,
        },
      ],
      zones: [],
      texts: [],
      markers: [],
    });

    const config: CanvasConfig = {
      mode: 'screenshot-edit',
      backgroundImageUrl: 'data:image/png;base64,mockImage',
      initialAnnotations,
      markerMode: '3d-only',
    };

    const store = createCanvasStore(config);
    const state = store.getState();

    // マウント前に即時反映されていること
    expect(state.config.mode).toBe('screenshot-edit');
    expect(state.backgroundImageUrl).toBe('data:image/png;base64,mockImage');
    expect(state.markerMode).toBe('3d-only');
    expect(state.annotations.arrows).toHaveLength(1);
    expect(state.annotations.arrows[0]?.id).toBe('arrow-1');

    // ピッチやデフォルト選手を持たない純粋な状態（余白0%の境界線）
    expect(state.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });
  });

  it('supports undo and redo for annotation operations', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });

    expect(store.getState().canUndo()).toBe(false);
    expect(store.getState().canRedo()).toBe(false);

    // 矢印を追加
    store.getState().addArrow({
      id: 'arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      color: '#ef4444',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    expect(store.getState().annotations.arrows).toHaveLength(1);
    expect(store.getState().canUndo()).toBe(true);
    expect(store.getState().canRedo()).toBe(false);

    // Undo
    store.getState().undo();
    expect(store.getState().annotations.arrows).toHaveLength(0);
    expect(store.getState().canUndo()).toBe(false);
    expect(store.getState().canRedo()).toBe(true);

    // Redo
    store.getState().redo();
    expect(store.getState().annotations.arrows).toHaveLength(1);
    expect(store.getState().canUndo()).toBe(true);
  });

  it('allows updating boundaryBox with undo support', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });

    store.getState().setBoundaryBox({
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      visible: true,
    });

    expect(store.getState().boundaryBox.x).toBe(10);
    expect(store.getState().boundaryBox.width).toBe(80);
    expect(store.getState().canUndo()).toBe(true);

    store.getState().undo();
    expect(store.getState().boundaryBox.x).toBe(0);
    expect(store.getState().boundaryBox.width).toBe(100);
  });
});
