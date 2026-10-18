import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasStoreApi, DrawingTool } from '../../types';
import { useCanvasPointerInteraction } from '../use-canvas-pointer-interaction';

function createMockKonvaPointerEvent(
  pos: { x: number; y: number },
  isStage = true,
  evtProps: Record<string, unknown> = {},
) {
  const stage = {
    getPointerPosition: () => ({ x: pos.x, y: pos.y }),
    getStage: () => stage,
  };
  return {
    target: isStage ? stage : { getStage: () => stage },
    evt: {
      clientX: pos.x,
      clientY: pos.y,
      button: 0,
      shiftKey: false,
      preventDefault: vi.fn(),
      ...evtProps,
    },
  } as unknown as KonvaEventObject<PointerEvent>;
}

function createMockKonvaWheelEvent(
  deltaY: number,
  pos: { x: number; y: number },
) {
  const stage = {
    getPointerPosition: () => ({ x: pos.x, y: pos.y }),
    getStage: () => stage,
  };
  return {
    target: stage,
    evt: {
      deltaY,
      clientX: pos.x,
      clientY: pos.y,
      preventDefault: vi.fn(),
    },
  } as unknown as KonvaEventObject<WheelEvent>;
}

describe('useCanvasPointerInteraction', () => {
  let store: CanvasStoreApi;

  beforeEach(() => {
    store = createCanvasStore({ mode: 'tactical-board' });
  });

  const createWrapper =
    (canvasStore: CanvasStoreApi) =>
    ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        CanvasStoreContext.Provider,
        { value: canvasStore },
        children,
      );

  it('ホイールズーム時に pitchTransform.zoom がカーソル基準で拡大縮小すること', () => {
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper(store) },
    );

    expect(store.getState().pitchTransform.zoom).toBe(1);

    // ズームイン (deltaY < 0)
    act(() => {
      result.current.handleWheel(
        createMockKonvaWheelEvent(-100, { x: 500, y: 500 }),
      );
    });

    const zoomAfterIn = store.getState().pitchTransform.zoom;
    expect(zoomAfterIn).toBeGreaterThan(1);

    // ズームアウト (deltaY > 0)
    act(() => {
      result.current.handleWheel(
        createMockKonvaWheelEvent(100, { x: 500, y: 500 }),
      );
    });

    const zoomAfterOut = store.getState().pitchTransform.zoom;
    expect(zoomAfterOut).toBeLessThan(zoomAfterIn);
  });

  it('Space押下ドラッグで pitchTransform.panX / panY が平行移動すること', () => {
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper(store) },
    );

    // Spaceキー押下
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(result.current.isSpacePressed).toBe(true);

    // ドラッグ開始
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 100, y: 100 }),
      );
    });
    expect(result.current.isPanning).toBe(true);

    // ドラッグ移動 (dx = +50, dy = +30)
    act(() => {
      result.current.handlePointerMove(
        createMockKonvaPointerEvent({ x: 150, y: 130 }),
      );
    });
    expect(store.getState().pitchTransform.panX).toBe(50);
    expect(store.getState().pitchTransform.panY).toBe(30);

    // ドラッグ終了
    act(() => {
      result.current.handlePointerUp(
        createMockKonvaPointerEvent({ x: 150, y: 130 }),
      );
    });
    expect(result.current.isPanning).toBe(false);

    // Spaceキー離す
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    });
    expect(result.current.isSpacePressed).toBe(false);
  });

  it('多角形ツールでクリックごとに頂点が追加され、始点近接で閉路確定すること', () => {
    act(() => {
      store.getState().setActiveTool('polygon_zone' as DrawingTool);
    });

    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper(store) },
    );

    // 1点目クリック (x: 100, y: 100 -> norm: 10, 10)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 100, y: 100 }),
      );
    });

    const activeId = result.current.activePolygonId;
    expect(activeId).toBeTruthy();
    expect(store.getState().annotations.zones).toHaveLength(1);
    expect(store.getState().annotations.zones[0]?.points).toHaveLength(1);

    // 2点目クリック (x: 200, y: 100 -> norm: 20, 10)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 200, y: 100 }),
      );
    });
    expect(store.getState().annotations.zones[0]?.points).toHaveLength(2);

    // 3点目クリック (x: 200, y: 200 -> norm: 20, 20)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 200, y: 200 }),
      );
    });
    expect(store.getState().annotations.zones[0]?.points).toHaveLength(3);

    // 始点近接クリック (x: 102, y: 102 -> norm: 10.2, 10.2, dist < 3.5%)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 102, y: 102 }),
      );
    });

    // 閉路確定
    expect(result.current.activePolygonId).toBeNull();
    const completedZone = store.getState().annotations.zones[0];
    expect(completedZone?.isComplete).toBe(true);
    expect(store.getState().selectedObjects).toEqual([
      { id: completedZone?.id, kind: 'zone' },
    ]);
  });

  it('空白ドラッグで範囲選択矩形（SelectionBox）が拡張されること', () => {
    act(() => {
      store.getState().setActiveTool('select');
    });

    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper(store) },
    );

    // 空白ドラッグ開始 (isStage = true)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 50, y: 50 }, true),
      );
    });

    expect(result.current.selectionBox).not.toBeNull();
    expect(result.current.selectionBox?.startX).toBe(50);
    expect(result.current.selectionBox?.startY).toBe(50);

    // ドラッグ移動
    act(() => {
      result.current.handlePointerMove(
        createMockKonvaPointerEvent({ x: 250, y: 180 }, true),
      );
    });

    expect(result.current.selectionBox?.currentX).toBe(250);
    expect(result.current.selectionBox?.currentY).toBe(180);

    // ドラッグ終了
    act(() => {
      result.current.handlePointerUp(
        createMockKonvaPointerEvent({ x: 250, y: 180 }, true),
      );
    });

    expect(result.current.selectionBox).toBeNull();
  });
});
