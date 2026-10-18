import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { ContextHud } from '../components/ContextHud';
import { PlayerQuickActions } from '../components/hud/player-quick-actions';
import { DraggableToolbar, FixedToolbar } from '../components/toolbar';
import { createCanvasStore } from '../store/canvas-store';
import { CanvasStoreContext } from '../store/canvas-store-provider';
import type { CanvasStoreApi } from '../types';
import {
  create2DPlayerMarker,
  createRingMarker,
  createTextAnnotation,
} from '../utils/canvas-drawing-factory';

function renderWithStore(ui: React.ReactElement, store?: CanvasStoreApi) {
  const s =
    store ??
    createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
  const utils = render(
    <CanvasStoreContext.Provider value={s}>{ui}</CanvasStoreContext.Provider>,
  );
  return { store: s, ...utils };
}

describe('Phase 8: Defaults & Fixed Toolbar', () => {
  it('1. オブジェクトデフォルト値が正しく復元されていること', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    const state = store.getState();

    expect(state.color).toBe('#ffffff');
    expect(state.strokeWidth).toBe(3);
    expect(state.fontSize).toBe(16);

    const ring = createRingMarker(10, 10);
    expect(ring.style.color).toBe('#034694');
    expect(ring.style.strokeColor).toBe('#ffffff');
    expect(ring.style.strokeWidth).toBe(2);

    const player2d = create2DPlayerMarker(20, 20, '', '10');
    expect(player2d.style.color).toBe('#034694');

    const text = createTextAnnotation(30, 30);
    expect(text.color).toBe('#ffffff');
    expect(text.fontSize).toBe(16);
  });

  it('2. FixedToolbar が右側固定配置スタイルを持つこと', () => {
    const { container } = renderWithStore(
      <FixedToolbar>
        <button type="button">Tool</button>
      </FixedToolbar>,
    );
    const tb = container.firstChild as HTMLElement;
    expect(tb.style.right).toBe('var(--toolbar-right, 12px)');
    expect(tb.style.transform).toBe(
      'var(--toolbar-transform, translateY(-50%))',
    );
    expect(DraggableToolbar).toBe(FixedToolbar);
  });
});

describe('Phase 8: HUD Separation & Connect Lines', () => {
  it('3. ドラッグ移動中は HUD が非表示となり、クリック選択時に表示されること', () => {
    const { container, store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      store.getState().addMarker(createRingMarker(50, 50, '#3b82f6', '1'));
    });
    const marker = store.getState().annotations.markers[0];
    if (!marker) throw new Error('marker not found');

    act(() => {
      store.getState().selectObject(marker.id);
    });
    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();

    act(() => {
      store.getState().setIsDragging(true);
      store.getState().setIsHudOpen(false);
    });
    expect(container.querySelector('[role="toolbar"]')).toBeNull();

    act(() => {
      store.getState().setIsDragging(false);
    });
    expect(container.querySelector('[role="toolbar"]')).toBeNull();

    act(() => {
      store.getState().selectObject(marker.id);
      store.getState().setIsHudOpen(true);
    });
    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();
  });

  it('4. コネクトラインが選択可能で色・太さを変更できること', () => {
    const { container, store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      const p1 = createRingMarker(20, 20, '#3b82f6', '1');
      const p2 = createRingMarker(60, 60, '#3b82f6', '2');
      p1.connectLines = [
        {
          id: 'cl-1',
          toPlayerId: p2.id,
          lineStyle: 'solid',
          color: '#38bdf8',
          strokeWidth: 2,
          visible: true,
        },
      ];
      store.getState().addMarker(p1);
      store.getState().addMarker(p2);
    });

    const p1 = store.getState().annotations.markers[0];
    if (!p1) throw new Error('p1 not found');

    act(() => {
      store.getState().selectObject({
        id: 'cl-1',
        kind: 'connect-line',
        parentPlayerId: p1.id,
      });
    });

    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(screen.getByTitle('コネクトラインの色')).toBeDefined();

    const plusBtn = screen.getByTitle('線を太く');
    fireEvent.click(plusBtn);

    const updatedP1 = store.getState().annotations.markers[0];
    expect(updatedP1?.connectLines[0]?.strokeWidth).toBe(3);
  });

  it('5. PlayerQuickActions で Vision Cone 有効状態が強調されること', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    const p1 = createRingMarker(30, 30, '#3b82f6', '1');
    const p2 = createRingMarker(70, 70, '#3b82f6', '2');
    store.getState().addMarker(p1);
    store.getState().addMarker(p2);

    const player = store.getState().annotations.markers[0];
    if (!player) throw new Error('player not found');

    const { rerender } = render(
      <CanvasStoreContext.Provider value={store}>
        <PlayerQuickActions player={player} />
      </CanvasStoreContext.Provider>,
    );

    const visionBtn = screen.getByTitle('視野コーンを追加');
    expect(visionBtn.className).not.toContain('ring-sky-400');

    fireEvent.click(visionBtn);

    const updatedPlayer = store.getState().annotations.markers[0];
    if (!updatedPlayer) throw new Error('updatedPlayer not found');

    rerender(
      <CanvasStoreContext.Provider value={store}>
        <PlayerQuickActions player={updatedPlayer} />
      </CanvasStoreContext.Provider>,
    );

    const activeVisionBtn = screen.getByTitle('視野コーンON (クリックでOFF)');
    expect(activeVisionBtn.className).toContain('ring-sky-400');
    expect(updatedPlayer.visionCone?.color).toBe('#034694');
  });
});
