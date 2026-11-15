import { render } from '@testing-library/react';
import Konva from 'konva';
import type React from 'react';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BallObject } from '@/features/tactical-unified/objects/ball/components/ball-object';
import type { BallObjectProps } from '@/features/tactical-unified/objects/ball/types';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type {
  ResolvedBillboardBallItem,
  ResolvedBillboardPlayerItem,
} from '@/lib/tactical/compiler/scene-graph-dto';
import type { ScreenNormCoord, StagePixel } from '@/lib/types/tactical/branded';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
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

function renderWithStore(ui: React.ReactElement) {
  const documentStore = createDocumentStore(createDefaultTacticalProject());
  const sessionStore = createSessionStore();
  const playbackStore = createPlaybackStore();
  const utils = render(
    <TacticalStoreProvider
      stores={{ documentStore, sessionStore, playbackStore }}
    >
      {ui}
    </TacticalStoreProvider>,
  );
  return { documentStore, sessionStore, playbackStore, ...utils };
}

describe('Clean Render Propagation', () => {
  it('cleanRender=true 時に CanvasStageContainer で HUD や InteractionPreviewLayer が描画されないこと', () => {
    const registryRef = { current: createCanvasNodesRegistry() };

    const { container, sessionStore } = renderWithStore(
      <CanvasStageContainer
        nodesRegistryRef={registryRef}
        cleanRender={true}
      />,
    );

    sessionStore.getState().selectObject({ kind: 'player', id: 'p1' });

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
            resolvedPlayer={{
              kind: 'player',
              id: marker.id,
              positionPx: { x: 400 as StagePixel, y: 225 as StagePixel },
              radiusPx: 14,
              depthSortKey: 225,
              opacity: 1,
              visible: true,
              selected: true,
              player: {
                ...marker,
                area: 'pitch' as const,
                x: marker.x as ScreenNormCoord,
                y: marker.y as ScreenNormCoord,
                trajectory: undefined,
              },
              rippleRingsPx: [],
            }}
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

  it('PlayerMarkerItem: cleanRender が true から false に切り替わると draggable が true に戻り、resolvedPlayer.positionPx 変更に Group 座標が追従すること', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = createDefaultPlayer('home', 50, 50, '#ff0000');

    const { rerender } = render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={800}
            height={450}
            baseDim={450}
            markerMode="2d-only"
            aspectRatio="16:9"
            isSelected={false}
            isInteractive={true}
            cleanRender={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
            resolvedPlayer={{
              kind: 'player',
              id: marker.id,
              positionPx: { x: 400 as StagePixel, y: 225 as StagePixel },
              radiusPx: 14,
              depthSortKey: 225,
              opacity: 1,
              visible: true,
              selected: true,
              player: {
                ...marker,
                area: 'pitch' as const,
                x: marker.x as ScreenNormCoord,
                y: marker.y as ScreenNormCoord,
                trajectory: undefined,
              },
              rippleRingsPx: [],
            }}
          />
        </Layer>
      </Stage>,
    );

    const group = stageRef.current?.findOne('Group') as Konva.Group | null;
    expect(group).not.toBeNull();
    expect(group?.draggable()).toBe(false);
    // 初期位置: (50 / 100) * 800 = 400, (50 / 100) * 450 = 225
    expect(group?.position()).toEqual({ x: 400, y: 225 });

    // cleanRender=false（再生終了または一時停止）かつ resolvedPlayer.positionPx 更新で再レンダリング
    rerender(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={800}
            height={450}
            baseDim={450}
            markerMode="2d-only"
            aspectRatio="16:9"
            isSelected={false}
            isInteractive={true}
            cleanRender={false}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
            resolvedPlayer={{
              kind: 'player',
              id: marker.id,
              positionPx: { x: 520 as StagePixel, y: 310 as StagePixel },
              radiusPx: 14,
              depthSortKey: 310,
              opacity: 1,
              visible: true,
              selected: true,
              player: {
                ...marker,
                area: 'pitch' as const,
                x: marker.x as ScreenNormCoord,
                y: marker.y as ScreenNormCoord,
                trajectory: undefined,
              },
              rippleRingsPx: [],
            }}
          />
        </Layer>
      </Stage>,
    );

    // Dumb View として draggable=true に戻り、resolvedPlayer.positionPx に追従する
    expect(group?.draggable()).toBe(true);
    expect(group?.position()).toEqual({ x: 520, y: 310 });
  });

  it('BallObject: cleanRender=true 時は draggable が false となり、ゴースト矢印が描画されないこと', () => {
    const stageRef = createRef<Konva.Stage>();
    const registryRef = { current: createCanvasNodesRegistry() };
    const ball: BallObjectProps['ball'] = {
      x: 50,
      y: 50,
      visible: true,
      locked: false,
    };
    const resolvedBall: ResolvedBillboardBallItem = {
      kind: 'ball',
      positionPx: { x: 400 as StagePixel, y: 225 as StagePixel },
      radiusPx: 12,
      visible: true,
      opacity: 1,
      depthSortKey: 0,
    };

    render(
      <TacticalStoreProvider>
        <Stage ref={stageRef} width={800} height={450}>
          <Layer>
            <BallObject
              ball={ball}
              resolvedBall={resolvedBall}
              stageSize={{ width: 800, height: 450 }}
              cleanRender={true}
              nodesRegistryRef={registryRef}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    const ballNode = registryRef.current.ballNode;
    expect(ballNode).toBeTruthy();
    expect(ballNode?.position()).toEqual({ x: 400, y: 225 });
    expect(ballNode?.draggable()).toBe(false);
    expect(stageRef.current?.find('Arrow')).toHaveLength(0);
  });

  it('BallObject: cleanRender=true で resolvedBall.positionPx を変更しても Konva.Tween が発火せず即座に新しい座標へ追従すること', () => {
    const tweenSpy = vi.spyOn(Konva, 'Tween');
    const stageRef = createRef<Konva.Stage>();
    const registryRef = { current: createCanvasNodesRegistry() };
    const ball: BallObjectProps['ball'] = {
      x: 50,
      y: 50,
      visible: true,
      locked: false,
    };
    const resolvedBall1: ResolvedBillboardBallItem = {
      kind: 'ball',
      positionPx: { x: 400 as StagePixel, y: 225 as StagePixel },
      radiusPx: 12,
      visible: true,
      opacity: 1,
      depthSortKey: 0,
    };
    const resolvedBall2: ResolvedBillboardBallItem = {
      kind: 'ball',
      positionPx: { x: 560 as StagePixel, y: 315 as StagePixel },
      radiusPx: 12,
      visible: true,
      opacity: 1,
      depthSortKey: 0,
    };

    const { rerender } = render(
      <TacticalStoreProvider>
        <Stage ref={stageRef} width={800} height={450}>
          <Layer>
            <BallObject
              ball={ball}
              resolvedBall={resolvedBall1}
              stageSize={{ width: 800, height: 450 }}
              cleanRender={true}
              nodesRegistryRef={registryRef}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    expect(tweenSpy).not.toHaveBeenCalled();
    expect(registryRef.current.ballNode?.position()).toEqual({
      x: 400,
      y: 225,
    });

    // 座標変更
    rerender(
      <TacticalStoreProvider>
        <Stage ref={stageRef} width={800} height={450}>
          <Layer>
            <BallObject
              ball={ball}
              resolvedBall={resolvedBall2}
              stageSize={{ width: 800, height: 450 }}
              cleanRender={true}
              nodesRegistryRef={registryRef}
            />
          </Layer>
        </Stage>
      </TacticalStoreProvider>,
    );

    expect(tweenSpy).not.toHaveBeenCalled();
    expect(registryRef.current.ballNode?.position()).toEqual({
      x: 560,
      y: 315,
    });
    tweenSpy.mockRestore();
  });
});
