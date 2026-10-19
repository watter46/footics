import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CanvasStoreApi,
  CanvasStoreContext,
  createCanvasStore,
  useCanvasZoomPan,
} from '@/features/tactical-unified/core';

function createMockKonvaPointerEvent(
  pos: { x: number; y: number },
  button = 0,
) {
  const stage = {
    getPointerPosition: () => ({ x: pos.x, y: pos.y }),
    getStage: () => stage,
  };
  return {
    target: stage,
    evt: {
      clientX: pos.x,
      clientY: pos.y,
      button,
      preventDefault: vi.fn(),
    },
  } as unknown as KonvaEventObject<PointerEvent>;
}

describe('L1-Tactical-051: Pitch Pan Control & Lock Guard', () => {
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

  it('スペースキー未押下の通常クリックではパンが開始されない', () => {
    const { result } = renderHook(
      () => useCanvasZoomPan({ vRect: { width: 1000, height: 600 } }),
      { wrapper: createWrapper(store) },
    );

    let handled = false;
    act(() => {
      handled = result.current.handlePanPointerDown(
        createMockKonvaPointerEvent({ x: 100, y: 100 }, 0),
      );
    });

    expect(handled).toBe(false);
    expect(result.current.isPanning).toBe(false);
  });

  it('スペースキー押下中はポインタダウンでパンが開始される', () => {
    const { result } = renderHook(
      () => useCanvasZoomPan({ vRect: { width: 1000, height: 600 } }),
      { wrapper: createWrapper(store) },
    );

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', key: ' ' }),
      );
    });

    let handled = false;
    act(() => {
      handled = result.current.handlePanPointerDown(
        createMockKonvaPointerEvent({ x: 100, y: 100 }, 0),
      );
    });

    expect(handled).toBe(true);
    expect(result.current.isPanning).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keyup', { code: 'Space', key: ' ' }),
      );
    });
  });

  it('ピッチがロック状態 (isLocked = true) の場合はスペースキー押下中でもパンが開始されない', () => {
    store.getState().setPitchTransform({ isLocked: true });

    const { result } = renderHook(
      () => useCanvasZoomPan({ vRect: { width: 1000, height: 600 } }),
      { wrapper: createWrapper(store) },
    );

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', key: ' ' }),
      );
    });

    let handled = false;
    act(() => {
      handled = result.current.handlePanPointerDown(
        createMockKonvaPointerEvent({ x: 100, y: 100 }, 0),
      );
    });

    expect(handled).toBe(false);
    expect(result.current.isPanning).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keyup', { code: 'Space', key: ' ' }),
      );
    });
  });
});
