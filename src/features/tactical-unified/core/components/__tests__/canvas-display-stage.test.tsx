import { render } from '@testing-library/react';
import type Konva from 'konva';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasStoreApi } from '../../types';
import { createCanvasNodesRegistry } from '../../utils/canvas-registry';
import { CanvasDisplayStage } from '../canvas-display-stage';

class MockResizeObserver {
  callback: ResizeObserverCallback;
  static mockSize = { width: 800, height: 450 };

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    if (
      MockResizeObserver.mockSize.width > 0 &&
      MockResizeObserver.mockSize.height > 0
    ) {
      this.callback(
        [
          {
            target,
            contentRect: MockResizeObserver.mockSize as DOMRectReadOnly,
          } as unknown as ResizeObserverEntry,
        ],
        this,
      );
    }
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  MockResizeObserver.mockSize = { width: 800, height: 450 };
  global.ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;

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

describe('CanvasDisplayStage Component', () => {
  it('④ 寸法確定前（0x0）は Stage が生成されないこと', () => {
    MockResizeObserver.mockSize = { width: 0, height: 0 };
    const registryRef = { current: createCanvasNodesRegistry() };
    const { container } = renderWithStore(
      <CanvasDisplayStage nodesRegistryRef={registryRef} />,
    );

    expect(container.querySelector('.konvajs-content')).toBeNull();
    expect(registryRef.current.stage).toBeNull();
  });

  it('① 全 Layer の listening() が false であること', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    renderWithStore(<CanvasDisplayStage nodesRegistryRef={registryRef} />);

    const stage = registryRef.current.stage;
    expect(stage).toBeTruthy();
    expect(stage?.listening()).toBe(false);

    const layers = stage?.getLayers() ?? [];
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(layer.listening()).toBe(false);
    }
  });

  it("② window.addEventListener に 'keydown' が登録されないこと", () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const registryRef = { current: createCanvasNodesRegistry() };

    renderWithStore(<CanvasDisplayStage nodesRegistryRef={registryRef} />);

    const keydownCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'keydown',
    );
    expect(keydownCalls.length).toBe(0);

    addEventListenerSpy.mockRestore();
  });

  it('③ 選手マーカーの draggable() が false であること', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
      initialAnnotations: JSON.stringify({
        arrows: [],
        zones: [],
        texts: [],
        markers: [createDefaultPlayer('home', 50, 50, '#ff0000')],
      }),
    });

    renderWithStore(
      <CanvasDisplayStage nodesRegistryRef={registryRef} />,
      store,
    );

    const stage = registryRef.current.stage;
    expect(stage).toBeTruthy();

    const groups = stage?.find<Konva.Group>('Group') ?? [];
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.draggable()).toBe(false);
    }
  });
});
