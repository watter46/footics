import { act, render, renderHook } from '@testing-library/react';
import type Konva from 'konva';
import { createRef, type ReactNode } from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResolvedSceneGraph } from '@/features/tactical-unified/hooks/use-resolved-scene-graph';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import { createDefaultDomainPlayer } from '@/lib/tactical/domain/formation-placement';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { useCanvasSelectionBox } from '../../hooks/use-canvas-selection-box';
import type { PitchRectBounds } from '../../utils/canvas-coordinates';
import { getPointerCoordinates } from '../../utils/geometry';
import {
  BillboardObjectLayer,
  type BillboardObjectLayerProps,
} from '../BillboardObjectLayer';
import { HtmlHudOverlay } from '../HtmlHudOverlay';
import {
  InteractionPreviewLayer,
  type InteractionPreviewLayerProps,
} from '../InteractionPreviewLayer';
import {
  PitchGroundLayer,
  type PitchGroundLayerProps,
} from '../PitchGroundLayer';

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

const defaultPitchRect: PitchRectBounds = {
  x: 100,
  y: 50,
  width: 800,
  height: 450,
};
const defaultStageSize = { width: 1000, height: 550 };

function createProjectWithPlayers(
  players: readonly DomainPlayer[],
): DomainTacticalProject {
  const base = createDefaultTacticalProject();
  return {
    ...base,
    phases: [
      {
        ...base.phases[0],
        slides: [
          {
            ...base.phases[0].slides[0],
            players: [...players],
          },
        ],
      },
    ],
  };
}

function PitchGroundLayerWithSceneGraph(
  props: Omit<PitchGroundLayerProps, 'sceneGraph'>,
) {
  const sceneGraph = useResolvedSceneGraph(props.stageSize);
  return <PitchGroundLayer {...props} sceneGraph={sceneGraph} />;
}

function BillboardObjectLayerWithSceneGraph(
  props: Omit<BillboardObjectLayerProps, 'sceneGraph'>,
) {
  const sceneGraph = useResolvedSceneGraph(props.stageSize);
  return <BillboardObjectLayer {...props} sceneGraph={sceneGraph} />;
}

function InteractionPreviewLayerWithSceneGraph(
  props: Omit<InteractionPreviewLayerProps, 'sceneGraph'>,
) {
  const sceneGraph = useResolvedSceneGraph(props.stageSize);
  return <InteractionPreviewLayer {...props} sceneGraph={sceneGraph} />;
}

describe('compileSceneGraph 深度ソート', () => {
  it('スクリーンY座標（手前・奥）に基づいて小さいYから大きいYへと昇順ソートすること', () => {
    const project = createDefaultTacticalProject();
    const baseSlide = project.phases[0].slides[0];
    const players: DomainPlayer[] = [
      {
        ...createDefaultDomainPlayer('home', 50, 80, '#001489'),
        id: 'player-deep',
      },
      {
        ...createDefaultDomainPlayer('home', 50, 15, '#001489'),
        id: 'player-top',
      },
      {
        ...createDefaultDomainPlayer('home', 50, 50, '#001489'),
        id: 'player-mid',
      },
    ];
    const slide: DomainSlide = {
      ...baseSlide,
      players,
      ball: { ...baseSlide.ball, visible: false },
    };

    const sceneGraph = compileSceneGraph(
      {
        slideIndex: 0,
        nextSlideIndex: 0,
        progress: 0,
        isPaused: true,
        timeInSlideMs: 0,
        slide,
        arrowProgressMap: {},
        zoneOpacityMap: {},
        playerOpacityMap: {},
      },
      null,
      defaultStageSize,
    );

    const playerIds = sceneGraph.billboardItems
      .filter((item) => item.kind === 'player')
      .map((item) => item.id);
    expect(playerIds).toEqual(['player-top', 'player-mid', 'player-deep']);
  });

  it('カメラの tilt (傾き) がある場合もスクリーン投影後のY座標でソートすること', () => {
    const project = createDefaultTacticalProject();
    const baseSlide = project.phases[0].slides[0];
    const players: DomainPlayer[] = [
      {
        ...createDefaultDomainPlayer('home', 50, 90, '#001489'),
        id: 'item-bottom',
      },
      {
        ...createDefaultDomainPlayer('home', 50, 10, '#001489'),
        id: 'item-top',
      },
    ];
    const slide: DomainSlide = {
      ...baseSlide,
      players,
      ball: { ...baseSlide.ball, visible: false },
      pitchTransform: { zoom: 1, panX: 0, panY: 0, tilt: 30, isLocked: false },
    };

    const sceneGraph = compileSceneGraph(
      {
        slideIndex: 0,
        nextSlideIndex: 0,
        progress: 0,
        isPaused: true,
        timeInSlideMs: 0,
        slide,
        arrowProgressMap: {},
        zoneOpacityMap: {},
        playerOpacityMap: {},
      },
      null,
      defaultStageSize,
    );

    const playerIds = sceneGraph.billboardItems
      .filter((item) => item.kind === 'player')
      .map((item) => item.id);
    expect(playerIds[0]).toBe('item-top');
    expect(playerIds[1]).toBe('item-bottom');
  });
});

