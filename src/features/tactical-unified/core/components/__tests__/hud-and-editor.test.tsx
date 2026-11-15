import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type Konva from 'konva';
import type React from 'react';
import { createRef } from 'react';
import { Stage } from 'react-konva';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import { useResolvedSceneGraph } from '../../../hooks/use-resolved-scene-graph';
import {
  createDocumentStore,
  type DocumentStore,
} from '../../../stores/document-store';
import { selectDomainActiveSlide } from '../../../stores/domain-selectors';
import {
  createSessionStore,
  type SessionStore,
} from '../../../stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '../../../stores/tactical-store-provider';
import { resolvePitchGroupTransform } from '../../utils/canvas-coordinates';
import { getPointerCoordinates } from '../../utils/geometry';
import { BillboardObjectLayer } from '../BillboardObjectLayer';
import { ContextHud } from '../ContextHud';
import { CoreDrawingToolbar } from '../CoreDrawingToolbar';
import { MiniColorPicker } from '../hud/mini-color-picker';
import { InteractionPreviewLayer } from '../InteractionPreviewLayer';
import { PitchGroundLayer } from '../PitchGroundLayer';
import { PitchInlineTextEditor } from '../PitchInlineTextEditor';

function renderWithStore(ui: React.ReactElement): {
  documentStore: DocumentStore;
  sessionStore: SessionStore;
} & ReturnType<typeof render> {
  const baseProject = createDefaultTacticalProject();
  const initialProject = {
    ...baseProject,
    phases: baseProject.phases.map((phase, pIdx) =>
      pIdx === 0
        ? {
            ...phase,
            slides: phase.slides.map((slide, sIdx) =>
              sIdx === 0
                ? {
                    ...slide,
                    arrows: [
                      {
                        id: 'arrow-1',
                        annotationType: 'arrow' as const,
                        arrowType: 'pass' as const,
                        curveType: 'straight' as const,
                        points: [
                          toScreenNormPoint(20, 20),
                          toScreenNormPoint(50, 50),
                        ],
                        color: '#ffffff',
                        strokeWidth: 3,
                        dashArray: [] as number[],
                        startMarker: 'none' as const,
                        endMarker: 'arrow' as const,
                      },
                    ],
                    zones: [
                      {
                        id: 'zone-1',
                        annotationType: 'zone' as const,
                        zoneType: 'generic' as const,
                        shapeType: 'rect' as const,
                        x: toScreenNormCoord(10),
                        y: toScreenNormCoord(10),
                        width: toScreenNormCoord(20),
                        height: toScreenNormCoord(20),
                        color: '#f59e0b',
                        opacity: 0.25,
                        strokeWidth: 0,
                      },
                    ],
                    players: [
                      {
                        id: 'player-1',
                        shirtNo: '10',
                        x: toScreenNormCoord(30),
                        y: toScreenNormCoord(40),
                        team: 'home' as const,
                        position: 'FW',
                        area: 'pitch' as const,
                        connectLines: [],
                        badges: [],
                        style: {
                          markerType: 'circle' as const,
                          insideContent: 'number' as const,
                          bottomLabel: 'name' as const,
                          color: '#ef4444',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1.0,
                          numberSizeScale: 1.0,
                          labelSizeScale: 1.0,
                        },
                      },
                      {
                        id: 'player-2d',
                        shirtNo: '10',
                        name: 'Initial Name',
                        x: toScreenNormCoord(30),
                        y: toScreenNormCoord(40),
                        team: 'home' as const,
                        position: 'FW',
                        area: 'pitch' as const,
                        connectLines: [],
                        badges: [],
                        style: {
                          markerType: 'circle' as const,
                          insideContent: 'number' as const,
                          bottomLabel: 'name' as const,
                          color: '#ef4444',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1.0,
                          numberSizeScale: 1.0,
                          labelSizeScale: 1.0,
                        },
                      },
                      {
                        id: 'player-3d',
                        shirtNo: '4',
                        name: 'White',
                        x: toScreenNormCoord(50),
                        y: toScreenNormCoord(50),
                        team: 'home' as const,
                        position: 'DF',
                        area: 'pitch' as const,
                        connectLines: [],
                        badges: [],
                        style: {
                          markerType: 'ring' as const,
                          insideContent: 'number' as const,
                          bottomLabel: 'name' as const,
                          color: '#034694',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1.0,
                          numberSizeScale: 1.0,
                          labelSizeScale: 1.0,
                        },
                      },
                      {
                        id: 'player-ds',
                        shirtNo: '7',
                        name: 'Saka',
                        x: toScreenNormCoord(50),
                        y: toScreenNormCoord(50),
                        team: 'home' as const,
                        position: 'FW',
                        area: 'pitch' as const,
                        connectLines: [],
                        badges: [],
                        style: {
                          markerType: 'ring' as const,
                          insideContent: 'number' as const,
                          bottomLabel: 'name' as const,
                          color: '#034694',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1.0,
                          numberSizeScale: 1.0,
                          labelSizeScale: 1.0,
                        },
                      },
                      {
                        id: 'player-ring-fade-hud',
                        shirtNo: '',
                        name: 'Havertz',
                        x: toScreenNormCoord(50),
                        y: toScreenNormCoord(50),
                        team: 'home' as const,
                        position: 'FW',
                        area: 'pitch' as const,
                        connectLines: [],
                        badges: [],
                        style: {
                          markerType: 'ring-fade' as const,
                          insideContent: 'none' as const,
                          bottomLabel: 'name' as const,
                          color: '#38bdf8',
                          strokeColor: '#ffffff',
                          strokeWidth: 2,
                          sizeScale: 1.0,
                          numberSizeScale: 1.0,
                          labelSizeScale: 1.0,
                          glowBlur: 16,
                        },
                      },
                    ],
                  }
                : slide,
            ),
          }
        : phase,
    ),
  };
  const documentStore = createDocumentStore(initialProject);
  const sessionStore = createSessionStore({
    activePhaseId: initialProject.phases[0]?.id,
    activeSlideId: initialProject.phases[0]?.slides[0]?.id,
  });
  const utils = render(
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      {ui}
    </TacticalStoreProvider>,
  );
  return { documentStore, sessionStore, ...utils };
}

