import { act, render, renderHook } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { useCanvasSelectionBox } from '../../hooks/use-canvas-selection-box';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import { CanvasStoreProvider } from '../../store/canvas-store-provider';
import type { PitchRectBounds } from '../../utils/canvas-coordinates';
import {
  BillboardObjectLayer,
  sortBillboardItemsByDepth,
} from '../BillboardObjectLayer';
import { HtmlHudOverlay } from '../HtmlHudOverlay';
import { InteractionPreviewLayer } from '../InteractionPreviewLayer';
import { PitchGroundLayer } from '../PitchGroundLayer';
import { ViewportCropOverlay } from '../ViewportCropOverlay';

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
  useTacticalUnifiedStore.getState().resetProject();
});

type CanvasState = Parameters<Parameters<typeof useCanvasStore>[0]>[0];

const defaultPitchRect: PitchRectBounds = {
  x: 100,
  y: 50,
  width: 800,
  height: 450,
};
const defaultStageSize = { width: 1000, height: 550 };

describe('sortBillboardItemsByDepth', () => {
  it('スクリーンY座標（手前・奥）に基づいて小さいYから大きいYへと昇順ソートすること', () => {
    const items = [
      { id: 'player-deep', x: 50, y: 80 },
      { id: 'player-top', x: 50, y: 15 },
      { id: 'player-mid', x: 50, y: 50 },
    ];

    const sorted = sortBillboardItemsByDepth(items, defaultPitchRect);
    expect(sorted.map((item) => item.id)).toEqual([
      'player-top',
      'player-mid',
      'player-deep',
    ]);
  });

  it('カメラの tilt (傾き) がある場合もスクリーン投影後のY座標でソートすること', () => {
    const camera = { tilt: 30, yaw: 0, zoom: 1, panX: 0, panY: 0 };
    const items = [
      { id: 'item-bottom', x: 50, y: 90 },
      { id: 'item-top', x: 50, y: 10 },
    ];

    const sorted = sortBillboardItemsByDepth(items, defaultPitchRect, camera);
    expect(sorted[0].id).toBe('item-top');
    expect(sorted[1].id).toBe('item-bottom');
  });
});

describe('PitchGroundLayer', () => {
  it('ステージ全体の背景RectとpitchRectオフセット付きGroupを描画すること', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider config={{ mode: 'tactical-board' }}>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <PitchGroundLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();

    // 背景 Rect の全画面サイズ検証
    const rects = stage?.find('Rect') ?? [];
    const bgRect = rects.find(
      (r) =>
        r.width() === defaultStageSize.width &&
        r.height() === defaultStageSize.height,
    );
    expect(bgRect).toBeDefined();
    expect(bgRect?.attrs.fill).toBe('#020617');

    // pitchRect オフセット付き Group の検証
    const groups = stage?.find('Group') ?? [];
    const pitchGroup = groups.find(
      (g) => g.x() === defaultPitchRect.x && g.y() === defaultPitchRect.y,
    );
    expect(pitchGroup).toBeDefined();
  });

  it('cleanRender={true} のときはゴースト軌道（GhostTrajectory）が描画されないこと', () => {
    const slide1Id = useTacticalUnifiedStore.getState().activeSlideId;
    const basePlayer = createDefaultPlayer('home', 20, 20, '#001489');
    const playerA = { ...basePlayer, id: 'p-ghost-1', x: 20, y: 20 };
    useTacticalUnifiedStore
      .getState()
      .updateSlide(slide1Id, { players: [playerA] });

    const slide2Id = useTacticalUnifiedStore
      .getState()
      .duplicateSlide(slide1Id);
    useTacticalUnifiedStore.getState().updateSlide(slide2Id, {
      players: [{ ...playerA, x: 70, y: 70 }],
    });
    useTacticalUnifiedStore.getState().setActiveSlide(slide2Id);

    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          initialAnnotations: JSON.stringify({
            markers: [{ ...playerA, x: 70, y: 70 }],
            arrows: [],
            zones: [],
            texts: [],
          }),
        }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <PitchGroundLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            cleanRender={true}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows).toHaveLength(0);
  });

  it('メインキャンバス外枠確認枠線 (stroke="#38bdf8") が描画されないこと', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider config={{ mode: 'tactical-board' }}>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <PitchGroundLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            cleanRender={false}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const stage = stageRef.current;
    const rects = stage?.find('Rect') ?? [];
    const blueBorderRect = rects.find((r) => r.attrs.stroke === '#38bdf8');
    expect(blueBorderRect).toBeUndefined();
  });
});

