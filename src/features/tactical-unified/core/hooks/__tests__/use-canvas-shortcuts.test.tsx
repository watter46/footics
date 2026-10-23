import { act, fireEvent, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreProvider } from '../../store/canvas-store-provider';
import { useCanvasShortcuts } from '../use-canvas-shortcuts';
import { useCanvasStoreApi } from '../use-canvas-store';

function createWrapper() {
  const store = createCanvasStore({ mode: 'tactical-board' });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <CanvasStoreProvider store={store}>{children}</CanvasStoreProvider>;
  };
}

describe('useCanvasShortcuts', () => {
  it('ツールショートカットキーでアクティブツールが変更される', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts();
        return useCanvasStoreApi();
      },
      { wrapper },
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'l', code: 'KeyL' });
    });
    expect(result.current.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });
    });
    expect(result.current.getState().activeTool).toBe('arrow_solid');

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });
    expect(result.current.getState().activeTool).toBe('select');
  });

  it('escape で接続キャンセル・選択解除・ツールが select にリセットされる', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts();
        return useCanvasStoreApi();
      },
      { wrapper },
    );

    act(() => {
      result.current.getState().setActiveTool('line');
      result.current.getState().setConnectingPlayerId('p-1');
    });

    expect(result.current.getState().connectingPlayerId).toBe('p-1');

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });

    expect(result.current.getState().connectingPlayerId).toBeNull();
    expect(result.current.getState().activeTool).toBe('select');
  });

  it('disabled: true のときはショートカットが発火しない', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => {
        useCanvasShortcuts({ disabled: true });
        return useCanvasStoreApi();
      },
      { wrapper },
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'l', code: 'KeyL' });
    });
    expect(result.current.getState().activeTool).toBe('select');
  });
});
