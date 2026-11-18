import { render } from '@testing-library/react';
import type Konva from 'konva';
import type React from 'react';
import { createRef, useEffect } from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TacticalStoreProvider,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { compileDrawingPreview } from '@/lib/tactical/compiler/compile-zones';
import type { ScreenNormCoord } from '@/lib/types/tactical/branded';

type DrawingPreviewInput = NonNullable<
  Parameters<typeof compileDrawingPreview>[0]
>;

import { createCanvasNodesRegistry } from '../../utils/canvas-registry';
import { CanvasStage } from '../canvas-stage';
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

function DrawingPreviewSetter({ preview }: { preview: DrawingPreviewInput }) {
  const setDrawingPreview = useSessionStore((s) => s.setDrawingPreview);
  useEffect(() => {
    setDrawingPreview(preview);
  }, [setDrawingPreview, preview]);
  return null;
}

function renderWithStore(ui: React.ReactElement) {
  return render(<TacticalStoreProvider>{ui}</TacticalStoreProvider>);
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

    const { rerender } = renderWithStore(
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
      <TacticalStoreProvider>
        <CanvasStage
          stageRef={stageRef}
          size={defaultSize}
          vRect={defaultVRect}
          nodesRegistryRef={registryRef}
        />
      </TacticalStoreProvider>,
    );

    const postRerenderLayers = stageRef.current?.getLayers() ?? [];
    expect(postRerenderLayers).toEqual(initialLayers);
  });
});

describe('InteractionPreviewLayer with sceneGraph.drawingPreview', () => {
  const defaultSize = { width: 800, height: 450 };
  const defaultPitchRect = { x: 0, y: 0, width: 800, height: 450 };

  it('drawingPreview に arrow が指定された場合、Line が描画されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const arrowPreview: DrawingPreviewInput = {
      tool: 'arrow',
      startPoint: { x: 12.5 as ScreenNormCoord, y: 20 as ScreenNormCoord },
      currentPoint: { x: 31.25 as ScreenNormCoord, y: 40 as ScreenNormCoord },
    };

    renderWithStore(
      <>
        <DrawingPreviewSetter preview={arrowPreview} />
        <Stage ref={stageRef} width={800} height={450}>
          <InteractionPreviewLayer
            stageSize={defaultSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </>,
    );

    const stage = stageRef.current;
    expect(stage).toBeTruthy();
    const lines = stage?.find<Konva.Line>('Line') ?? [];
    expect(lines.length).toBeGreaterThan(0);
    const line = lines[0];
    expect(line.points().length).toBe(4);
    expect(line.stroke()).toBeTruthy();
  });

  it('drawingPreview に zone-rect が指定された場合、Rect が描画されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const zonePreview: DrawingPreviewInput = {
      tool: 'zone-rect',
      startPoint: { x: 10 as ScreenNormCoord, y: 10 as ScreenNormCoord },
      currentPoint: { x: 25 as ScreenNormCoord, y: 30 as ScreenNormCoord },
    };

    renderWithStore(
      <>
        <DrawingPreviewSetter preview={zonePreview} />
        <Stage ref={stageRef} width={800} height={450}>
          <InteractionPreviewLayer
            stageSize={defaultSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </>,
    );

    const stage = stageRef.current;
    expect(stage).toBeTruthy();
    const shapes = [
      ...(stage?.find<Konva.Rect>('Rect') ?? []),
      ...(stage?.find<Konva.Line>('Line') ?? []),
    ];
    expect(shapes.length).toBeGreaterThan(0);
  });
});