describe('ContextHud', () => {
  it('renders nothing when no object is selected or eraser is active', () => {
    const { container, sessionStore } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );
    expect(container.firstChild).toBeNull();

    // Eraser active even if object selected -> should be null
    act(() => {
      sessionStore.getState().selectObject({ id: 'arrow-1', kind: 'arrow' });
      sessionStore.getState().setActiveTool('eraser');
    });

    expect(container.firstChild).toBeNull();
  });

  it('矢印・ゾーン・マーカー単一選択時に直上に ContextHud が表示され、色・太さ変更が反映されること', () => {
    const { documentStore, sessionStore } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    // 1. Arrow selection
    act(() => {
      sessionStore.getState().selectObject({ id: 'arrow-1', kind: 'arrow' });
    });

    expect(
      screen.getByRole('toolbar', { name: /コンテキスト操作ツールバー/i }),
    ).toBeDefined();
    expect(screen.getByText('3px')).toBeDefined();

    // Stroke width + 1
    const plusBtn = screen.getByTitle('線を太く');
    fireEvent.click(plusBtn);
    const getActiveSlide = () =>
      selectDomainActiveSlide(
        documentStore.getState().project,
        sessionStore.getState().activePhaseId,
        sessionStore.getState().activeSlideId,
      );
    expect(getActiveSlide()?.arrows[0].strokeWidth).toBe(4);

    // Toggle dash
    const dashBtn = screen.getByTitle('実線 (点線に切替)');
    fireEvent.click(dashBtn);
    expect(getActiveSlide()?.arrows[0].dashArray).toEqual([6, 4]);

    // 2. Zone selection
    act(() => {
      sessionStore.getState().selectObject({ id: 'zone-1', kind: 'zone' });
    });

    const opacityBtn = screen.getByTitle('塗りの不透明度 (クリックで切替)');
    expect(opacityBtn.textContent).toBe('25%');
    fireEvent.click(opacityBtn);
    expect(getActiveSlide()?.zones[0].opacity).toBe(0.6);

    // 3. Marker selection
    act(() => {
      sessionStore.getState().selectObject({ id: 'player-1', kind: 'player' });
    });

    const infoBtn = screen.getByRole('button', { name: '選手情報変更' });
    fireEvent.click(infoBtn);
    const dialog = screen.getByRole('dialog', { name: '選手情報変更フォーム' });
    const shirtInput = within(dialog).getByLabelText(
      '背番号',
    ) as HTMLInputElement;
    expect(shirtInput.value).toBe('10');
    fireEvent.change(shirtInput, { target: { value: '7' } });
    expect(
      getActiveSlide()?.players.find((p) => p.id === 'player-1')?.shirtNo,
    ).toBe('7');
  });
});

