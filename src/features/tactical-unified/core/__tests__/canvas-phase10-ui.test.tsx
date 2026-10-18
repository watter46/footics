import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasOverlays } from '../components/CanvasOverlays';
import { ContextHud } from '../components/ContextHud';
import { MiniColorPicker } from '../components/hud/mini-color-picker';
import { FixedToolbar, ToolbarToolsGroup } from '../components/toolbar';
import { WEB_DRAWING_TOOLS } from '../components/toolbar/drawing-tool-plugin';
import { useCanvasShortcuts } from '../hooks/use-canvas-shortcuts';
import { createCanvasStore } from '../store/canvas-store';
import { CanvasStoreContext } from '../store/canvas-store-provider';
import type { CanvasStoreApi } from '../types';
import { createRingMarker } from '../utils/canvas-drawing-factory';

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

function ShortcutListener() {
  useCanvasShortcuts();
  return null;
}

describe('TASK-003 Phase 10: Edge CSS & Color Options & Connector UI/UX', () => {
  it('1. FixedToolbar と ContextHud が不透明ダークのインラインスタイルを持つこと', () => {
    const { container: tbContainer } = renderWithStore(
      <FixedToolbar>
        <button type="button">Tool</button>
      </FixedToolbar>,
    );
    const tb = tbContainer.firstChild as HTMLElement;
    expect(tb.style.backgroundColor).toMatch(/#222222|rgb\(34, 34, 34\)/);
    expect(tb.style.borderColor).toMatch(/#383838|rgb\(56, 56, 56\)/);
    expect(tb.style.color).toMatch(/#ffffff|rgb\(255, 255, 255\)/);

    const { container: hudContainer, store } = renderWithStore(
      <ContextHud stageSize={{ width: 800, height: 600 }} />,
    );
    act(() => {
      const p = createRingMarker(40, 40);
      store.getState().addMarker(p);
      store.getState().selectObject(p.id);
    });
    const hudInner = hudContainer.querySelector(
      '[role="toolbar"] > div',
    ) as HTMLElement;
    expect(hudInner.style.backgroundColor).toMatch(/#222222|rgb\(34, 34, 34\)/);
    expect(hudInner.style.borderColor).toMatch(/#383838|rgb\(56, 56, 56\)/);
    expect(hudInner.style.color).toMatch(/#ffffff|rgb\(255, 255, 255\)/);
  });

  it('2. MiniColorPicker のドロップダウンとスウォッチがコンパクトに固定され、選択枠を持つこと', () => {
    const { container } = renderWithStore(
      <MiniColorPicker value="#ffffff" onChange={() => {}} title="カラー" />,
    );
    const trigger = screen.getByTitle('カラー');
    fireEvent.click(trigger);

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeDefined();
    expect(dialog.style.width).toBe('192px');
    expect(dialog.style.backgroundColor).toMatch(/#222222|rgb\(34, 34, 34\)/);

    const whiteSwatch = screen.getByTitle('White (#ffffff)');
    expect(whiteSwatch.style.width).toBe('24px');
    expect(whiteSwatch.style.height).toBe('24px');
    expect(whiteSwatch.style.boxShadow).toContain('#0d99ff');
  });

  it('3. ToolbarToolsGroup のアクティブツールにアクセント背景色が付与されること', () => {
    const { store } = renderWithStore(
      <ToolbarToolsGroup tools={WEB_DRAWING_TOOLS} />,
    );
    act(() => {
      store.getState().setActiveTool('select');
    });
    const selectBtn = screen.getByTestId('tool-select');
    expect(selectBtn.style.backgroundColor).toMatch(
      /#0d99ff|rgb\(13, 153, 255\)/,
    );
    expect(selectBtn.style.color).toMatch(/#ffffff|rgb\(255, 255, 255\)/);

    const arrowBtn = screen.getByTestId('tool-arrow_solid');
    expect(arrowBtn.style.backgroundColor).toBe('');
  });

  it('4. 接続待機中にガイダンスバッジが表示され、ESCキーで解除されること', () => {
    const { store } = renderWithStore(
      <>
        <ShortcutListener />
        <CanvasOverlays
          vRect={{ width: 800, height: 600 }}
          editingText={null}
          onSaveText={() => {}}
          onRemoveText={() => {}}
          onCloseText={() => {}}
        />
      </>,
    );

    expect(screen.queryByTestId('connecting-guidance-badge')).toBeNull();

    act(() => {
      store.getState().setConnectingPlayerId('player-1');
    });

    const badge = screen.getByTestId('connecting-guidance-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('接続先マーカーをクリックしてください');

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(store.getState().connectingPlayerId).toBeNull();
    expect(screen.queryByTestId('connecting-guidance-badge')).toBeNull();
  });
});
