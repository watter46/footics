import { act, render, renderHook } from '@testing-library/react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { createRef, type ReactNode } from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileConnectLines } from '@/lib/tactical/compiler/compile-arrows';
import type { ResolvedPlayerInternal } from '@/lib/tactical/compiler/compile-billboards';
import type {
  ResolvedBillboardPlayerItem,
  ResolvedConnectLinePrimitive,
} from '@/lib/tactical/compiler/scene-graph-dto';
import {
  toScreenNormCoord,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { PlayerConnectLines } from '../PlayerConnectLines';
import { useMarkerDragHandlers } from '../use-marker-drag-handlers';

describe('PlayerConnectLines', () => {
  it('resolvedConnectLines の線座標・色・破線・クリック選択コールバックが反映される', () => {
    const stageRef = createRef<Konva.Stage>();
    const nodeMapRef = { current: new Map<string, Konva.Line>() };
    const onSelectConnectLine = vi.fn();

    const resolvedConnectLines: ResolvedConnectLinePrimitive[] = [
      {
        id: 'cl-1',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        flatPointsPx: [100, 120, 300, 240],
        color: '#22c55e',
        strokeWidthPx: 3,
        dashArrayPx: [8, 4],
        visible: true,
      },
      {
        id: 'cl-hidden',
        fromPlayerId: 'p1',
        toPlayerId: 'p3',
        flatPointsPx: [100, 120, 400, 300],
        color: '#ef4444',
        strokeWidthPx: 2,
        dashArrayPx: [],
        visible: false,
      },
    ];

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerConnectLines
            selectedIds={[]}
            isInteractive={true}
            connectLineNodesRef={nodeMapRef}
            onSelectConnectLine={onSelectConnectLine}
            resolvedConnectLines={resolvedConnectLines}
          />
        </Layer>
      </Stage>,
    );

    const line = nodeMapRef.current.get('cl-1');
    expect(line).toBeDefined();
    expect(line?.points()).toEqual([100, 120, 300, 240]);
    expect(line?.stroke()).toBe('#22c55e');
    expect(line?.strokeWidth()).toBe(3);
    expect(line?.dash()).toEqual([8, 4]);
    expect(line?.opacity()).toBeCloseTo(0.85);

    expect(nodeMapRef.current.get('cl-hidden')).toBeUndefined();

    line?.fire('click', { cancelBubble: false });
    expect(onSelectConnectLine).toHaveBeenCalledWith('cl-1', 'p1');
  });

  it('selectedIds に含まれる連結線はハイライト色・太さ+1・opacity=1 で描画される', () => {
    const stageRef = createRef<Konva.Stage>();
    const nodeMapRef = { current: new Map<string, Konva.Line>() };

    const resolvedConnectLines: ResolvedConnectLinePrimitive[] = [
      {
        id: 'cl-selected',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        flatPointsPx: [50, 60, 250, 160],
        color: '#ffffff',
        strokeWidthPx: 4,
        dashArrayPx: [],
        visible: true,
      },
    ];

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerConnectLines
            selectedIds={['cl-selected']}
            isInteractive={true}
            connectLineNodesRef={nodeMapRef}
            onSelectConnectLine={vi.fn()}
            resolvedConnectLines={resolvedConnectLines}
          />
        </Layer>
      </Stage>,
    );

    const line = nodeMapRef.current.get('cl-selected');
    expect(line).toBeDefined();
    expect(line?.stroke()).toBe('#60a5fa');
    expect(line?.strokeWidth()).toBe(5);
    expect(line?.opacity()).toBe(1);
    expect(line?.dash()).toBeUndefined();
  });
});

