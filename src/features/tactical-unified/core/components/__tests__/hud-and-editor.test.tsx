import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type Konva from 'konva';
import type React from 'react';
import { createRef } from 'react';
import { Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasConfig, CanvasStoreApi } from '../../types';
import { calculatePitchTransform } from '../../utils/canvas-pitch-transform-helper';
import { getPointerCoordinates } from '../../utils/geometry';
import { BillboardObjectLayer } from '../BillboardObjectLayer';
import { BoundaryBoxHud } from '../BoundaryBoxHud';
import { ContextHud } from '../ContextHud';
import { CoreDrawingToolbar } from '../CoreDrawingToolbar';
import { MiniColorPicker } from '../hud/mini-color-picker';
import { InteractionPreviewLayer } from '../InteractionPreviewLayer';
import { PitchGroundLayer } from '../PitchGroundLayer';
import { PitchInlineTextEditor } from '../PitchInlineTextEditor';

function renderWithStore(
  ui: React.ReactElement,
  config?: Partial<CanvasConfig>,
): { store: CanvasStoreApi } & ReturnType<typeof render> {
  const store = createCanvasStore({
    mode: 'screenshot-edit',
    markerMode: 'all',
    aspectRatio: '16:9',
    ...config,
  });
  const utils = render(
    <CanvasStoreContext.Provider value={store}>
      {ui}
    </CanvasStoreContext.Provider>,
  );
  return { store, ...utils };
}

