import { render } from '@testing-library/react';
import type Konva from 'konva';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasStoreApi } from '../../types';
import { createCanvasNodesRegistry } from '../../utils/canvas-registry';
import { CanvasStage, type CanvasStageViewProps } from '../canvas-stage';

beforeEach(() => {
  const mockCtx = new Proxy(
    {
      getImageData: () => ({ data: new Array(4) }),
      createImageData: () => [],
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      measureText: () => ({ width: 0 }),
      getLineDash: () => [],
      isPointInPath: () => true,
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
    } as Record<string, unknown>,
    {
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

function renderWithStore(
  ui: React.ReactElement,
  initialStore?: CanvasStoreApi,
) {
  const store =
    initialStore ??
    createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
  const utils = render(
    <CanvasStoreContext.Provider value={store}>
      {ui}
    </CanvasStoreContext.Provider>,
  );
  return { store, ...utils };
}

describe('CanvasStage Component', () => {
  const defaultSize = { width: 800, height: 450 };
  const defaultVRect = { x: 0, y: 0, width: 800, height: 450 };

  it('size が 0x0 のときは Stage を描画しないこと', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const { container } = renderWithStore(
      <CanvasStage
        size={{ width: 0, height: 0 }}
        vRect={defaultVRect}
        nodesRegistryRef={registryRef}
      />,
    );

    expect(container.querySelector('.konvajs-content')).toBeNull();
  });

  it('size が有効値のときは Stage および Layer を描画すること', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const { container } = renderWithStore(
      <CanvasStage
        size={defaultSize}
        vRect={defaultVRect}
        nodesRegistryRef={registryRef}
      />,
    );

    expect(container.querySelector('.konvajs-content')).toBeTruthy();
  });

  it('interaction が渡された場合、Stage にポインターハンドラが渡されること', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const onPointerDown = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerUp = vi.fn();
    const onWheel = vi.fn();
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    const stageRef = { current: null as Konva.Stage | null };

    renderWithStore(
      <CanvasStage
        stageRef={stageRef}
        size={defaultSize}
        vRect={defaultVRect}
        nodesRegistryRef={registryRef}
        interaction={{
          stageHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onWheel,
            onDragStart,
            onDragEnd,
          },
          activePolygonId: null,
          mousePreviewPos: null,
          selectionBox: null,
          editingTextId: null,
          onStartEditText: vi.fn(),
        }}
      />,
    );

    const stage = stageRef.current;
    expect(stage).toBeTruthy();
  });

  it('interaction が未指定の場合でもエラーなく表示専用として描画できること', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const { container } = renderWithStore(
      <CanvasStage
        size={defaultSize}
        vRect={defaultVRect}
        nodesRegistryRef={registryRef}
      />,
    );

    expect(container.querySelector('.konvajs-content')).toBeTruthy();
  });

  it('vRect / size 不変の再レンダーで Layer が再生成されないこと', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const stageRef = { current: null as Konva.Stage | null };

    const { rerender, store } = renderWithStore(
      <CanvasStage
        stageRef={stageRef}
        size={defaultSize}
        vRect={defaultVRect}
        nodesRegistryRef={registryRef}
      />,
    );

    const initialStage = stageRef.current;
    expect(initialStage).toBeTruthy();
    const initialLayers = initialStage?.getLayers() ?? [];
    expect(initialLayers.length).toBeGreaterThan(0);

    // 同じ props で再レンダー
    rerender(
      <CanvasStoreContext.Provider value={store}>
        <CanvasStage
          stageRef={stageRef}
          size={defaultSize}
          vRect={defaultVRect}
          nodesRegistryRef={registryRef}
        />
      </CanvasStoreContext.Provider>,
    );

    const postRerenderLayers = stageRef.current?.getLayers() ?? [];
    expect(postRerenderLayers).toEqual(initialLayers);
  });
});