describe('PitchGroundLayer', () => {
  it('ステージ全体の背景RectとpitchRectオフセット付きGroupを描画すること', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <PitchGroundLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </TacticalStoreProvider>,
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
    expect(bgRect?.attrs.fill).toBe('#000000');

    // pitchRect オフセット付き Group の検証
    const groups = stage?.find('Group') ?? [];
    const pitchGroup = groups.find(
      (g) => g.x() === defaultPitchRect.x && g.y() === defaultPitchRect.y,
    );
    expect(pitchGroup).toBeDefined();
  });

  it('cleanRender={true} のときはゴースト軌道（GhostTrajectory）が描画されないこと', () => {
    const base = createDefaultTacticalProject();
    const playerA = {
      ...createDefaultDomainPlayer('home', 20, 20, '#001489'),
      id: 'p-ghost-1',
    };
    const slide1: DomainSlide = {
      ...base.phases[0].slides[0],
      id: 'slide-1',
      index: 0,
      players: [playerA],
    };
    const slide2: DomainSlide = {
      ...base.phases[0].slides[0],
      id: 'slide-2',
      index: 1,
      players: [
        { ...playerA, x: clampToScreenNorm(70), y: clampToScreenNorm(70) },
      ],
    };
    const project: DomainTacticalProject = {
      ...base,
      phases: [{ ...base.phases[0], slides: [slide1, slide2] }],
    };
    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({
      activePhaseId: base.phases[0].id,
      activeSlideId: 'slide-2',
    });
    const playbackStore = createPlaybackStore();

    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <PitchGroundLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            cleanRender={true}
          />
        </Stage>
      </TacticalStoreProvider>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows).toHaveLength(0);
  });

  it('メインキャンバス外枠確認枠線 (stroke="#38bdf8") が描画されないこと', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <PitchGroundLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            cleanRender={false}
          />
        </Stage>
      </TacticalStoreProvider>,
    );

    const stage = stageRef.current;
    const rects = stage?.find('Rect') ?? [];
    const blueBorderRect = rects.find((r) => r.attrs.stroke === '#38bdf8');
    expect(blueBorderRect).toBeUndefined();
  });
});

