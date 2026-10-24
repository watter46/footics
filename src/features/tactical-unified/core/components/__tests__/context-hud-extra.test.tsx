import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasStoreApi } from '../../types';
import { ContextHud } from '../ContextHud';

function renderWithStore(
  ui: React.ReactElement,
  initialStore?: CanvasStoreApi,
) {
  const store =
    initialStore ??
    createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
  const utils = render(
    <CanvasStoreContext.Provider value={store}>
      {ui}
    </CanvasStoreContext.Provider>,
  );
  return { store, ...utils };
}

describe('ContextHud Extra Plugins (renderExtraHud & resolveExtraTarget)', () => {
  it('renderExtraHud で渡したカスタムコンポーネントが描画されること', () => {
    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    store.getState().setSelectedObjects([{ id: 'ball', kind: 'ball' }]);

    renderWithStore(
      <ContextHud
        stageSize={{ width: 800, height: 600 }}
        resolveExtraTarget={(selected, _offset) => {
          if (selected.kind === 'ball') {
            return { x: 400, y: 300, height: 24 };
          }
          return null;
        }}
        renderExtraHud={(selected) => (
          <button type="button" data-testid="custom-ball-hud">
            Ball Locked: {selected.id}
          </button>
        )}
      />,
      store,
    );

    const extraHud = screen.getByTestId('custom-ball-hud');
    expect(extraHud).toBeDefined();
    expect(extraHud.textContent).toBe('Ball Locked: ball');
  });

  it('resolveExtraTarget が標準のターゲット解決より優先されること', () => {
    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    const player = {
      ...createDefaultPlayer('home', 10, 10, '#034694'),
      id: 'p1',
      shirtNo: '10',
    };
    store.getState().addMarker(player);
    store.getState().setSelectedObjects([{ id: 'p1', kind: 'player' }]);

    const { container } = renderWithStore(
      <ContextHud
        stageSize={{ width: 800, height: 600 }}
        resolveExtraTarget={() => {
          // 強制的に x: 500, y: 400 に配置
          return { x: 500, y: 400, height: 32 };
        }}
      />,
      store,
    );

    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    expect(toolbar).not.toBeNull();
    // computeClampedHudPos: targetX 500 -> clampedX 500
    expect(toolbar.style.left).toBe('500px');
  });

  it('selected.kind === "ball" で nodesRegistryRef.current.ballNode からフォールバック解決されること', () => {
    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    store.getState().setSelectedObjects([{ id: 'ball', kind: 'ball' }]);

    const fakeNodesRegistryRef = {
      current: {
        ballNode: {
          getClientRect: () => ({
            x: 200,
            y: 150,
            width: 20,
            height: 20,
          }),
        },
      },
    } as React.MutableRefObject<unknown>;

    const { container } = renderWithStore(
      <ContextHud
        stageSize={{ width: 800, height: 600 }}
        nodesRegistryRef={fakeNodesRegistryRef}
        renderExtraHud={() => <span data-testid="ball-indicator">Ball</span>}
      />,
      store,
    );

    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    expect(toolbar).not.toBeNull();
    expect(screen.getByTestId('ball-indicator')).toBeDefined();
    // ballNode.rect.x(200) + width/2(10) = 210
    expect(toolbar.style.left).toBe('210px');
  });

  it('isDragging === true の時は ContextHud が null (描画されない) になること', () => {
    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    const player = {
      ...createDefaultPlayer('home', 10, 10, '#034694'),
      id: 'p1',
      shirtNo: '10',
    };
    store.getState().addMarker(player);
    store.getState().setSelectedObjects([{ id: 'p1', kind: 'player' }]);
    store.setState({ isDragging: true });

    const { container } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
      store,
    );

    expect(container.firstChild).toBeNull();
  });
});
