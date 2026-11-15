import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '../../../stores/document-store';
import { selectDomainActiveSlide } from '../../../stores/domain-selectors';
import {
  createSessionStore,
  type SessionStore,
} from '../../../stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '../../../stores/tactical-store-provider';
import type { DrawingTool } from '../../types';
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
  let documentStore: DocumentStore;
  let sessionStore: SessionStore;

  const getActiveSlide = () => {
    const { activePhaseId, activeSlideId } = sessionStore.getState();
    return selectDomainActiveSlide(
      documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
  };

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    documentStore = createDocumentStore(project);
    const activePhase = project.phases[0];
    const activeSlide = activePhase?.slides[0];
    sessionStore = createSessionStore({
      activePhaseId: activePhase?.id ?? '',
      activeSlideId: activeSlide?.id ?? '',
    });
  });

  const createWrapper =
    () =>
    ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        TacticalStoreProvider,
        { stores: { documentStore, sessionStore } },
        children,
      );

  it('ホイールズーム時に pitchTransform.zoom がカーソル基準で拡大縮小すること', () => {
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper() },
    );

    expect(getActiveSlide()?.pitchTransform?.zoom ?? 1).toBe(1);

    // ズームイン (deltaY < 0)
    act(() => {
      result.current.handleWheel(
        createMockKonvaWheelEvent(-100, { x: 500, y: 500 }),
      );
    });

    const zoomAfterIn = getActiveSlide()?.pitchTransform?.zoom ?? 1;
    expect(zoomAfterIn).toBeGreaterThan(1);

    // ズームアウト (deltaY > 0)
    act(() => {
      result.current.handleWheel(
        createMockKonvaWheelEvent(100, { x: 500, y: 500 }),
      );
    });

    const zoomAfterOut = getActiveSlide()?.pitchTransform?.zoom ?? 1;
    expect(zoomAfterOut).toBeLessThan(zoomAfterIn);
  });

  it('Space押下ドラッグで pitchTransform.panX / panY が平行移動すること', () => {
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper() },
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
    expect(getActiveSlide()?.pitchTransform?.panX).toBe(50);
    expect(getActiveSlide()?.pitchTransform?.panY).toBe(30);

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
      sessionStore.getState().setActiveTool('polygon_zone' as DrawingTool);
    });

    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper() },
    );

    // 1点目クリック (x: 100, y: 100 -> norm: 10, 10)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 100, y: 100 }),
      );
    });

    expect(sessionStore.getState().drawingPreview?.polygonPoints).toHaveLength(
      1,
    );
    expect(getActiveSlide()?.zones).toHaveLength(0);

    // 2点目クリック (x: 200, y: 100 -> norm: 20, 10)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 200, y: 100 }),
      );
    });
    expect(sessionStore.getState().drawingPreview?.polygonPoints).toHaveLength(
      2,
    );
    expect(getActiveSlide()?.zones).toHaveLength(0);

    // 3点目クリック (x: 200, y: 200 -> norm: 20, 20)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 200, y: 200 }),
      );
    });
    expect(sessionStore.getState().drawingPreview?.polygonPoints).toHaveLength(
      3,
    );
    expect(getActiveSlide()?.zones).toHaveLength(0);

    // 始点近接クリック (x: 102, y: 102 -> norm: 10.2, 10.2, dist < 3.5%)
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 102, y: 102 }),
      );
    });

    // 閉路確定
    expect(sessionStore.getState().drawingPreview).toBeNull();
    expect(getActiveSlide()?.zones).toHaveLength(1);
    const completedZone = getActiveSlide()?.zones[0];
    expect(completedZone?.shapeType).toBe('polygon');
    expect(completedZone).not.toHaveProperty('isComplete');
    expect(sessionStore.getState().selectedObjects).toEqual([
      { id: completedZone?.id, kind: 'zone' },
    ]);
  });

  it('空白ドラッグで範囲選択矩形（SelectionBox）が拡張されること', () => {
    act(() => {
      sessionStore.getState().setActiveTool('select');
    });

    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper() },
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
