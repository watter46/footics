import { act, fireEvent, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ScreenNormCoord } from '@/lib/types/tactical/branded';
import {
  drawingToolPlugins,
  registerDrawingToolPlugin,
} from '../../components/toolbar/drawing-tool-plugin';
import { useCanvasShortcuts } from '../use-canvas-shortcuts';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TacticalStoreProvider>{children}</TacticalStoreProvider>;
  };
}

describe('useCanvasShortcuts', () => {
  it('ツールショートカットキーでアクティブツールが変更される', () => {
    const snapshot = new Map(drawingToolPlugins);
    try {
      const linePlugin = drawingToolPlugins.get('line');
      if (!linePlugin) {
        throw new Error('line plugin not found');
      }
      registerDrawingToolPlugin({ ...linePlugin, shortcutKey: 'l' });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => {
          useCanvasShortcuts();
          return useTacticalStoresContext();
        },
        { wrapper },
      );

      act(() => {
        fireEvent.keyDown(document, { key: 'l', code: 'KeyL' });
      });
      expect(result.current.sessionStore.getState().activeTool).toBe('line');

      act(() => {
        fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
      });
      expect(result.current.sessionStore.getState().activeTool).toBe('select');
    } finally {
      drawingToolPlugins.clear();
      for (const [key, plugin] of snapshot) {
        drawingToolPlugins.set(key, plugin);
      }
    }
  });

  it('escape で接続キャンセル・選択解除・ツールが select にリセットされる', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts();
        return useTacticalStoresContext();
      },
      { wrapper },
    );

    act(() => {
      const session = result.current.sessionStore.getState();
      session.setActiveTool('line');
      session.setConnectingPlayerId('p-1');
      session.selectObjects([{ id: 'p-1', kind: 'player' }]);
    });

    expect(result.current.sessionStore.getState().connectingPlayerId).toBe(
      'p-1',
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });

    const sessionAfter = result.current.sessionStore.getState();
    expect(sessionAfter.connectingPlayerId).toBeNull();
    expect(sessionAfter.selectedObjects).toEqual([]);
    expect(sessionAfter.activeTool).toBe('select');
  });

  it('disabled: true のときはショートカットが発火しない', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts({ disabled: true });
        return useTacticalStoresContext();
      },
      { wrapper },
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'l', code: 'KeyL' });
    });
    expect(result.current.sessionStore.getState().activeTool).toBe('select');
  });

  it('input 要素にフォーカスがあるときはショートカットが発火しない', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts();
        return useTacticalStoresContext();
      },
      { wrapper },
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    try {
      act(() => {
        fireEvent.keyDown(input, { key: 'l', code: 'KeyL' });
      });
      expect(result.current.sessionStore.getState().activeTool).toBe('select');
    } finally {
      document.body.removeChild(input);
    }
  });

  it('Delete で選択エンティティを削除し、Cmd+Z で復元する', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts();
        return useTacticalStoresContext();
      },
      { wrapper },
    );

    const { activePhaseId, activeSlideId } =
      result.current.sessionStore.getState();

    act(() => {
      result.current.documentStore
        .getState()
        .dispatchSlide(activePhaseId, activeSlideId, {
          type: 'INSERT_ENTITIES',
          arrows: [
            {
              id: 'arrow-del-1',
              annotationType: 'arrow',
              arrowType: 'pass',
              curveType: 'straight',
              points: [
                { x: 10 as ScreenNormCoord, y: 10 as ScreenNormCoord },
                { x: 30 as ScreenNormCoord, y: 30 as ScreenNormCoord },
              ],
              color: '#ffffff',
              strokeWidth: 2,
              dashArray: [],
              startMarker: 'none',
              endMarker: 'arrow',
            },
          ],
        });
      result.current.sessionStore
        .getState()
        .selectObjects([{ id: 'arrow-del-1', kind: 'arrow' }]);
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'Delete', code: 'Delete' });
    });

    const slideAfterDelete = selectDomainActiveSlide(
      result.current.documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    expect(slideAfterDelete?.arrows.some((a) => a.id === 'arrow-del-1')).toBe(
      false,
    );
    expect(result.current.sessionStore.getState().selectedObjects).toEqual([]);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        metaKey: true,
      });
    });

    const slideAfterUndo = selectDomainActiveSlide(
      result.current.documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    expect(slideAfterUndo?.arrows.some((a) => a.id === 'arrow-del-1')).toBe(
      true,
    );
  });

  it('Cmd+C と Cmd+V でエンティティがオフセット付きで複製される', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts();
        return useTacticalStoresContext();
      },
      { wrapper },
    );

    const { activePhaseId, activeSlideId } =
      result.current.sessionStore.getState();

    act(() => {
      result.current.documentStore
        .getState()
        .dispatchSlide(activePhaseId, activeSlideId, {
          type: 'INSERT_ENTITIES',
          arrows: [
            {
              id: 'arrow-copy-1',
              annotationType: 'arrow',
              arrowType: 'pass',
              curveType: 'straight',
              points: [
                { x: 20 as ScreenNormCoord, y: 20 as ScreenNormCoord },
                { x: 40 as ScreenNormCoord, y: 40 as ScreenNormCoord },
              ],
              color: '#ffffff',
              strokeWidth: 2,
              dashArray: [],
              startMarker: 'none',
              endMarker: 'arrow',
            },
          ],
        });
      result.current.sessionStore
        .getState()
        .selectObjects([{ id: 'arrow-copy-1', kind: 'arrow' }]);
    });

    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        metaKey: true,
      });
    });

    expect(result.current.sessionStore.getState().clipboard).not.toBeNull();

    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        metaKey: true,
      });
    });

    const slideAfterPaste = selectDomainActiveSlide(
      result.current.documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    const copiedArrows =
      slideAfterPaste?.arrows.filter((a) => a.id !== 'arrow-copy-1') ?? [];
    expect(copiedArrows.length).toBeGreaterThanOrEqual(1);
    const pasted = copiedArrows.find(
      (a) => a.points[0]?.x === 23 && a.points[0]?.y === 23,
    );
    expect(pasted).toBeDefined();
  });
});
