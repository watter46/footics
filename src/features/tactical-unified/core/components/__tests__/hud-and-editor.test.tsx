import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import type { CanvasConfig, CanvasStoreApi } from '../../types';
import { BoundaryBoxHud } from '../BoundaryBoxHud';
import { ContextHud } from '../ContextHud';
import { CoreDrawingToolbar } from '../CoreDrawingToolbar';
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

    const opacityBtn = screen.getByTitle('不透明度 (クリックで切替)');
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
  it('BoundaryBoxHud で 4:5 などの比率ボタン押下時に boundaryBox が中央スナップすること', () => {
    const { store } = renderWithStore(
      <BoundaryBoxHud
        stageSize={{ width: 800, height: 600 }}
        showTiltControls={true}
      />,
      {
        defaultBoundaryBox: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          enabled: true,
          visible: true,
        },
      },
    );

    const toggleBtn = screen.getByRole('button', {
      name: /Toggle Boundary Box Settings/i,
    });
    fireEvent.click(toggleBtn);

    const btn45 = screen.getByRole('button', {
      name: /Snap boundary to 4:5/i,
    });
    fireEvent.click(btn45);

    const updatedBox = store.getState().boundaryBox;
    expect(updatedBox.visible).toBe(true);
    // 4:5 aspect ratio on 16:9 canvas centers horizontally
    expect(updatedBox.height).toBe(100);
    expect(updatedBox.width).toBeCloseTo(45, 0);
    expect(updatedBox.x).toBeGreaterThan(0);
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
    const { store } = renderWithStore(<CoreDrawingToolbar />);

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
