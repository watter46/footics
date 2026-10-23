import { act, fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasCoreHandle, CanvasStoreApi } from '../../types';
import { createCanvasNodesRegistry } from '../../utils/canvas-registry';
import { CanvasStageContainer } from '../CanvasStageContainer';

class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 800, height: 450 } as DOMRectReadOnly,
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  global.ResizeObserver = MockResizeObserver;

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
): { store: CanvasStoreApi } & ReturnType<typeof render> {
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

describe('CanvasCoreHandle Imperative API', () => {
  it('ref.current.exportPng({ crop: true }) が BoundaryBox の枠内のみを出力すること', async () => {
    const handleRef = createRef<CanvasCoreHandle>();
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
      defaultBoundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    renderWithStore(<CanvasStageContainer ref={handleRef} />, store);
    expect(handleRef.current).toBeTruthy();

    const dataUrl = await handleRef.current?.exportPng({
      crop: true,
      scale: 2,
    });
    expect(typeof dataUrl).toBe('string');
  });

  it('ref.current.copyToClipboard() がエラーなく実行されること', async () => {
    const handleRef = createRef<CanvasCoreHandle>();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      configurable: true,
      writable: true,
    });

    renderWithStore(<CanvasStageContainer ref={handleRef} />);
    expect(handleRef.current).toBeTruthy();

    await act(async () => {
      await handleRef.current?.copyToClipboard();
    });

    expect(writeMock).toHaveBeenCalled();
  });

  it('undo/redo/canUndo/canRedo がハンドル経由で正しく呼び出せること', () => {
    const handleRef = createRef<CanvasCoreHandle>();
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
    renderWithStore(<CanvasStageContainer ref={handleRef} />, store);

    expect(handleRef.current?.canUndo()).toBe(false);
    expect(handleRef.current?.canRedo()).toBe(false);

    act(() => {
      store.getState().addArrow({
        id: 'arrow-undo-test',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        color: '#fff',
        strokeWidth: 2,
        dashArray: [],
        arrowHead: true,
      });
    });

    expect(handleRef.current?.canUndo()).toBe(true);
    act(() => {
      handleRef.current?.undo();
    });
    expect(store.getState().annotations.arrows).toHaveLength(0);
    expect(handleRef.current?.canRedo()).toBe(true);

    act(() => {
      handleRef.current?.redo();
    });
    expect(store.getState().annotations.arrows).toHaveLength(1);
  });
});

describe('CanvasStageContainer Tool Shortcuts', () => {
  it('ツール切り替えキー（V, L, R, A, D, W, Z, P, T, M, O, E）が正しく動作すること', () => {
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
    renderWithStore(<CanvasStageContainer />, store);

    const toolMappings: [string, string, string][] = [
      ['l', 'line', 'KeyL'],
      ['r', 'route_line', 'KeyR'],
      ['a', 'arrow_solid', 'KeyA'],
      ['d', 'arrow_dash', 'KeyD'],
      ['w', 'arrow_wavy', 'KeyW'],
      ['z', 'zone_circle', 'KeyZ'],
      ['p', 'polygon_zone', 'KeyP'],
      ['t', 'text', 'KeyT'],
      ['m', 'player', 'KeyM'],
      ['o', 'player-ring', 'KeyO'],
      ['e', 'eraser', 'KeyE'],
      ['v', 'select', 'KeyV'],
    ];

    for (const [key, tool, code] of toolMappings) {
      act(() => {
        fireEvent.keyDown(document, { key, code });
      });
      expect(store.getState().activeTool).toBe(tool);
    }
  });
});

