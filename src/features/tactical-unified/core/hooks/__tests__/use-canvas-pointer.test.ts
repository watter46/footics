import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
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

  it('ホイール操作を実行しても pitchTransform.zoom が変化しないこと（無効化）', () => {
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper() },
    );

    const initialZoom = getActiveSlide()?.pitchTransform?.zoom ?? 1;
    expect(initialZoom).toBe(1);

    // ズームイン (deltaY < 0)
    act(() => {
      result.current.handleWheel(
        createMockKonvaWheelEvent(-100, { x: 500, y: 500 }),
      );
    });
    expect(getActiveSlide()?.pitchTransform?.zoom ?? 1).toBe(initialZoom);

    // ズームアウト (deltaY > 0)
    act(() => {
      result.current.handleWheel(
        createMockKonvaWheelEvent(100, { x: 500, y: 500 }),
      );
    });
    expect(getActiveSlide()?.pitchTransform?.zoom ?? 1).toBe(initialZoom);
  });

  it('Space押下中のポインタダウン＋ムーブでも pitchTransform.panX / panY が変化しないこと（無効化）', () => {
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
        }),
      { wrapper: createWrapper() },
    );

    const initialPanX = getActiveSlide()?.pitchTransform?.panX ?? 0;
    const initialPanY = getActiveSlide()?.pitchTransform?.panY ?? 0;

    // Spaceキー押下
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });

    // ドラッグ開始
    act(() => {
      result.current.handlePointerDown(
        createMockKonvaPointerEvent({ x: 100, y: 100 }),
      );
    });
    expect(result.current.isPanning).toBe(false);

    // ドラッグ移動 (dx = +50, dy = +30)
    act(() => {
      result.current.handlePointerMove(
        createMockKonvaPointerEvent({ x: 150, y: 130 }),
      );
    });
    expect(getActiveSlide()?.pitchTransform?.panX ?? 0).toBe(initialPanX);
    expect(getActiveSlide()?.pitchTransform?.panY ?? 0).toBe(initialPanY);

    // ドラッグ終了
    act(() => {
      result.current.handlePointerUp(
        createMockKonvaPointerEvent({ x: 150, y: 130 }),
      );
    });

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

  it('選択中rectゾーンの四隅内側・isAnchorでは回転せず、四隅外側でHot State回転しpointerUpで確定すること', () => {
    act(() => {
      documentStore
        .getState()
        .dispatchSlide(
          sessionStore.getState().activePhaseId,
          sessionStore.getState().activeSlideId,
          {
            type: 'ADD_ZONE',
            zone: {
              id: 'zone-rot-1',
              annotationType: 'zone',
              zoneType: 'highlight',
              shapeType: 'rect',
              x: toScreenNormCoord(20),
              y: toScreenNormCoord(20),
              width: 20,
              height: 20,
              rotation: 0,
              color: '#3b82f6',
              opacity: 0.3,
              strokeWidth: 2,
              label: '',
            },
          },
        );
      sessionStore.getState().setActiveTool('select');
      sessionStore.getState().selectObject({ id: 'zone-rot-1', kind: 'zone' });
    });

    const stageContainer = document.createElement('div');
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { width: 1000, height: 1000 },
          containerRef,
        }),
      { wrapper: createWrapper() },
    );

    const makeEvent = (
      pos: { x: number; y: number },
      opts?: { anchorName?: string },
    ) => {
      const ev = createMockKonvaPointerEvent(pos, true);
      const target = {
        ...ev.target,
        name: () => opts?.anchorName ?? '',
        getParent: () => null,
        getStage: () => ({
          ...ev.target.getStage(),
          container: () => stageContainer,
        }),
      };
      return { ...ev, target } as unknown as Parameters<
        typeof result.current.handlePointerMove
      >[0];
    };

    // 四隅内側 (395, 205): 回転カーソルにならず開始もしない
    act(() => {
      result.current.handlePointerMove(makeEvent({ x: 395, y: 205 }));
      result.current.handlePointerDown(makeEvent({ x: 395, y: 205 }));
    });
    expect(sessionStore.getState().activeZoneRotation).toBeNull();

    // isAnchor = true (_anchor): 四隅外側でも回転開始しない
    act(() => {
      result.current.handlePointerMove(
        makeEvent({ x: 410, y: 190 }, { anchorName: 'top-right _anchor' }),
      );
      result.current.handlePointerDown(
        makeEvent({ x: 410, y: 190 }, { anchorName: 'top-right _anchor' }),
      );
    });
    expect(sessionStore.getState().activeZoneRotation).toBeNull();

    // 四隅外側 (410, 190): ホバーでカーソル設定、押下で回転開始
    act(() => {
      result.current.handlePointerMove(makeEvent({ x: 410, y: 190 }));
    });
    expect(stageContainer.style.cursor).toContain('data:image/svg+xml');

    act(() => {
      result.current.handlePointerDown(makeEvent({ x: 410, y: 190 }));
      result.current.handlePointerMove(makeEvent({ x: 410, y: 300 }));
    });

    // ドラッグ中は Hot State のみ更新され、DocumentStore は未変更
    const hotRot = sessionStore.getState().activeZoneRotation;
    expect(hotRot?.zoneId).toBe('zone-rot-1');
    expect(hotRot?.rotationDeg).toBeGreaterThan(0);
    const zoneBeforeUp = getActiveSlide()?.zones[0];
    expect(
      zoneBeforeUp?.shapeType === 'rect' ? zoneBeforeUp.rotation : -1,
    ).toBe(0);

    // pointerUp で Hot State クリア & DocumentStore 確定
    act(() => {
      result.current.handlePointerUp();
    });
    expect(sessionStore.getState().activeZoneRotation).toBeNull();
    const zoneAfterUp = getActiveSlide()?.zones[0];
    expect(
      zoneAfterUp?.shapeType === 'rect' ? zoneAfterUp.rotation : -1,
    ).toBeCloseTo(hotRot?.rotationDeg ?? 0, 5);
  });

  it('vRect に { x: 40, y: 20 } オフセットがある場合も四隅外側判定と回転中心が一致すること', () => {
    act(() => {
      documentStore
        .getState()
        .dispatchSlide(
          sessionStore.getState().activePhaseId,
          sessionStore.getState().activeSlideId,
          {
            type: 'ADD_ZONE',
            zone: {
              id: 'zone-rot-offset',
              annotationType: 'zone',
              zoneType: 'highlight',
              shapeType: 'rect',
              x: toScreenNormCoord(20),
              y: toScreenNormCoord(20),
              width: 20,
              height: 20,
              rotation: 0,
              color: '#3b82f6',
              opacity: 0.3,
              strokeWidth: 2,
              label: '',
            },
          },
        );
      sessionStore.getState().setActiveTool('select');
      sessionStore
        .getState()
        .selectObject({ id: 'zone-rot-offset', kind: 'zone' });
    });

    const stageContainer = document.createElement('div');
    const { result } = renderHook(
      () =>
        useCanvasPointerInteraction({
          vRect: { x: 40, y: 20, width: 1000, height: 1000 } as {
            width: number;
            height: number;
          },
        }),
      { wrapper: createWrapper() },
    );

    const makeEvent = (pos: { x: number; y: number }) => {
      const ev = createMockKonvaPointerEvent(pos, true);
      const target = {
        ...ev.target,
        name: () => '',
        getParent: () => null,
        getStage: () => ({
          ...ev.target.getStage(),
          container: () => stageContainer,
        }),
      };
      return { ...ev, target } as unknown as Parameters<
        typeof result.current.handlePointerMove
      >[0];
    };

    // 右上隅 (400 + 40, 200 + 20) の外側 (+10, -10) -> (450, 210)
    act(() => {
      result.current.handlePointerMove(makeEvent({ x: 450, y: 210 }));
      result.current.handlePointerDown(makeEvent({ x: 450, y: 210 }));
      result.current.handlePointerMove(makeEvent({ x: 450, y: 320 }));
    });

    expect(sessionStore.getState().activeZoneRotation?.zoneId).toBe(
      'zone-rot-offset',
    );
    expect(
      sessionStore.getState().activeZoneRotation?.rotationDeg,
    ).toBeGreaterThan(0);

    act(() => {
      result.current.handlePointerUp();
    });
    const zoneOffsetAfterUp = getActiveSlide()?.zones[0];
    expect(
      zoneOffsetAfterUp?.shapeType === 'rect' ? zoneOffsetAfterUp.rotation : 0,
    ).toBeGreaterThan(0);
  });
});
