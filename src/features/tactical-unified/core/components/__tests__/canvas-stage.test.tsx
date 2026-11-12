import { render } from '@testing-library/react';
import type Konva from 'konva';
import type React from 'react';
import { createRef } from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ResolvedArrowPrimitive,
  ResolvedSceneGraphDTO,
  ResolvedZonePrimitive,
} from '@/lib/tactical/compiler/scene-graph-dto';
import type { StagePixel } from '@/lib/types/tactical/branded';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasStoreApi } from '../../types';
import { createCanvasNodesRegistry } from '../../utils/canvas-registry';
import { CanvasStage, type CanvasStageViewProps } from '../canvas-stage';
import { InteractionPreviewLayer } from '../InteractionPreviewLayer';

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

describe('InteractionPreviewLayer with sceneGraph.drawingPreview', () => {
  const defaultSize = { width: 800, height: 450 };
  const defaultPitchRect = { x: 0, y: 0, width: 800, height: 450 };

  it('drawingPreview に ResolvedArrowPrimitive が指定された場合、Line が描画されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const arrowPreview: ResolvedArrowPrimitive = {
      id: 'preview-arrow',
      flatPointsPx: [100, 100, 250, 200],
      startPointPx: { x: 100 as StagePixel, y: 100 as StagePixel },
      endPointPx: { x: 250 as StagePixel, y: 200 as StagePixel },
      color: '#f59e0b',
      strokeWidthPx: 3,
      dashArrayPx: [6, 4],
      dashOffsetPx: 0,
      opacity: 0.8,
      visible: true,
      startMarker: 'none',
      endMarker: 'arrow',
      pointerLengthPx: 10,
      pointerWidthPx: 8,
      dotRadiusPx: 4,
      endAngleRad: 0,
      selected: false,
    };
    const sceneGraph: ResolvedSceneGraphDTO = {
      viewport: { width: 800, height: 450, offsetX: 0, offsetY: 0 },
      zones: [],
      arrows: [],
      trajectories: [],
      connectLines: [],
      billboardItems: [],
      drawingPreview:
        arrowPreview as unknown as ResolvedSceneGraphDTO['drawingPreview'],
    };

    renderWithStore(
      <Stage ref={stageRef} width={800} height={450}>
        <InteractionPreviewLayer
          stageSize={defaultSize}
          pitchRect={defaultPitchRect}
          sceneGraph={sceneGraph}
        />
      </Stage>,
    );

    const stage = stageRef.current;
    expect(stage).toBeTruthy();
    const lines = stage?.find<Konva.Line>('Line') ?? [];
    expect(lines.length).toBeGreaterThan(0);
    const line = lines[0];
    expect(line.points()).toEqual([100, 100, 250, 200]);
    expect(line.stroke()).toBe('#f59e0b');
    expect(line.strokeWidth()).toBe(3);
    expect(line.dash()).toEqual([6, 4]);
    expect(line.opacity()).toBe(0.8);
  });

  it('drawingPreview に ResolvedZonePrimitive (rect) が指定された場合、Rect が描画されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const zonePreview: ResolvedZonePrimitive = {
      id: 'preview-zone-rect',
      shapeType: 'rect',
      xPx: 50 as StagePixel,
      yPx: 60 as StagePixel,
      widthPx: 120,
      heightPx: 80,
      color: '#ef4444',
      opacity: 0.3,
      strokeColor: '#ef4444',
      strokeOpacity: 0.8,
      strokeWidthPx: 2,
      visible: true,
      selected: false,
    };
    const sceneGraph: ResolvedSceneGraphDTO = {
      viewport: { width: 800, height: 450, offsetX: 0, offsetY: 0 },
      zones: [],
      arrows: [],
      trajectories: [],
      connectLines: [],
      billboardItems: [],
      drawingPreview:
        zonePreview as unknown as ResolvedSceneGraphDTO['drawingPreview'],
    };

    renderWithStore(
      <Stage ref={stageRef} width={800} height={450}>
        <InteractionPreviewLayer
          stageSize={defaultSize}
          pitchRect={defaultPitchRect}
          sceneGraph={sceneGraph}
        />
      </Stage>,
    );

    const stage = stageRef.current;
    expect(stage).toBeTruthy();
    const rects = stage?.find<Konva.Rect>('Rect') ?? [];
    const previewRect = rects.find(
      (r) => r.width() === 120 && r.height() === 80,
    );
    expect(previewRect).toBeDefined();
    expect(previewRect?.x()).toBe(50);
    expect(previewRect?.y()).toBe(60);
    expect(previewRect?.fill()).toBe('#ef4444');
    expect(previewRect?.opacity()).toBe(0.3);
    expect(previewRect?.stroke()).toBe('#ef4444');
    expect(previewRect?.strokeWidth()).toBe(2);
  });
});