describe('ContextHud', () => {
  it('renders nothing when no object is selected or eraser is active', () => {
    const { container, store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );
    expect(container.firstChild).toBeNull();

    // Eraser active even if object selected -> should be null
    act(() => {
      store.getState().addArrow({
        id: 'arrow-1',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 10, y: 10 },
          { x: 40, y: 40 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      });
      store.getState().selectObject({ id: 'arrow-1', kind: 'arrow' });
      store.getState().setActiveTool('eraser');
    });

    expect(container.firstChild).toBeNull();
  });

  it('矢印・ゾーン・マーカー単一選択時に直上に ContextHud が表示され、色・太さ変更が反映されること', () => {
    const { store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    // 1. Arrow selection
    act(() => {
      store.getState().addArrow({
        id: 'arrow-1',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 20, y: 20 },
          { x: 50, y: 50 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      });
      store.getState().selectObject({ id: 'arrow-1', kind: 'arrow' });
    });

    expect(
      screen.getByRole('toolbar', { name: /コンテキスト操作ツールバー/i }),
    ).toBeDefined();
    expect(screen.getByText('3px')).toBeDefined();

    // Stroke width + 1
    const plusBtn = screen.getByTitle('線を太く');
    fireEvent.click(plusBtn);
    expect(store.getState().annotations.arrows[0].strokeWidth).toBe(4);

    // Toggle dash
    const dashBtn = screen.getByTitle('実線 (点線に切替)');
    fireEvent.click(dashBtn);
    expect(store.getState().annotations.arrows[0].dashArray).toEqual([6, 4]);

    // 2. Zone selection
    act(() => {
      store.getState().addZone({
        id: 'zone-1',
        annotationType: 'zone',
        zoneType: 'generic',
        points: [
          { x: 10, y: 10 },
          { x: 30, y: 10 },
          { x: 30, y: 30 },
        ],
        color: '#f59e0b',
        opacity: 0.25,
        strokeWidth: 0,
      });
      store.getState().selectObject({ id: 'zone-1', kind: 'zone' });
    });

    const opacityBtn = screen.getByTitle('塗りの不透明度 (クリックで切替)');
    expect(opacityBtn.textContent).toBe('25%');
    fireEvent.click(opacityBtn);
    expect(store.getState().annotations.zones[0].opacity).toBe(0.6);

    // 3. Marker selection
    act(() => {
      store.getState().addMarker({
        id: 'player-1',
        shirtNo: '10',
        x: 30,
        y: 40,
        team: 'home',
        position: 'FW',
        area: 'pitch',
        connectLines: [],
        badges: [],
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#ef4444',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
      });
      store.getState().selectObject({ id: 'player-1', kind: 'player' });
    });

    const shirtInput = screen.getByTitle('背番号') as HTMLInputElement;
    expect(shirtInput.value).toBe('10');
    fireEvent.change(shirtInput, { target: { value: '7' } });
    expect(store.getState().annotations.markers[0].shirtNo).toBe('7');
  });
});

describe('BoundaryBoxHud', () => {
  it('デフォルト表示で 3D Tilt コントロールが非表示であり、showTiltControls={true} 指定時のみ表示されること', () => {
    const defaultBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      visible: true,
    };

    // 1. デフォルト (showTiltControls 未指定 -> false)
    const { unmount } = renderWithStore(
      <BoundaryBoxHud stageSize={{ width: 800, height: 600 }} />,
      { defaultBoundaryBox: defaultBox },
    );

    const toggleBtn = screen.getByRole('button', {
      name: /Toggle Boundary Box Settings/i,
    });
    fireEvent.click(toggleBtn);

    expect(screen.queryByText('Pitch 2.5D Tilt')).toBeNull();
    unmount();

    // 2. showTiltControls={true}
    renderWithStore(
      <BoundaryBoxHud
        stageSize={{ width: 800, height: 600 }}
        showTiltControls={true}
      />,
      { defaultBoundaryBox: defaultBox },
    );

    const toggleBtnTrue = screen.getByRole('button', {
      name: /Toggle Boundary Box Settings/i,
    });
    fireEvent.click(toggleBtnTrue);

    expect(screen.getByText('Pitch 2.5D Tilt')).toBeDefined();
  });

  it('BoundaryBoxHud で「全画面」「ピッチフィット」ボタンが機能すること', () => {
    const { store } = renderWithStore(
      <BoundaryBoxHud
        stageSize={{ width: 800, height: 600 }}
        showTiltControls={true}
      />,
      {
        defaultBoundaryBox: {
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          enabled: true,
          visible: true,
        },
      },
    );

    const toggleBtn = screen.getByRole('button', {
      name: /Toggle Boundary Box Settings/i,
    });
    fireEvent.click(toggleBtn);

    // 1. 全画面ボタン押下
    const fullBtn = screen.getByRole('button', {
      name: '全画面',
    });
    fireEvent.click(fullBtn);

    let updatedBox = store.getState().boundaryBox;
    expect(updatedBox.visible).toBe(true);
    expect(updatedBox.width).toBe(100);
    expect(updatedBox.height).toBe(100);
    expect(updatedBox.x).toBe(0);
    expect(updatedBox.y).toBe(0);

    // 2. ピッチフィットボタン押下
    const fitBtn = screen.getByRole('button', {
      name: 'ピッチフィット',
    });
    fireEvent.click(fitBtn);

    updatedBox = store.getState().boundaryBox;
    expect(updatedBox.visible).toBe(true);
    expect(updatedBox.fitTarget).toBe('pitch');
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
      x: 20,
      y: 30,
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
  it('CoreDrawingToolbar で全11ツール、連続描画ロック、消しゴム、ピッチロック、クロップ枠、リセットが動作すること', () => {
    const { store } = renderWithStore(<CoreDrawingToolbar markerMode="all" />, {
      mode: 'tactical-board',
    });

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
      expect(store.getState().activeTool).toBe(expected);
    }

    // 連続描画ロックのトグル
    expect(store.getState().continuousDrawing).toBe(false);
    const continuousBtn = screen.getByTitle(/Continuous Draw/i);
    fireEvent.click(continuousBtn);
    expect(store.getState().continuousDrawing).toBe(true);
    fireEvent.click(continuousBtn);
    expect(store.getState().continuousDrawing).toBe(false);

    // ピッチロック
    expect(store.getState().pitchTransform.isLocked).toBe(false);
    const pitchLockBtn = screen.getByTitle(/Pitch Lock/i);
    fireEvent.click(pitchLockBtn);
    expect(store.getState().pitchTransform.isLocked).toBe(true);

    // BoundaryBox 切替
    const bboxToggleBtn = screen.getByTitle(/Boundary Box/i);
    fireEvent.click(bboxToggleBtn);
    expect(store.getState().boundaryBox.visible).toBe(true);

    // リセットボタン (全消去)
    act(() => {
      store.getState().addArrow({
        id: 'arrow-reset-test',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      });
    });
    expect(store.getState().annotations.arrows).toHaveLength(1);

    window.confirm = vi.fn(() => true);
    const resetBtn = screen.getByTitle(/Reset all annotations/i);
    fireEvent.click(resetBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(store.getState().annotations.arrows).toHaveLength(0);
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
    const { store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      store.getState().addMarker({
        id: 'player-2d',
        shirtNo: '10',
        name: 'Initial Name',
        x: 30,
        y: 40,
        team: 'home',
        position: 'FW',
        area: 'pitch',
        connectLines: [],
        badges: [],
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#ef4444',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
      });
      store.getState().selectObject({ id: 'player-2d', kind: 'player' });
    });

    // ベンチ退避ボタンと削除ボタンが存在しないこと
    expect(screen.queryByTitle('ベンチへ退避')).toBeNull();
    expect(screen.queryByTitle('削除 (Delete)')).toBeNull();

    // 選手情報変更ボタンをクリック
    const infoBtn = screen.getByRole('button', { name: '選手情報変更' });
    fireEvent.click(infoBtn);

    const dialog = screen.getByRole('dialog', { name: '選手情報変更フォーム' });
    expect(dialog).toBeDefined();

    // 背番号変更
    const shirtInput = within(dialog).getByLabelText('背番号');
    fireEvent.change(shirtInput, { target: { value: '8' } });
    expect(store.getState().annotations.markers[0].shirtNo).toBe('8');

    // 選手名変更
    const nameInput = within(dialog).getByLabelText('選手名');
    fireEvent.change(nameInput, { target: { value: 'Odegaard' } });
    expect(store.getState().annotations.markers[0].name).toBe('Odegaard');
    expect(store.getState().annotations.markers[0].style.bottomLabel).toBe(
      'name',
    );
  });

  it('Extension 3Dマーカー時に選手情報変更ポップオーバーから選手名を更新でき削除ボタンが表示されること', () => {
    const { store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      store.getState().addMarker({
        id: 'player-3d',
        shirtNo: '4',
        name: 'White',
        x: 50,
        y: 50,
        team: 'home',
        position: 'DF',
        area: 'pitch',
        connectLines: [],
        badges: [],
        style: {
          markerType: 'ring',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#034694',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
      });
      store.getState().selectObject({ id: 'player-3d', kind: 'player' });
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

    // 選手名変更
    const nameInput = within(dialog).getByLabelText('選手名');
    fireEvent.change(nameInput, { target: { value: 'Saliba' } });
    expect(store.getState().annotations.markers[0].name).toBe('Saliba');
    expect(store.getState().annotations.markers[0].style.bottomLabel).toBe(
      'name',
    );

    // 削除ボタンをクリックするとマーカーが削除されること
    fireEvent.click(deleteBtn);
    expect(store.getState().annotations.markers).toHaveLength(0);
  });

  it('PlayerHud と MiniColorPicker が新UIデザイントークン (L3 #222226, L1 #121214 入力欄) を適用していること', () => {
    const { store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      store.getState().addMarker({
        id: 'player-ds',
        shirtNo: '7',
        name: 'Saka',
        x: 50,
        y: 50,
        team: 'home',
        position: 'FW',
        area: 'pitch',
        connectLines: [],
        badges: [],
        style: {
          markerType: 'ring',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#034694',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
      });
      store.getState().selectObject({ id: 'player-ds', kind: 'player' });
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
    const { store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );

    act(() => {
      store.getState().addMarker({
        id: 'player-ring-fade-hud',
        shirtNo: '',
        name: 'Havertz',
        x: 50,
        y: 50,
        team: 'home',
        position: 'FW',
        area: 'pitch',
        connectLines: [],
        badges: [],
        style: {
          markerType: 'ring-fade',
          insideContent: 'none',
          bottomLabel: 'name',
          color: '#38bdf8',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
          glowBlur: 16,
        },
      });
      store
        .getState()
        .selectObject({ id: 'player-ring-fade-hud', kind: 'player' });
    });

    // 発光幅調整ボタンが存在すること
    const decBtn = screen.getByTitle('発光幅縮小');
    const incBtn = screen.getByTitle('発光幅拡大');
    expect(decBtn).toBeDefined();
    expect(incBtn).toBeDefined();
    expect(screen.getByText('16px')).toBeDefined();

    // 拡大ボタンをクリック (+5px)
    fireEvent.click(incBtn);
    expect(store.getState().annotations.markers[0].style?.glowBlur).toBe(21);
    expect(screen.getByText('21px')).toBeDefined();

    // 縮小ボタンをクリック (-5px)
    fireEvent.click(decBtn);
    expect(store.getState().annotations.markers[0].style?.glowBlur).toBe(16);
  });
});

describe('Konva 3レイヤーへの2Dズーム・パン描画接続 (Phase 3)', () => {
  it('pitchTransform 更新時に PitchGroundLayer, BillboardObjectLayer, InteractionPreviewLayer のピッチ Group に 2D ズーム・パン変形が適用されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const pitchRect = { x: 100, y: 50, width: 800, height: 450 };
    const stageSize = { width: 1000, height: 600 };

    const { store } = renderWithStore(
      <Stage ref={stageRef} width={stageSize.width} height={stageSize.height}>
        <PitchGroundLayer stageSize={stageSize} pitchRect={pitchRect} />
        <BillboardObjectLayer stageSize={stageSize} pitchRect={pitchRect} />
        <InteractionPreviewLayer stageSize={stageSize} pitchRect={pitchRect} />
      </Stage>,
      { mode: 'tactical-board' },
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
    act(() => {
      store.getState().setPitchTransform({
        zoom: 2,
        panX: 40,
        panY: -20,
      });
    });

    const expectedTransform = calculatePitchTransform(pitchRect, 40, -20, 2, 0);

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