describe('CanvasStageContainer Action & History Shortcuts', () => {
  it('編集・履歴ショートカット（Delete, Backspace, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+A, Escape）が動作すること', () => {
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
    renderWithStore(<CanvasStageContainer />, store);

    const spaceEvt = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(spaceEvt);
    });
    expect(spaceEvt.defaultPrevented).toBe(true);

    act(() => {
      store.getState().addArrow({
        id: 'arrow-del-1',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        color: '#ffffff',
        strokeWidth: 2,
        dashArray: [],
        arrowHead: true,
      });
      store.getState().selectObject({ id: 'arrow-del-1', kind: 'arrow' });
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'Delete', code: 'Delete' });
    });
    expect(store.getState().annotations.arrows).toHaveLength(0);

    act(() => {
      fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
    });
    expect(store.getState().annotations.arrows).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });
    });
    expect(store.getState().annotations.arrows).toHaveLength(0);

    act(() => {
      fireEvent.keyDown(document, { key: 'y', code: 'KeyY', ctrlKey: true });
    });
    expect(store.getState().annotations.arrows).toHaveLength(0);

    act(() => {
      fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
    });
    expect(store.getState().annotations.arrows).toHaveLength(1);

    act(() => {
      store.getState().selectObject({ id: 'arrow-del-1', kind: 'arrow' });
      fireEvent.keyDown(document, { key: 'Backspace', code: 'Backspace' });
    });
    expect(store.getState().annotations.arrows).toHaveLength(0);

    act(() => {
      store.getState().undo();
      store.getState().clearSelection();
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA', ctrlKey: true });
    });
    expect(store.getState().selectedObjects.length).toBeGreaterThan(0);

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });
    expect(store.getState().selectedObjects).toHaveLength(0);
    expect(store.getState().activeTool).toBe('select');
  });

  it('テキスト編集中（input/textarea）はショートカットが無視されること', () => {
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
    const { container } = renderWithStore(<CanvasStageContainer />, store);
    store.getState().setActiveTool('select');

    const textarea = document.createElement('textarea');
    container.appendChild(textarea);
    textarea.focus();

    act(() => {
      fireEvent.keyDown(textarea, { key: 'a' });
    });
    expect(store.getState().activeTool).toBe('select');
  });

  it('toolbar prop が渡されない場合はツールバーを描画せず、渡された場合にのみスロット描画すること', () => {
    const { container: emptyContainer } = renderWithStore(
      <CanvasStageContainer />,
    );
    expect(emptyContainer.querySelector('.shadow-2xl.rounded-xl')).toBeNull();

    const { getByTestId } = renderWithStore(
      <CanvasStageContainer
        toolbar={<div data-testid="custom-injected-toolbar">Toolbar</div>}
      />,
    );
    expect(getByTestId('custom-injected-toolbar')).toBeDefined();
  });
});

describe('CanvasStageContainer Fixed Stage Size & Dynamic PitchRect', () => {
  it('アスペクト比を 4:5, 9:16, 1:1, 16:9 に切り替えても Stage 外枠サイズがコンテナサイズ(800x450)のまま不変であること', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const onStageSizeChange = vi.fn();
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });

    const { rerender, container } = renderWithStore(
      <CanvasStageContainer
        nodesRegistryRef={registryRef}
        onStageSizeChange={onStageSizeChange}
      />,
      store,
    );

    const aspectRatios: ('4:5' | '9:16' | '1:1' | '16:9')[] = [
      '4:5',
      '9:16',
      '1:1',
      '16:9',
    ];

    for (const ratio of aspectRatios) {
      act(() => {
        store.getState().setAspectRatio(ratio);
      });
      rerender(
        <CanvasStoreContext.Provider value={store}>
          <CanvasStageContainer
            nodesRegistryRef={registryRef}
            onStageSizeChange={onStageSizeChange}
          />
        </CanvasStoreContext.Provider>,
      );

      // Stage のサイズが常にコンテナサイズ 800x450 であること
      expect(registryRef.current.stage?.width()).toBe(800);
      expect(registryRef.current.stage?.height()).toBe(450);

      const konvaContent = container.querySelector('.konvajs-content');
      expect(konvaContent?.getAttribute('style')).toContain('width: 800px');
      expect(konvaContent?.getAttribute('style')).toContain('height: 450px');
    }
  });
});

describe('CanvasStageContainer Full-Tactical Margin & PNG Export Offset', () => {
  it('full-tactical モード時に 16:9 でも上下左右に余白（vRect.x > 0, vRect.y > 0）が確保され、PNG エクスポートが vRect の位置で切り抜かれること', async () => {
    const handleRef = createRef<CanvasCoreHandle>();
    const registryRef = { current: createCanvasNodesRegistry() };
    const onStageSizeChange = vi.fn();
    const store = createCanvasStore({
      mode: 'full-tactical',
      aspectRatio: '16:9',
    });

    renderWithStore(
      <CanvasStageContainer
        ref={handleRef}
        nodesRegistryRef={registryRef}
        onStageSizeChange={onStageSizeChange}
      />,
      store,
    );

    expect(onStageSizeChange).toHaveBeenCalledWith({ width: 704, height: 396 });

    const stage = registryRef.current.stage;
    expect(stage).toBeTruthy();
    const toDataURLSpy = vi.spyOn(stage!, 'toDataURL');

    await handleRef.current?.exportPng({ crop: true, scale: 2 });

    expect(toDataURLSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 48,
        y: 27,
        width: 704,
        height: 396,
        pixelRatio: 2,
      }),
    );
  });
});
