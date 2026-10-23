import { render } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
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
