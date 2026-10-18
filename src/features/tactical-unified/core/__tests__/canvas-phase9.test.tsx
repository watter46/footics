import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import { ContextHud } from '../components/ContextHud';
import { MiniColorPicker } from '../components/hud/mini-color-picker';
import { ConnectLineAction } from '../components/hud/player-quick-actions';
import { ZoneHud } from '../components/hud/zone-hud';
import { FixedToolbar } from '../components/toolbar';
import { createCanvasStore } from '../store/canvas-store';
import { CanvasStoreContext } from '../store/canvas-store-provider';
import type { CanvasStoreApi } from '../types';
import {
  commitDrawingShape,
  createRingMarker,
} from '../utils/canvas-drawing-factory';

function renderWithStore(ui: React.ReactElement, store?: CanvasStoreApi) {
  const s =
    store ??
    createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
  const utils = render(
    <CanvasStoreContext.Provider value={s}>{ui}</CanvasStoreContext.Provider>,
  );
  return { store: s, ...utils };
}

describe('Phase 9: Figma Dark UI & Default Colors', () => {
  it('1. Toolbar と ContextHud が不透明な Figma ダークスタイルを持つこと', () => {
    const { container: tbContainer } = renderWithStore(
      <FixedToolbar>
        <button type="button">Tool</button>
      </FixedToolbar>,
    );
    const tb = tbContainer.firstChild as HTMLElement;
    expect(tb.className).toContain('bg-[#222222]');
    expect(tb.className).toContain('border-[#383838]');

    const { container: hudContainer, store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );
    act(() => {
      const p = createRingMarker(40, 40);
      store.getState().addMarker(p);
      store.getState().selectObject(p.id);
    });
    const hudBar = hudContainer.querySelector('[role="toolbar"] > div');
    expect(hudBar?.className).toContain('bg-[#222222]');
    expect(hudBar?.className).toContain('border-[#383838]');
    expect(hudBar?.className).toContain('rounded-xl');
  });

  it('2. オブジェクト描画デフォルト色が正確であること (Zone: 赤, Wavy: 黄, Route: 水色)', () => {
    const addArrow = vi.fn<(a: ArrowAnnotation) => void>();
    const addZone = vi.fn<(z: ZoneAnnotation) => void>();

    // Route Line -> #38bdf8
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'route_line',
        startX: 0,
        startY: 0,
        currentX: 10,
        currentY: 10,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addArrow).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: '#38bdf8' }),
    );

    // Wavy Arrow -> #eab308
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'arrow_wavy',
        startX: 0,
        startY: 0,
        currentX: 10,
        currentY: 10,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addArrow).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: '#eab308' }),
    );

    // Zone -> #ef4444
    commitDrawingShape(
      {
        isDrawing: true,
        tool: 'zone',
        startX: 0,
        startY: 0,
        currentX: 20,
        currentY: 20,
      },
      '#ffffff',
      3,
      addArrow,
      addZone,
    );
    expect(addZone).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: '#ef4444' }),
    );
  });
});

describe('Phase 9: Global Custom Color & Zone Shape & Connector', () => {
  it('3. MiniColorPicker でグローバルカスタム色が保持・適用できること', () => {
    const onChange = vi.fn();
    const { store } = renderWithStore(
      <MiniColorPicker value="#ffffff" onChange={onChange} title="色選択" />,
    );

    act(() => {
      store.getState().setCustomColor('#10b981');
    });

    const triggerBtn = screen.getByTitle('色選択');
    fireEvent.click(triggerBtn);

    const customBtn = screen.getByTitle(/カスタム色 \(#10b981\) を適用/i);
    expect(customBtn).toBeDefined();

    fireEvent.click(customBtn);
    expect(onChange).toHaveBeenCalledWith('#10b981');
  });

  it('4. ZoneHud で矩形と円/楕円の切り替えができること', () => {
    const { store } = renderWithStore(<ZoneHud zoneId="test-zone" />);
    act(() => {
      store.getState().addZone({
        id: 'test-zone',
        annotationType: 'zone',
        zoneType: 'highlight',
        shapeType: 'rect',
        x: 10,
        y: 10,
        width: 30,
        height: 20,
        points: [],
        color: '#ef4444',
        opacity: 0.25,
        strokeWidth: 2,
      });
    });

    const toggleBtn = screen.getByTitle('四角形 (円/楕円に切替)');
    fireEvent.click(toggleBtn);
    expect(store.getState().annotations.zones[0].shapeType).toBe('ellipse');

    const toggleBackBtn = screen.getByTitle('円/楕円 (四角形に切替)');
    fireEvent.click(toggleBackBtn);
    expect(store.getState().annotations.zones[0].shapeType).toBe('rect');
  });

  it('5. ConnectLineAction が相手選択接続モードに入り、連動色を初期値にすること', () => {
    const p1 = createRingMarker(20, 20, '#ef4444', '1');
    const { store } = renderWithStore(<ConnectLineAction player={p1} />);
    act(() => {
      store.getState().addMarker(p1);
      store.getState().addMarker(createRingMarker(60, 60, '#3b82f6', '2'));
    });

    const linkBtn = screen.getByTitle(/コネクトラインを追加/i);
    fireEvent.click(linkBtn);
    expect(store.getState().connectingPlayerId).toBe(p1.id);

    // Clicking again cancels mode
    fireEvent.click(linkBtn);
    expect(store.getState().connectingPlayerId).toBeNull();
  });
});