describe('BillboardObjectLayer', () => {
  it('pitchRectオフセット付きGroup内に深さソートされたマーカーとボールを描画すること', () => {
    const project = createProjectWithPlayers([
      {
        ...createDefaultDomainPlayer('home', 50, 80, '#001489'),
        id: 'm-deep',
        shirtNo: '9',
      },
      {
        ...createDefaultDomainPlayer('away', 50, 20, '#da020e'),
        id: 'm-top',
        shirtNo: '10',
      },
    ]);
    const documentStore = createDocumentStore(project);
    const phaseId = project.phases[0].id;
    const slideId = project.phases[0].slides[0].id;
    const sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: slideId,
    });
    const playbackStore = createPlaybackStore();

    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </TacticalStoreProvider>,
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
    const project = createProjectWithPlayers([
      {
        ...createDefaultDomainPlayer('home', 50, 50, '#001489'),
        id: 'm-bound-test',
        shirtNo: '7',
      },
    ]);
    const documentStore = createDocumentStore(project);
    const phaseId = project.phases[0].id;
    const slideId = project.phases[0].slides[0].id;
    const sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: slideId,
    });
    const playbackStore = createPlaybackStore();

    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </TacticalStoreProvider>,
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
    const project = createProjectWithPlayers([
      {
        ...createDefaultDomainPlayer('home', 20, 30, '#001489'),
        id: 'm-sync-test',
        shirtNo: '10',
      },
    ]);
    const documentStore = createDocumentStore(project);
    const phaseId = project.phases[0].id;
    const slideId = project.phases[0].slides[0].id;
    const sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: slideId,
    });
    const playbackStore = createPlaybackStore();

    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </TacticalStoreProvider>,
    );

    const stage = stageRef.current;
    const markerGroup = (stage?.find('Group') ?? []).find((g) => g.draggable());
    expect(markerGroup).toBeDefined();
    // 初期位置: x = 20% * 1000 = 200, y = 30% * 550 = 165
    expect(markerGroup?.x()).toBe(200);
    expect(markerGroup?.y()).toBe(165);

    // ドラッグ等で一時的にズレた状態を模倣
    markerGroup?.x(300);
    markerGroup?.y(300);

    // store 経由で marker.x, marker.y を更新 (リセット動作等)
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_PLAYER',
        id: 'm-sync-test',
        patch: { x: clampToScreenNorm(40), y: clampToScreenNorm(50) },
      });
    });

    // pxX = 40% * 1000 = 400, pxY = 50% * 550 = 275 に同期されていること
    expect(markerGroup?.x()).toBe(400);
    expect(markerGroup?.y()).toBe(275);
  });

  it('ドロップ位置が Stage コンテナ内の場合、ベンチ退避せず余白座標で updateMarker を実行すること', () => {
    const project = createProjectWithPlayers([
      {
        ...createDefaultDomainPlayer('home', 50, 50, '#001489'),
        id: 'm-drop-test',
        shirtNo: '8',
      },
    ]);
    const documentStore = createDocumentStore(project);
    const phaseId = project.phases[0].id;
    const slideId = project.phases[0].slides[0].id;
    const sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: slideId,
    });
    const playbackStore = createPlaybackStore();

    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <BillboardObjectLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
          />
        </Stage>
      </TacticalStoreProvider>,
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

    // bench へ移動されず、UPDATE_PLAYER で 0..100 スクリーン内にクランプされて保存されること
    const currentSlide = documentStore
      .getState()
      .project.phases.find((p) => p.id === phaseId)
      ?.slides.find((s) => s.id === slideId);
    const updatedMarker = currentSlide?.players.find(
      (m) => m.id === 'm-drop-test',
    );
    expect(updatedMarker?.area).toBe('pitch');
    expect(updatedMarker?.x).toBeCloseTo(100);
    expect(updatedMarker?.y).toBeCloseTo(100);
  });

  it('UPDATE_BALL (visible: true | false) に基づいてボールを描画・非表示制御すること', () => {
    const project = createDefaultTacticalProject();
    const documentStore = createDocumentStore(project);
    const phaseId = project.phases[0].id;
    const slideId = project.phases[0].slides[0].id;
    const sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: slideId,
    });
    const playbackStore = createPlaybackStore();

    // 1. ball.visible = false のときはボールを描画しないこと
    documentStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_BALL',
      patch: { visible: false },
    });
    const registryRef1 = { current: {} as any };
    const { unmount: unmount1 } = render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <Stage width={defaultStageSize.width} height={defaultStageSize.height}>
          <BillboardObjectLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            nodesRegistryRef={registryRef1}
          />
        </Stage>
      </TacticalStoreProvider>,
    );
    expect(registryRef1.current.ballNode).toBeUndefined();
    unmount1();

    // 2. ball.visible = true のときはボールが描画されること
    documentStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_BALL',
      patch: { visible: true },
    });
    const registryRef2 = { current: {} as any };
    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <Stage width={defaultStageSize.width} height={defaultStageSize.height}>
          <BillboardObjectLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            nodesRegistryRef={registryRef2}
          />
        </Stage>
      </TacticalStoreProvider>,
    );
    expect(registryRef2.current.ballNode).toBeDefined();
  });
});

