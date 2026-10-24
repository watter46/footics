import { render } from '@testing-library/react';
import type Konva from 'konva';
import type React from 'react';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasStoreApi } from '../../types';
import { createCanvasNodesRegistry } from '../../utils/canvas-registry';
import { CanvasStageContainer } from '../CanvasStageContainer';
import { PlayerMarkerItem } from '../PlayerMarkerItem';

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

describe('Clean Render Propagation', () => {
  it('cleanRender=true 時に CanvasStageContainer で HUD や InteractionPreviewLayer が描画されないこと', () => {
    const registryRef = { current: createCanvasNodesRegistry() };
    const store = createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });

    const { container } = renderWithStore(
      <CanvasStageContainer
        nodesRegistryRef={registryRef}
        cleanRender={true}
      />,
      store,
    );

    const stage = registryRef.current.stage;
    expect(stage).toBeTruthy();

    // InteractionPreviewLayer は null になるため Stage 配下に存在しない
    const previewLayer = stage?.findOne('#interaction-preview-layer');
    expect(previewLayer).toBeUndefined();

    // HUD (ContextHud / BoundaryBoxHud) は DOM から描画されない
    const hudElement = container.querySelector('[data-testid="context-hud"]');
    expect(hudElement).toBeNull();
  });

  it('cleanRender=true 時に PlayerMarkerItem の draggable が false になり、選択状態・ハンドルが抑制されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#ff0000'),
      visionCone: {
        id: 'cone-1',
        visible: true,
        angleRad: 0,
        spreadRad: Math.PI / 4,
        radius: 20,
        color: '#ff0000',
        opacity: 0.3,
      },
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={800}
            height={450}
            baseDim={450}
            markerMode="2d-only"
            aspectRatio="16:9"
            isSelected={true}
            isInteractive={true}
            cleanRender={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const group = stageRef.current?.findOne('Group') as Konva.Group | null;
    expect(group).not.toBeNull();
    // cleanRender=true のため draggable は false
    expect(group?.draggable()).toBe(false);

    // cleanRender=true のため VisionCone のハンドル（PlayerVisionConeHandles）は非表示
    const handleCircles = stageRef.current?.find('.vision-cone-handle');
    expect(handleCircles?.length ?? 0).toBe(0);
  });
});