describe('getPointerCoordinates with 2D zoom/pan transform', () => {
  it('ズーム・パン変換を渡した際に stageToPitch 逆変換された normPos が返り pixelPos は Stage 座標のまま維持されること', () => {
    const mockEvent = {
      target: {
        getStage: () => ({
          getPointerPosition: () => ({ x: 250, y: 150 }),
        }),
      },
      evt: { clientX: 250, clientY: 150 },
    } as unknown as Parameters<typeof getPointerCoordinates>[0];

    const vRect = { x: 50, y: 50, width: 200, height: 100 };

    // zoom: 2 の場合:
    // cx = 150, cy = 100
    // localX = (250 - 150) / 2 = 50 -> pitchPos.x = 50 + 100 = 150 -> normX = 150 / 200 * 100 = 75%
    // localY = (150 - 100) / 2 = 25 -> pitchPos.y = 25 + 50 = 75 -> normY = 75 / 100 * 100 = 75%
    const resWithZoom = (getPointerCoordinates as Function)(mockEvent, vRect, {
      zoom: 2,
      panX: 0,
      panY: 0,
    });

    expect(resWithZoom.pixelPos).toEqual({ x: 250, y: 150 });
    expect(resWithZoom.normPos).toEqual({ x: 75, y: 75 });

    // panX: 20, panY: -10, zoom: 1 の場合:
    // localX = (250 - 150) - 20 = 80 -> pitchPos.x = 80 + 100 = 180 -> normX = 180 / 200 * 100 = 90%
    // localY = (150 - 100) - (-10) = 60 -> pitchPos.y = 60 + 50 = 110 -> normY = 110 / 100 * 100 = 110% (clamped to 100 unless allowOverflow)
    const resWithPan = (getPointerCoordinates as Function)(mockEvent, vRect, {
      zoom: 1,
      panX: 20,
      panY: -10,
    });

    expect(resWithPan.pixelPos).toEqual({ x: 250, y: 150 });
    expect(resWithPan.normPos).toEqual({ x: 90, y: 100 });
  });
});