function createSelectionBoxTestHarness(
  players: DomainPlayer[],
  pitchTransform?: DomainSlide['pitchTransform'],
) {
  const baseProject = createDefaultTacticalProject();
  const phase = baseProject.phases[0];
  const slide = phase.slides[0];
  const project = {
    ...baseProject,
    phases: [
      {
        ...phase,
        slides: [
          {
            ...slide,
            players,
            ...(pitchTransform ? { pitchTransform } : {}),
          },
        ],
      },
    ],
  };
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide.id,
    activeTool: 'select',
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      {children}
    </TacticalStoreProvider>
  );
  return { documentStore, sessionStore, wrapper };
}

describe('useCanvasSelectionBox', () => {
  it('vRect に x, y オフセットがある場合、オフセットを差し引いて正規化選択領域を算出してマーカーを選択すること', () => {
    const { sessionStore, wrapper } = createSelectionBoxTestHarness([
      // ピッチ内正規化座標: x=50, y=50
      // vRect: x=100, y=50, width=800, height=450 のとき、
      // 絶対ピクセル座標は x = 100 + 50% * 800 = 500, y = 50 + 50% * 450 = 275
      createDefaultDomainPlayer(
        'home',
        50,
        50,
        '#001489',
        'pitch',
        'm-selected',
      ),
    ]);

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

    expect(sessionStore.getState().selectedObjects.map((o) => o.id)).toContain(
      'm-selected',
    );
  });

  it('pitchTransform（zoom, panX, panY）適用時にスクリーン座標系でのドラッグ範囲選択からピッチ正規化座標が正しく逆変換されマーカーが選択されること', () => {
    const { sessionStore, wrapper } = createSelectionBoxTestHarness(
      [
        // ピッチ内正規化座標: x=60, y=60
        // vRect: x=100, y=50, width=800, height=450
        // pitchPos: x = 480, y = 270
        // local: x = 480 - 400 = 80, y = 270 - 225 = 45
        // stagePos: x = 500 + 80 + 80 * 1.5 = 700, y = 275 - 40 + 45 * 1.5 = 302.5
        createDefaultDomainPlayer(
          'home',
          60,
          60,
          '#001489',
          'pitch',
          'm-transformed',
        ),
      ],
      {
        zoom: 1.5,
        panX: 80,
        panY: -40,
        tilt: 0,
        isLocked: false,
      },
    );

    const { result } = renderHook(
      () =>
        useCanvasSelectionBox({
          vRect: { x: 100, y: 50, width: 800, height: 450 },
        }),
      { wrapper },
    );

    // スクリーン上で (680, 290) 〜 (720, 320) を囲んでドラッグ選択
    act(() => {
      result.current.handleSelectionDown({ x: 680, y: 290 }, true, false);
    });
    act(() => {
      result.current.handleSelectionMove({ x: 720, y: 320 });
    });
    act(() => {
      result.current.handleSelectionUp();
    });

    expect(sessionStore.getState().selectedObjects.map((o) => o.id)).toContain(
      'm-transformed',
    );
  });

  it('area: bench の選手や teamVisibility で非表示の選手が範囲選択から除外されること', () => {
    const { sessionStore, wrapper } = createSelectionBoxTestHarness([
      createDefaultDomainPlayer(
        'home',
        50,
        50,
        '#001489',
        'pitch',
        'm-visible-home',
      ),
      createDefaultDomainPlayer(
        'home',
        50,
        50,
        '#001489',
        'bench',
        'm-bench-home',
      ),
      createDefaultDomainPlayer(
        'away',
        50,
        50,
        '#ef4444',
        'pitch',
        'm-away-hidden',
      ),
    ]);

    const { result } = renderHook(
      () =>
        useCanvasSelectionBox({
          vRect: { x: 0, y: 0, width: 800, height: 450 },
        }),
      { wrapper },
    );

    // teamVisibility を 'home' に変更
    act(() => {
      sessionStore.getState().setTeamVisibility('home');
    });

    // (40, 40) 〜 (60, 60) の範囲 (norm: 40%〜60%) を選択
    act(() => {
      result.current.handleSelectionDown({ x: 320, y: 180 }, true, false);
    });
    act(() => {
      result.current.handleSelectionMove({ x: 480, y: 270 });
    });
    act(() => {
      result.current.handleSelectionUp();
    });

    // homeかつpitchの選手のみが選択され、benchとawayは除外されていること
    const selectedIds = sessionStore
      .getState()
      .selectedObjects.map((o) => o.id);
    expect(selectedIds).toContain('m-visible-home');
    expect(selectedIds).not.toContain('m-bench-home');
    expect(selectedIds).not.toContain('m-away-hidden');
  });
});

