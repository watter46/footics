import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasZoomPan } from '@/features/tactical-unified/core';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import {
  createSessionStore,
  type SessionStore,
} from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';

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
  let documentStore: DocumentStore;
  let sessionStore: SessionStore;

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

  it('スペースキー未押下の通常クリックではパンが開始されない', () => {
    const { result } = renderHook(
      () => useCanvasZoomPan({ vRect: { width: 1000, height: 600 } }),
      { wrapper: createWrapper() },
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
      { wrapper: createWrapper() },
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
    const { activePhaseId, activeSlideId } = sessionStore.getState();
    documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
      type: 'UPDATE_SLIDE_META',
      patch: {
        pitchTransform: { zoom: 1, panX: 0, panY: 0, tilt: 0, isLocked: true },
      },
    });

    const { result } = renderHook(
      () => useCanvasZoomPan({ vRect: { width: 1000, height: 600 } }),
      { wrapper: createWrapper() },
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