describe('PitchInlineTextEditor', () => {
  it('テキストダブルクリックで PitchInlineTextEditor が開き、Enter で保存されること', () => {
    const onSave = vi.fn();
    const onRemove = vi.fn();
    const onClose = vi.fn();

    const editingText = {
      id: 'txt-1',
      annotationType: 'text' as const,
      content: 'Initial Text',
      x: toScreenNormCoord(20),
      y: toScreenNormCoord(30),
      fontSize: 16,
      color: '#ffffff',
      bold: false,
      italic: false,
    };

    render(
      <PitchInlineTextEditor
        editingText={editingText}
        stageSize={{ width: 800, height: 600 }}
        onSave={onSave}
        onRemove={onRemove}
        onClose={onClose}
      />,
    );

    const textarea = screen.getByDisplayValue('Initial Text');
    expect(textarea).toBeDefined();

    fireEvent.change(textarea, { target: { value: 'Updated Notes' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSave).toHaveBeenCalledWith('txt-1', 'Updated Notes');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('CoreDrawingToolbar', () => {
  it('CoreDrawingToolbar で全11ツール、連続描画ロック、消しゴム、ピッチロック、リセットが動作すること', () => {
    const { documentStore, sessionStore } = renderWithStore(
      <CoreDrawingToolbar markerMode="all" />,
    );

    const tools: { title: string; expected: string }[] = [
      { title: 'Select (V)', expected: 'select' },
      { title: 'Straight Line (L)', expected: 'line' },
      { title: 'Solid Arrow (A)', expected: 'arrow_solid' },
      { title: 'Zone (Z)', expected: 'zone' },
      { title: '3D Foot Ring (O)', expected: 'player-ring' },
      { title: 'Eraser: OFF (Click to toggle)', expected: 'eraser' },
    ];

    for (const { title, expected } of tools) {
      const btn = screen.getByTitle(title);
      fireEvent.click(btn);
      expect(sessionStore.getState().activeTool).toBe(expected);
    }

    // 連続描画ロックのトグル
    expect(sessionStore.getState().continuousDrawing).toBe(false);
    const continuousBtn = screen.getByTitle(/Continuous Draw/i);
    fireEvent.click(continuousBtn);
    expect(sessionStore.getState().continuousDrawing).toBe(true);
    fireEvent.click(continuousBtn);
    expect(sessionStore.getState().continuousDrawing).toBe(false);

    // ピッチロック
    const getPitchLocked = () =>
      selectDomainActiveSlide(
        documentStore.getState().project,
        sessionStore.getState().activePhaseId,
        sessionStore.getState().activeSlideId,
      )?.pitchTransform?.isLocked ?? true;
    expect(getPitchLocked()).toBe(true);
    const pitchLockBtn = screen.getByTitle(/Pitch Lock/i);
    fireEvent.click(pitchLockBtn);
    expect(getPitchLocked()).toBe(false);

    // リセットボタン (全消去)
    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        sessionStore.getState().activePhaseId,
        sessionStore.getState().activeSlideId,
      )?.arrows.length,
    ).toBeGreaterThan(0);

    window.confirm = vi.fn(() => true);
    const resetBtn = screen.getByTitle(/Reset all annotations/i);
    fireEvent.click(resetBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        sessionStore.getState().activePhaseId,
        sessionStore.getState().activeSlideId,
      )?.arrows,
    ).toHaveLength(0);
  });
});

describe('MiniColorPicker', () => {
  it('クリック時に input[type="color"] は存在せず、HexColorPicker とスウォッチを含むダイアログが開き色変更できること', () => {
    const onChange = vi.fn();
    renderWithStore(
      <MiniColorPicker
        value="#ef4444"
        onChange={onChange}
        title="カラー選択"
      />,
    );

    // トリガーボタンをクリックしてポップオーバーを開く
    const trigger = screen.getByRole('button', { name: 'カラー選択' });
    fireEvent.click(trigger);

    // input[type="color"] は廃止されていること
    expect(document.querySelector('input[type="color"]')).toBeNull();

    // ダイアログが開くこと
    const dialog = screen.getByRole('dialog', { name: 'カラーパレット' });
    expect(dialog).toBeDefined();

    // react-colorful の HexColorPicker (.react-colorful) が存在すること
    expect(dialog.querySelector('.react-colorful')).not.toBeNull();

    // スウォッチボタンをクリックすると onChange が呼ばれること
    const whiteSwatch = screen.getByTitle('White (#ffffff)');
    fireEvent.click(whiteSwatch);
    expect(onChange).toHaveBeenCalledWith('#ffffff');
  });
});

describe('PlayerHud', () => {
  it('Web 2Dマーカー時にベンチ退避ボタンと削除ボタンが存在せず、選手情報変更ポップオーバーから背番号・選手名を更新できること', () => {
    const { documentStore, sessionStore } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      sessionStore.getState().selectObject({ id: 'player-2d', kind: 'player' });
    });

    // ベンチ退避ボタンと削除ボタンが存在しないこと
    expect(screen.queryByTitle('ベンチへ退避')).toBeNull();
    expect(screen.queryByTitle('削除 (Delete)')).toBeNull();

    // 選手情報変更ボタンをクリック
    const infoBtn = screen.getByRole('button', { name: '選手情報変更' });
    fireEvent.click(infoBtn);

    const dialog = screen.getByRole('dialog', { name: '選手情報変更フォーム' });
    expect(dialog).toBeDefined();

    const getPlayer = () =>
      selectDomainActiveSlide(
        documentStore.getState().project,
        sessionStore.getState().activePhaseId,
        sessionStore.getState().activeSlideId,
      )?.players.find((p) => p.id === 'player-2d');

    // 背番号変更
    const shirtInput = within(dialog).getByLabelText('背番号');
    fireEvent.change(shirtInput, { target: { value: '8' } });
    expect(getPlayer()?.shirtNo).toBe('8');

    // 選手名変更
    const nameInput = within(dialog).getByLabelText('選手名');
    fireEvent.change(nameInput, { target: { value: 'Odegaard' } });
    expect(getPlayer()?.name).toBe('Odegaard');
    expect(getPlayer()?.style.bottomLabel).toBe('name');
  });

  it('Extension 3Dマーカー時に選手情報変更ポップオーバーから選手名を更新でき削除ボタンが表示されること', () => {
    const { documentStore, sessionStore } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      sessionStore.getState().selectObject({ id: 'player-3d', kind: 'player' });
    });

    // ベンチ退避ボタンは存在せず、削除ボタンが存在すること
    expect(screen.queryByTitle('ベンチへ退避')).toBeNull();
    const deleteBtn = screen.getByTitle('削除 (Delete)');
    expect(deleteBtn).toBeDefined();

    // 選手情報変更ボタンをクリック
    const infoBtn = screen.getByRole('button', { name: '選手情報変更' });
    fireEvent.click(infoBtn);

    const dialog = screen.getByRole('dialog', { name: '選手情報変更フォーム' });
    expect(dialog).toBeDefined();

    // 3Dマーカー時、ポップオーバー内に背番号入力は存在しないこと
    expect(within(dialog).queryByLabelText('背番号')).toBeNull();

    const getPlayer = () =>
      selectDomainActiveSlide(
        documentStore.getState().project,
        sessionStore.getState().activePhaseId,
        sessionStore.getState().activeSlideId,
      )?.players.find((p) => p.id === 'player-3d');

    // 選手名変更
    const nameInput = within(dialog).getByLabelText('選手名');
    fireEvent.change(nameInput, { target: { value: 'Saliba' } });
    expect(getPlayer()?.name).toBe('Saliba');
    expect(getPlayer()?.style.bottomLabel).toBe('name');

    // 削除ボタンをクリックするとマーカーが削除されること
    fireEvent.click(deleteBtn);
    expect(getPlayer()).toBeUndefined();
  });

  it('PlayerHud と MiniColorPicker が新UIデザイントークン (L3 #222226, L1 #121214 入力欄) を適用していること', () => {
    const { sessionStore } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      sessionStore.getState().selectObject({ id: 'player-ds', kind: 'player' });
    });

    const infoBtn = screen.getByRole('button', { name: '選手情報変更' });
    fireEvent.click(infoBtn);

    const dialog = screen.getByRole('dialog', { name: '選手情報変更フォーム' });
    expect(dialog.className).toContain('bg-[#222226]');
    expect(dialog.className).toContain('border-white/[0.08]');
    expect(dialog.className).not.toContain('bg-[#222222]');

    const nameInput = within(dialog).getByLabelText('選手名');
    expect(nameInput.className).toContain('bg-[#121214]');
    expect(nameInput.className).not.toContain('bg-[#1a1a1a]');
  });

  it('markerType="ring-fade" または "ring" のとき発光幅調整コントロールが表示され、glowBlur を調整できること', () => {
    const { documentStore, sessionStore } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      sessionStore
        .getState()
        .selectObject({ id: 'player-ring-fade-hud', kind: 'player' });
    });

    // 発光幅調整ボタンが存在すること
    const decBtn = screen.getByTitle('発光幅縮小');
    const incBtn = screen.getByTitle('発光幅拡大');
    expect(decBtn).toBeDefined();
    expect(incBtn).toBeDefined();
    expect(screen.getByText('16px')).toBeDefined();

    const getPlayer = () =>
      selectDomainActiveSlide(
        documentStore.getState().project,
        sessionStore.getState().activePhaseId,
        sessionStore.getState().activeSlideId,
      )?.players.find((p) => p.id === 'player-ring-fade-hud');

    // 拡大ボタンをクリック (+5px)
    fireEvent.click(incBtn);
    expect(getPlayer()?.style?.glowBlur).toBe(21);
    expect(screen.getByText('21px')).toBeDefined();

    // 縮小ボタンをクリック (-5px)
    fireEvent.click(decBtn);
    expect(getPlayer()?.style?.glowBlur).toBe(16);
  });
});