describe('compileConnectLines', () => {
  it('billboardPlayers と resolvedPlayersMap から ResolvedConnectLinePrimitive[] を生成する', () => {
    const p1 = {
      ...createDefaultPlayer('home', 20, 20, '#034694'),
      id: 'p1',
      area: 'pitch' as const,
      x: toScreenNormCoord(20),
      y: toScreenNormCoord(20),
      trajectory: undefined,
      connectLines: [
        {
          id: 'cl-dashed',
          toPlayerId: 'p2',
          lineStyle: 'dashed' as const,
          color: '#22c55e',
          strokeWidth: 4,
          visible: true,
        },
        {
          id: 'cl-missing-target',
          toPlayerId: 'p-missing',
          lineStyle: 'solid' as const,
          color: '#ffffff',
          strokeWidth: 2,
          visible: true,
        },
      ],
    };
    const p2 = {
      ...createDefaultPlayer('home', 80, 80, '#034694'),
      id: 'p2',
      area: 'pitch' as const,
      x: toScreenNormCoord(80),
      y: toScreenNormCoord(80),
      trajectory: undefined,
    };

    const p1Pos = toStagePixelPoint(160, 90);
    const p2Pos = toStagePixelPoint(640, 360);

    const billboardPlayers: ResolvedBillboardPlayerItem[] = [
      {
        kind: 'player',
        id: 'p1',
        player: p1,
        positionPx: p1Pos,
        radiusPx: 20,
        depthSortKey: 90,
        opacity: 1,
        visible: true,
        selected: false,
        rippleRingsPx: [],
      },
    ];

    const resolvedPlayersMap = new Map<string, ResolvedPlayerInternal>([
      [
        'p1',
        {
          player: p1,
          screenNormPos: toScreenNormPoint(20, 20),
          positionPx: p1Pos,
          radiusPx: 20,
          depthSortKey: 90,
          opacity: 1,
          visible: true,
          selected: false,
          rippleRingsPx: [],
        },
      ],
      [
        'p2',
        {
          player: p2,
          screenNormPos: toScreenNormPoint(80, 80),
          positionPx: p2Pos,
          radiusPx: 20,
          depthSortKey: 360,
          opacity: 1,
          visible: true,
          selected: false,
          rippleRingsPx: [],
        },
      ],
    ]);

    const result = compileConnectLines(billboardPlayers, resolvedPlayersMap, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'cl-dashed',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      flatPointsPx: [160, 90, 640, 360],
      color: '#22c55e',
      strokeWidthPx: 4,
      dashArrayPx: [8, 6],
      visible: true,
    });
  });
});

describe('useMarkerDragHandlers', () => {
  it('ドラッグ移動中に sessionStore.activeDragDelta を更新し、ドラッグ終了時に null にリセットする', () => {
    const p1 = {
      ...createDefaultPlayer('home', 20, 30, '#034694'),
      id: 'p1',
      area: 'pitch' as const,
      x: toScreenNormCoord(20),
      y: toScreenNormCoord(30),
      trajectory: undefined,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TacticalStoreProvider>{children}</TacticalStoreProvider>
    );

    const { result } = renderHook(
      () => {
        const stores = useTacticalStoresContext();
        const handlers = useMarkerDragHandlers({
          pitchRect: { x: 0, y: 0, width: 1000, height: 500 },
          visibleMarkers: [p1],
          arrows: [],
          selectedIds: ['p1'],
          selectObject: vi.fn(),
          updateMarker: vi.fn(),
          updateMarkers: vi.fn(),
          setIsDragging: vi.fn(),
          setIsHudOpen: vi.fn(),
        });
        return { stores, handlers };
      },
      { wrapper },
    );

    const createDragEvent = (x: number, y: number) =>
      ({
        evt: { shiftKey: false, clientX: x, clientY: y },
        target: {
          x: () => x,
          y: () => y,
          getLayer: () => ({ batchDraw: vi.fn() }),
          getStage: () => ({
            container: () => ({
              getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 1000,
                height: 500,
              }),
            }),
          }),
        },
      }) as unknown as KonvaEventObject<DragEvent>;

    act(() => {
      result.current.handlers.handleDragStart(createDragEvent(200, 150), 'p1');
      // Move from (200, 150) [20%, 30%] to (350, 200) [35%, 40%] -> delta (+15%, +10%)
      result.current.handlers.handleMarkerDragMove(
        createDragEvent(350, 200),
        'p1',
      );
    });

    const deltaDuringDrag =
      result.current.stores.sessionStore.getState().activeDragDelta;
    expect(deltaDuringDrag).toEqual({
      entityIds: ['p1'],
      deltaScreenNormX: 15,
      deltaScreenNormY: 10,
    });

    act(() => {
      result.current.handlers.handleDragEnd(createDragEvent(350, 200), p1);
    });

    expect(
      result.current.stores.sessionStore.getState().activeDragDelta,
    ).toBeNull();
  });
});