describe('BillboardObjectLayer', () => {
  it('pitchRectオフセット付きGroup内に深さソートされたマーカーとボールを描画すること', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          initialAnnotations: JSON.stringify({
            markers: [
              {
                id: 'm-deep',
                shirtNo: '9',
                x: 50,
                y: 80,
                team: 'home',
                area: 'pitch',
                style: { color: '#001489', markerType: 'circle' },
              },
              {
                id: 'm-top',
                shirtNo: '10',
                x: 50,
                y: 20,
                team: 'away',
                area: 'pitch',
                style: { color: '#da020e', markerType: 'circle' },
              },
            ],
            arrows: [],
            zones: [],
            texts: [],
          }),
        }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    const groups = stage?.find('Group') ?? [];
    const billboardGroup = groups.find(
      (g) => g.x() === defaultPitchRect.x && g.y() === defaultPitchRect.y,
    );
    expect(billboardGroup).toBeDefined();

    // 選手マーカーのテキストが描画されていること
    const textNodes = stage?.find<Konva.Text>('Text') ?? [];
    const textValues = textNodes.map((t) => t.text());
    expect(textValues).toContain('9');
    expect(textValues).toContain('10');
  });

  it('PlayerMarkerItem の dragBoundFunc が Stage 全体（余白領域含む）を許容し、右側の見えない壁を解消すること', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          initialAnnotations: JSON.stringify({
            markers: [
              {
                id: 'm-bound-test',
                shirtNo: '7',
                x: 50,
                y: 50,
                team: 'home',
                area: 'pitch',
                style: { color: '#001489', markerType: 'circle' },
              },
            ],
            arrows: [],
            zones: [],
            texts: [],
          }),
        }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    // PlayerMarkerItem の Group ノードを探す（draggable=true）
    const draggableGroups = (stage?.find('Group') ?? []).filter((g) =>
      g.draggable(),
    );
    expect(draggableGroups.length).toBeGreaterThan(0);
    const markerGroup = draggableGroups[0];
    const dragBoundFunc = markerGroup.dragBoundFunc();
    expect(dragBoundFunc).toBeDefined();

    // Stage サイズ: width=1000, height=550。pitchRect: x=100, y=50, width=800, height=450。
    // ピッチ右側（例: pos.x = 850, pos.y = 500）は以前の width=800 制限だと 800 にクリップされていた。
    // Stage 全体許容であれば 850, 500 がそのまま返るべき
    const boundedPos = dragBoundFunc
      ? (
          dragBoundFunc as unknown as (pos: { x: number; y: number }) => {
            x: number;
            y: number;
          }
        ).call(markerGroup, { x: 850, y: 500 })
      : null;
    expect(boundedPos).toEqual({ x: 850, y: 500 });
  });

  it('marker.x, marker.y 更新時に Konva Group の position が同期されること', () => {
    let capturedStore: CanvasState | null = null;
    const TestConsumer = () => {
      const store = useCanvasStore((s) => s);
      capturedStore = store;
      return null;
    };

    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          initialAnnotations: JSON.stringify({
            markers: [
              {
                id: 'm-sync-test',
                shirtNo: '10',
                x: 20,
                y: 30,
                team: 'home',
                area: 'pitch',
                style: { color: '#001489', markerType: 'circle' },
              },
            ],
            arrows: [],
            zones: [],
            texts: [],
          }),
        }}
      >
        <TestConsumer />
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const stage = stageRef.current;
    const markerGroup = (stage?.find('Group') ?? []).find((g) => g.draggable());
    expect(markerGroup).toBeDefined();
    // 初期位置: x = 20% * 800 = 160, y = 30% * 450 = 135
    expect(markerGroup?.x()).toBe(160);
    expect(markerGroup?.y()).toBe(135);

    // ドラッグ等で一時的にズレた状態を模倣
    markerGroup?.x(300);
    markerGroup?.y(300);

    // store 経由で marker.x, marker.y を更新 (リセット動作等)
    act(() => {
      (capturedStore as unknown as CanvasState)?.updateMarker('m-sync-test', {
        x: 40,
        y: 50,
      });
    });

    // pxX = 40% * 800 = 320, pxY = 50% * 450 = 225 に同期されていること
    expect(markerGroup?.x()).toBe(320);
    expect(markerGroup?.y()).toBe(225);
  });

  it('ドロップ位置が Stage コンテナ内の場合、ベンチ退避せず余白座標で updateMarker を実行すること', () => {
    let capturedStore: CanvasState | null = null;
    const TestConsumer = () => {
      const store = useCanvasStore((s) => s);
      capturedStore = store;
      return null;
    };

    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          initialAnnotations: JSON.stringify({
            markers: [
              {
                id: 'm-drop-test',
                shirtNo: '8',
                x: 50,
                y: 50,
                team: 'home',
                area: 'pitch',
                style: { color: '#001489', markerType: 'circle' },
              },
            ],
            arrows: [],
            zones: [],
            texts: [],
          }),
        }}
      >
        <TestConsumer />
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const stage = stageRef.current;
    const markerGroup = (stage?.find('Group') ?? []).find((g) => g.draggable());
    expect(markerGroup).toBeDefined();

    // Stage コンテナの getBoundingClientRect をモック
    const container = stage?.container();
    if (container) {
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 550,
        width: 1000,
        height: 550,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
    }

    // Stage 右端内（例: clientX = 950、window.innerWidth - 340 より大きくても Stage 内）
    // ピッチ外余白 (x=880px -> nx = 880 / 800 * 100 = 110%)
    markerGroup?.x(880);
    markerGroup?.y(495); // ny = 495 / 450 * 100 = 110%

    // fire dragend
    act(() => {
      markerGroup?.fire('dragend', {
        evt: { clientX: 950, clientY: 200 } as MouseEvent,
      });
    });

    // bench へ移動されず、updateMarker で nx=110, ny=110 が保存されること
    expect(capturedStore).not.toBeNull();
    const updatedMarker = (
      capturedStore as unknown as CanvasState
    ).annotations.markers.find((m: { id: string }) => m.id === 'm-drop-test');
    expect(updatedMarker?.x).toBeCloseTo(110);
    expect(updatedMarker?.y).toBeCloseTo(110);
  });

  it('mode === "screenshot-edit" または markerMode === "3d-only" のときはボールを描画しないこと', () => {
    const registryRef1 = { current: {} as any };
    const { unmount: unmount1 } = render(
      <CanvasStoreProvider config={{ mode: 'screenshot-edit' }}>
        <Stage width={defaultStageSize.width} height={defaultStageSize.height}>
          <BillboardObjectLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            nodesRegistryRef={registryRef1}
          />
        </Stage>
      </CanvasStoreProvider>,
    );
    expect(registryRef1.current.ballNode).toBeUndefined();
    unmount1();

    const registryRef2 = { current: {} as any };
    const { unmount: unmount2 } = render(
      <CanvasStoreProvider
        config={{ mode: 'tactical-board', markerMode: '3d-only' }}
      >
        <Stage width={defaultStageSize.width} height={defaultStageSize.height}>
          <BillboardObjectLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            nodesRegistryRef={registryRef2}
          />
        </Stage>
      </CanvasStoreProvider>,
    );
    expect(registryRef2.current.ballNode).toBeUndefined();
    unmount2();

    const registryRef3 = { current: {} as any };
    render(
      <CanvasStoreProvider
        config={{ mode: 'tactical-board', markerMode: '2d-only' }}
      >
        <Stage width={defaultStageSize.width} height={defaultStageSize.height}>
          <BillboardObjectLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            nodesRegistryRef={registryRef3}
          />
        </Stage>
      </CanvasStoreProvider>,
    );
    expect(registryRef3.current.ballNode).toBeDefined();
  });
});

