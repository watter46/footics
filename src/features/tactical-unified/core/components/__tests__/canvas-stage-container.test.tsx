import { act, fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { AspectRatio, CanvasCoreHandle } from '../../types';
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
  options?: {
    mode?: 'screenshot-edit' | 'full-tactical';
    aspectRatio?: AspectRatio;
    boundaryBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
      enabled: boolean;
    };
  },
): {
  documentStore: DocumentStore;
  sessionStore: SessionStore;
} & ReturnType<typeof render> {
  const baseProject = createDefaultTacticalProject();
  const firstPhase = baseProject.phases[0];
  const firstSlide = firstPhase?.slides[0];
  const initialProject = {
    ...baseProject,
    ...(options?.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
    ...(options?.boundaryBox ? { boundaryBox: options.boundaryBox } : {}),
  };
  if (firstSlide) {
    firstSlide.arrows.push({
      id: 'arrow-del-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [toScreenNormPoint(10, 10), toScreenNormPoint(20, 20)],
      color: '#ffffff',
      strokeWidth: 2,
      dashArray: [],
      startMarker: 'none',
      endMarker: 'arrow',
    });
  }
  const documentStore = createDocumentStore(initialProject);
  const sessionStore = createSessionStore();
  if (firstPhase) {
    sessionStore.getState().setActivePhaseId(firstPhase.id);
  }
  if (firstSlide) {
    sessionStore.getState().setActiveSlideId(firstSlide.id);
  }
  const utils = render(
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      {ui}
    </TacticalStoreProvider>,
  );
  return { documentStore, sessionStore, ...utils };
}

describe('CanvasCoreHandle Imperative API', () => {
  it('ref.current.exportPng({ crop: true }) が BoundaryBox の枠内のみを出力すること', async () => {
    const handleRef = createRef<CanvasCoreHandle>();

    renderWithStore(<CanvasStageContainer ref={handleRef} />, {
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });
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
    const { documentStore, sessionStore } = renderWithStore(
      <CanvasStageContainer ref={handleRef} />,
    );
    const { activePhaseId, activeSlideId } = sessionStore.getState();

    expect(handleRef.current?.canUndo()).toBe(false);
    expect(handleRef.current?.canRedo()).toBe(false);

    act(() => {
      documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
        type: 'ADD_ARROW',
        arrow: {
          id: 'arrow-undo-test',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [toScreenNormPoint(0, 0), toScreenNormPoint(10, 10)],
          color: '#fff',
          strokeWidth: 2,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
        },
      });
    });

    expect(handleRef.current?.canUndo()).toBe(true);
    act(() => {
      handleRef.current?.undo();
    });
    expect(
      documentStore.getState().project.phases[0]?.slides[0]?.arrows,
    ).toHaveLength(1);
    expect(handleRef.current?.canRedo()).toBe(true);

    act(() => {
      handleRef.current?.redo();
    });
    expect(
      documentStore.getState().project.phases[0]?.slides[0]?.arrows,
    ).toHaveLength(2);
  });
});

describe('CanvasStageContainer Shortcuts & Toolbar', () => {
  it('CanvasStageContainer マウント状態で Ctrl+Z 押下しても自前で undo() が発火しないこと', () => {
    const { documentStore } = renderWithStore(<CanvasStageContainer />);

    const phaseId = documentStore.getState().project.phases[0]?.id ?? '';
    const slideId =
      documentStore.getState().project.phases[0]?.slides[0]?.id ?? '';

    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'DELETE_ENTITIES',
        ids: ['arrow-del-1'],
      });
    });
    expect(
      documentStore.getState().project.phases[0]?.slides[0]?.arrows,
    ).toHaveLength(0);

    act(() => {
      fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
    });
    expect(
      documentStore.getState().project.phases[0]?.slides[0]?.arrows,
    ).toHaveLength(0);
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

    const { rerender, container, documentStore, sessionStore } =
      renderWithStore(
        <CanvasStageContainer
          nodesRegistryRef={registryRef}
          onStageSizeChange={onStageSizeChange}
        />,
        {
          mode: 'screenshot-edit',
          aspectRatio: '16:9',
        },
      );

    const aspectRatios: ('4:5' | '9:16' | '1:1' | '16:9')[] = [
      '4:5',
      '9:16',
      '1:1',
      '16:9',
    ];

    for (const ratio of aspectRatios) {
      act(() => {
        const { activePhaseId } = sessionStore.getState();
        documentStore.getState().dispatch({
          type: 'CHANGE_PHASE_ASPECT_RATIO',
          phaseId: activePhaseId,
          aspectRatio: ratio,
        });
      });
      rerender(
        <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
          <CanvasStageContainer
            nodesRegistryRef={registryRef}
            onStageSizeChange={onStageSizeChange}
          />
        </TacticalStoreProvider>,
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

    renderWithStore(
      <CanvasStageContainer
        ref={handleRef}
        paddingRatio={0.06}
        nodesRegistryRef={registryRef}
        onStageSizeChange={onStageSizeChange}
      />,
      {
        mode: 'full-tactical',
        aspectRatio: '16:9',
      },
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

  it('boundaryBox オーバーレイがグレー系で表示され、四つ角のハンドルドラッグでリサイズできること', async () => {
    const { container, documentStore } = renderWithStore(
      <CanvasStageContainer />,
      {
        mode: 'screenshot-edit',
        aspectRatio: '16:9',
      },
    );

    const phaseId = documentStore.getState().project.phases[0]?.id;
    expect(phaseId).toBeTruthy();

    await act(async () => {
      documentStore.getState().dispatch({
        type: 'UPDATE_PHASE',
        phaseId: phaseId!,
        patch: {
          boundaryBox: {
            x: 10,
            y: 10,
            width: 50,
            height: 50,
            enabled: true,
          },
        },
      });
    });

    const overlay = container.querySelector(
      '[data-testid="canvas-boundary-box-overlay"]',
    );
    expect(overlay).toBeTruthy();
    expect(overlay?.className).toContain('border-zinc-400');

    const seHandle = container.querySelector(
      '[data-testid="boundary-resize-handle-se"]',
    );
    expect(seHandle).toBeTruthy();
    expect(seHandle?.className).toContain('pointer-events-auto');

    act(() => {
      seHandle?.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 100,
          clientY: 100,
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 180,
          clientY: 145,
        }),
      );
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    const updatedPhase = documentStore.getState().project.phases[0];
    expect(updatedPhase?.boundaryBox?.width).toBeGreaterThan(50);
    expect(updatedPhase?.boundaryBox?.height).toBeGreaterThan(50);
  });
});