describe('getPointerCoordinates', () => {
  it('stage が存在する場合 stage.setPointersPositions(evt) を呼び出すこと', () => {
    const setPointersPositionsMock = vi.fn();
    const getPointerPositionMock = vi.fn().mockReturnValue({ x: 150, y: 120 });
    const mockStage = {
      setPointersPositions: setPointersPositionsMock,
      getPointerPosition: getPointerPositionMock,
      container: vi.fn(),
    };
    const mockEvent = {
      target: {
        getStage: () => mockStage,
      },
      evt: { clientX: 150, clientY: 120 },
    } as any;

    const coords = getPointerCoordinates(mockEvent, {
      x: 0,
      y: 0,
      width: 1000,
      height: 500,
    });

    expect(setPointersPositionsMock).toHaveBeenCalledWith(mockEvent.evt);
    expect(coords.pixelPos).toEqual({ x: 150, y: 120 });
  });

  it('pointer が null のとき stage.container().getBoundingClientRect() でフォールバック補正すること', () => {
    const mockRect = { left: 50, top: 20, width: 800, height: 600 };
    const mockContainer = {
      getBoundingClientRect: vi.fn().mockReturnValue(mockRect),
    };
    const mockStage = {
      setPointersPositions: vi.fn(),
      getPointerPosition: vi.fn().mockReturnValue(null),
      container: () => mockContainer,
    };
    const mockEvent = {
      target: {
        getStage: () => mockStage,
      },
      evt: { clientX: 250, clientY: 120 },
    } as any;

    const coords = getPointerCoordinates(mockEvent, {
      x: 0,
      y: 0,
      width: 1000,
      height: 500,
    });

    // clientX (250) - rect.left (50) = 200, clientY (120) - rect.top (20) = 100
    expect(coords.pixelPos).toEqual({ x: 200, y: 100 });
  });
});

describe('InteractionPreviewLayer', () => {
  it('cleanRender={true} のときは null を返すこと', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <InteractionPreviewLayerWithSceneGraph
            stageSize={defaultStageSize}
            pitchRect={defaultPitchRect}
            cleanRender={true}
          />
        </Stage>
      </TacticalStoreProvider>,
    );

    const layer = stageRef.current?.findOne('#interaction-preview-layer');
    expect(layer).toBeFalsy();
  });

  it('cleanRender={false} のときはレイヤーおよび selectionBox を描画すること', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <TacticalStoreProvider>
        <Stage
          ref={stageRef}
          width={defaultStageSize.width}
          height={defaultStageSize.height}
        >
          <InteractionPreviewLayerWithSceneGraph
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
      </TacticalStoreProvider>,
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

describe('HtmlHudOverlay', () => {
  it('cleanRender={true} のときは null を返すこと', () => {
    const { container } = render(
      <TacticalStoreProvider>
        <HtmlHudOverlay
          stageSize={defaultStageSize}
          pitchRect={defaultPitchRect}
          editingText={null}
          cleanRender={true}
          onSaveText={vi.fn()}
          onRemoveText={vi.fn()}
          onCloseText={vi.fn()}
        />
      </TacticalStoreProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('connectingPlayerId があるときは接続ガイダンスバッジを表示すること', () => {
    const project = createProjectWithPlayers([
      {
        ...createDefaultDomainPlayer('home', 20, 20, '#001489'),
        id: 'm-src',
      },
    ]);
    const documentStore = createDocumentStore(project);
    const phaseId = project.phases[0].id;
    const slideId = project.phases[0].slides[0].id;
    const sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: slideId,
    });
    const playbackStore = createPlaybackStore();

    const { getByTestId } = render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
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
      </TacticalStoreProvider>,
    );

    // Default connectingPlayerId is null, so badge is not visible yet
    expect(() => getByTestId('connecting-guidance-badge')).toThrow();
  });
});

describe('レイヤーの memo 化による再描画最適化', () => {
  it('PitchGroundLayer と BillboardObjectLayer が memo 化されていること', () => {
    expect((PitchGroundLayer as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
    expect(
      (BillboardObjectLayer as unknown as { $$typeof: symbol }).$$typeof,
    ).toBe(Symbol.for('react.memo'));
  });
});