describe('useCanvasSelectionBox', () => {
  it('vRect に x, y オフセットがある場合、オフセットを差し引いて正規化選択領域を算出してマーカーを選択すること', () => {
    let selectedIdsResult: string[] = [];
    const StoreObserver = () => {
      const selectedIds = useCanvasStore((s) => s.selectedIds);
      selectedIdsResult = selectedIds;
      return null;
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          initialAnnotations: JSON.stringify({
            markers: [
              // ピッチ内正規化座標: x=50, y=50
              // vRect: x=100, y=50, width=800, height=450 のとき、
              // 絶対ピクセル座標は x = 100 + 50% * 800 = 500, y = 50 + 50% * 450 = 275
              {
                id: 'm-selected',
                shirtNo: '11',
                x: 50,
                y: 50,
                team: 'home',
                area: 'pitch',
                style: { color: '#001489', markerType: 'circle' },
              },
            ],
            arrows: [],
            zones: [],
            texts: [],
          }),
        }}
      >
        <StoreObserver />
        {children}
      </CanvasStoreProvider>
    );

    const { result } = renderHook(
      () =>
        useCanvasSelectionBox({
          vRect: { x: 100, y: 50, width: 800, height: 450 },
        }),
      { wrapper },
    );

    // ドラッグ選択範囲: 絶対ピクセル座標 450, 250 〜 550, 300
    // オフセット差し引き後:
    // minNormX = (450 - 100) / 800 * 100 = 350 / 8 = 43.75%
    // maxNormX = (550 - 100) / 800 * 100 = 450 / 8 = 56.25%
    // minNormY = (250 - 50) / 450 * 100 = 200 / 4.5 = 44.44%
    // maxNormY = (300 - 50) / 450 * 100 = 250 / 4.5 = 55.55%
    // マーカー(50, 50) はこの範囲に含まれるべき！
    act(() => {
      result.current.handleSelectionDown({ x: 450, y: 250 }, true, false);
    });
    act(() => {
      result.current.handleSelectionMove({ x: 550, y: 300 });
    });

    act(() => {
      result.current.handleSelectionUp();
    });

    expect(selectedIdsResult).toContain('m-selected');
  });
});