function KonvaThreeLayersWithSceneGraph({
  stageRef,
  stageSize,
  pitchRect,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  stageSize: { width: number; height: number };
  pitchRect: { x: number; y: number; width: number; height: number };
}) {
  const sceneGraph = useResolvedSceneGraph({
    width: pitchRect.width,
    height: pitchRect.height,
  });
  return (
    <Stage ref={stageRef} width={stageSize.width} height={stageSize.height}>
      <PitchGroundLayer
        stageSize={stageSize}
        pitchRect={pitchRect}
        sceneGraph={sceneGraph}
      />
      <BillboardObjectLayer
        stageSize={stageSize}
        pitchRect={pitchRect}
        sceneGraph={sceneGraph}
      />
      <InteractionPreviewLayer
        stageSize={stageSize}
        pitchRect={pitchRect}
        sceneGraph={sceneGraph}
      />
    </Stage>
  );
}

describe('Konva 3レイヤーへの2Dズーム・パン描画接続 (Phase 3)', () => {
  beforeAll(() => {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      options?: unknown,
    ) {
      const ctx = origGetContext.call(
        this,
        contextId as '2d',
        options as CanvasRenderingContext2DSettings,
      );
      if (contextId === '2d' && ctx) {
        const ctxRecord = ctx as unknown as Record<string, unknown>;
        if (typeof ctxRecord.getTransform !== 'function') {
          ctxRecord.getTransform = () =>
            typeof DOMMatrix !== 'undefined'
              ? new DOMMatrix()
              : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
        }
        for (const method of [
          'ellipse',
          'bezierCurveTo',
          'quadraticCurveTo',
          'arcTo',
          'roundRect',
        ]) {
          if (typeof ctxRecord[method] !== 'function') {
            ctxRecord[method] = () => {};
          }
        }
      }
      return ctx;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('pitchTransform 更新時に PitchGroundLayer, BillboardObjectLayer, InteractionPreviewLayer のピッチ Group に 2D ズーム・パン変形が適用されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const pitchRect = { x: 100, y: 50, width: 800, height: 450 };
    const stageSize = { width: 1000, height: 600 };

    const { documentStore, sessionStore } = renderWithStore(
      <KonvaThreeLayersWithSceneGraph
        stageRef={stageRef}
        stageSize={stageSize}
        pitchRect={pitchRect}
      />,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();

    // 初期状態 (zoom: 1, panX: 0, panY: 0)
    const groundLayer = stage?.findOne('#pitch-ground-layer') as Konva.Layer;
    const billboardLayer = stage?.findOne(
      '#billboard-object-layer',
    ) as Konva.Layer;
    const previewLayer = stage?.findOne(
      '#interaction-preview-layer',
    ) as Konva.Layer;

    const groundGroup = groundLayer.findOne('Group');
    const billboardGroup = billboardLayer.findOne('Group');
    const previewGroup = previewLayer.findOne('Group');

    expect(groundGroup).toBeDefined();
    expect(billboardGroup).toBeDefined();
    expect(previewGroup).toBeDefined();
    if (!groundGroup || !billboardGroup || !previewGroup) {
      throw new Error('Required Konva Groups not found in layers');
    }

    expect(groundGroup.x()).toBe(100);
    expect(groundGroup.y()).toBe(50);
    expect(groundGroup.scaleX()).toBe(1);
    expect(groundGroup.scaleY()).toBe(1);

    expect(billboardGroup.x()).toBe(100);
    expect(billboardGroup.y()).toBe(50);
    expect(billboardGroup.scaleX()).toBe(1);
    expect(billboardGroup.scaleY()).toBe(1);

    expect(previewGroup.x()).toBe(100);
    expect(previewGroup.y()).toBe(50);
    expect(previewGroup.scaleX()).toBe(1);
    expect(previewGroup.scaleY()).toBe(1);

    // 2Dズーム・パン状態の更新
    const { activePhaseId, activeSlideId } = sessionStore.getState();
    if (!activePhaseId || !activeSlideId) {
      throw new Error('Active phase or slide not found');
    }
    act(() => {
      documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_SLIDE_META',
        patch: {
          pitchTransform: {
            zoom: 2,
            panX: 40,
            panY: -20,
            tilt: 0,
            isLocked: false,
          },
        },
      });
    });

    const expectedTransform = resolvePitchGroupTransform(pitchRect, {
      zoom: 2,
      panX: 40,
      panY: -20,
      tilt: 0,
    });

    expect(groundGroup.x()).toBe(expectedTransform.x);
    expect(groundGroup.y()).toBe(expectedTransform.y);
    expect(groundGroup.scaleX()).toBe(2);
    expect(groundGroup.scaleY()).toBe(2);

    expect(billboardGroup.x()).toBe(expectedTransform.x);
    expect(billboardGroup.y()).toBe(expectedTransform.y);
    expect(billboardGroup.scaleX()).toBe(2);
    expect(billboardGroup.scaleY()).toBe(2);

    expect(previewGroup.x()).toBe(expectedTransform.x);
    expect(previewGroup.y()).toBe(expectedTransform.y);
    expect(previewGroup.scaleX()).toBe(2);
    expect(previewGroup.scaleY()).toBe(2);
  });
});