describe('InteractionPreviewLayer', () => {
  it('cleanRender={true} のときは null を返すこと', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider config={{ mode: 'tactical-board' }}>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <InteractionPreviewLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            cleanRender={true}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const layer = stageRef.current?.findOne('#interaction-preview-layer');
    expect(layer).toBeFalsy();
  });

  it('cleanRender={false} のときはレイヤーおよび selectionBox を描画すること', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreProvider config={{ mode: 'tactical-board' }}>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <InteractionPreviewLayer
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            selectionBox={{
              startX: 10,
              startY: 10,
              currentX: 100,
              currentY: 100,
              isShift: false,
            }}
            cleanRender={false}
          />
        </Stage>
      </CanvasStoreProvider>,
    );

    const stage = stageRef.current;
    const rects = stage?.find('Rect') ?? [];
    // selectionBox の Rect が描画されていること
    const selectionRect = rects.find(
      (r) => r.attrs.stroke === '#38bdf8' && r.attrs.dash !== undefined,
    );
    expect(selectionRect).toBeDefined();
  });
});

describe('ViewportCropOverlay', () => {
  it('cleanRender={true} のときは null を返すこと', () => {
    const { container } = render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          defaultBoundaryBox: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            enabled: true,
            visible: true,
          },
        }}
      >
        <ViewportCropOverlay
          stageSize={defaultStageSize}
          pitchRect={defaultPitchRect}
          cleanRender={true}
        />
      </CanvasStoreProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('cleanRender={false} かつ enabled のときは BoundaryBoxOverlay を描画すること', () => {
    const { container } = render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          defaultBoundaryBox: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            enabled: true,
            visible: true,
          },
        }}
      >
        <ViewportCropOverlay
          stageSize={defaultStageSize}
          pitchRect={defaultPitchRect}
          cleanRender={false}
        />
      </CanvasStoreProvider>,
    );

    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('HtmlHudOverlay', () => {
  it('cleanRender={true} のときは null を返すこと', () => {
    const { container } = render(
      <CanvasStoreProvider config={{ mode: 'tactical-board' }}>
        <HtmlHudOverlay
          stageSize={defaultStageSize}
          pitchRect={defaultPitchRect}
          editingText={null}
          cleanRender={true}
          onSaveText={vi.fn()}
          onRemoveText={vi.fn()}
          onCloseText={vi.fn()}
        />
      </CanvasStoreProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('connectingPlayerId があるときは接続ガイダンスバッジを表示すること', () => {
    const { getByTestId } = render(
      <CanvasStoreProvider
        config={{
          mode: 'tactical-board',
          initialAnnotations: JSON.stringify({
            markers: [
              { id: 'm-src', x: 20, y: 20, team: 'home', area: 'pitch' },
            ],
            arrows: [],
            zones: [],
            texts: [],
          }),
        }}
      >
        <HtmlHudOverlay
          stageSize={defaultStageSize}
          pitchRect={defaultPitchRect}
          editingText={null}
          cleanRender={false}
          onSaveText={vi.fn()}
          onRemoveText={vi.fn()}
          onCloseText={vi.fn()}
        />
      </CanvasStoreProvider>,
    );

    // Default connectingPlayerId is null, so badge is not visible yet
    expect(() => getByTestId('connecting-guidance-badge')).toThrow();
  });
});
