import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createCanvasStore } from '../../../store/canvas-store';
import { CanvasStoreContext } from '../../../store/canvas-store-provider';
import type { CanvasStoreApi } from '../../../types';
import { CoreDrawingToolbar } from '../../CoreDrawingToolbar';
import {
  DraggableToolbar,
  EXTENSION_DRAWING_TOOLS,
  FixedToolbar,
  getDrawingTools,
  getToolShortcutMap,
  registerDrawingToolPlugin,
  ToolbarBoundaryBoxToggle,
  ToolbarContinuousLock,
  ToolbarDivider,
  ToolbarEraser,
  ToolbarPitchLock,
  ToolbarResetButton,
  ToolbarToolsGroup,
  WEB_DRAWING_TOOLS,
} from '../index';

function renderWithStore(
  ui: React.ReactElement,
  initialStore?: CanvasStoreApi,
) {
  const store =
    initialStore ??
    createCanvasStore({
      mode: 'screenshot-edit',
      aspectRatio: '16:9',
    });
  const utils = render(
    <CanvasStoreContext.Provider value={store}>
      {ui}
    </CanvasStoreContext.Provider>,
  );
  return { store, ...utils };
}

describe('Toolbar Compound Components & Registry', () => {
  it('EXTENSION_DRAWING_TOOLS に 2D 選手マーカーが含まれず、3D リングおよび 3D Fade リングが含まれること', () => {
    const toolIds = EXTENSION_DRAWING_TOOLS.map((t) => t.id);
    expect(toolIds).not.toContain('player');
    expect(toolIds).toContain('player-ring');
    expect(toolIds).toContain('player-ring-fade');
  });

  it('WEB_DRAWING_TOOLS から 2D 選手マーカーと 3D リングが除外されていること（Squad 一元化）', () => {
    const toolIds = WEB_DRAWING_TOOLS.map((t) => t.id);
    expect(toolIds).not.toContain('player');
    expect(toolIds).not.toContain('player-ring');
  });

  it('DraggableToolbar と ToolbarToolsGroup が連携してツールを切り替えられること', () => {
    const { store } = renderWithStore(
      <DraggableToolbar>
        <ToolbarToolsGroup tools={EXTENSION_DRAWING_TOOLS} />
        <ToolbarDivider />
        <ToolbarContinuousLock />
        <ToolbarEraser />
        <ToolbarDivider />
        <ToolbarResetButton />
      </DraggableToolbar>,
    );

    // Initial tool is select
    expect(store.getState().activeTool).toBe('select');

    // Click line tool
    const lineBtn = screen.getByTitle('Straight Line (L)');
    fireEvent.click(lineBtn);
    expect(store.getState().activeTool).toBe('line');

    // Continuous lock
    const continuousBtn = screen.getByTitle(/Continuous Draw/i);
    fireEvent.click(continuousBtn);
    expect(store.getState().continuousDrawing).toBe(true);

    // Eraser
    const eraserBtn = screen.getByTitle(/Eraser/i);
    fireEvent.click(eraserBtn);
    expect(store.getState().activeTool).toBe('eraser');

    // Reset button
    store.getState().addArrow({
      id: 'test-arr',
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
    expect(store.getState().annotations.arrows).toHaveLength(1);

    window.confirm = vi.fn(() => true);
    const resetBtn = screen.getByTitle('Reset all annotations');
    fireEvent.click(resetBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(store.getState().annotations.arrows).toHaveLength(0);
  });

  it('ToolbarPitchLock と ToolbarBoundaryBoxToggle が単体で動作すること', () => {
    const { store } = renderWithStore(
      <div>
        <ToolbarPitchLock />
        <ToolbarBoundaryBoxToggle />
      </div>,
    );

    expect(store.getState().pitchTransform.isLocked).toBe(false);
    const pitchBtn = screen.getByTitle(/Pitch Lock/i);
    fireEvent.click(pitchBtn);
    expect(store.getState().pitchTransform.isLocked).toBe(true);

    expect(store.getState().boundaryBox.visible).toBe(false);
    const bboxBtn = screen.getByTitle(/Boundary Box/i);
    fireEvent.click(bboxBtn);
    expect(store.getState().boundaryBox.visible).toBe(true);
  });

  it('FixedToolbar が右側固定配置スタイルを持つこと', () => {
    const { container } = renderWithStore(
      <FixedToolbar>
        <span data-testid="child">item</span>
      </FixedToolbar>,
    );

    const toolbarEl = container.firstChild as HTMLElement;
    expect(toolbarEl).toBeDefined();
    expect(toolbarEl.style.right).toBe('var(--toolbar-right, 12px)');
    expect(toolbarEl.style.transform).toBe(
      'var(--toolbar-transform, translateY(-50%))',
    );
  });

  describe('getDrawingTools and CoreDrawingToolbar markerMode filtering', () => {
    it('getDrawingTools が markerMode に応じてツールリストを生成すること', () => {
      const defaultTools = getDrawingTools();
      const defaultIds = defaultTools.map((t) => t.id);
      expect(defaultIds).not.toContain('player');
      expect(defaultIds).not.toContain('player-ring');

      const tools2d = getDrawingTools('2d-only');
      const ids2d = tools2d.map((t) => t.id);
      expect(ids2d).not.toContain('player');
      expect(ids2d).not.toContain('player-ring');

      const tools3d = getDrawingTools('3d-only');
      const ids3d = tools3d.map((t) => t.id);
      expect(ids3d).not.toContain('player');
      expect(ids3d).toContain('player-ring');

      const toolsAll = getDrawingTools('all');
      const idsAll = toolsAll.map((t) => t.id);
      expect(idsAll).toContain('player');
      expect(idsAll).toContain('player-ring');
    });

    it('CoreDrawingToolbar で markerMode="2d-only" 時に 2D マーカーが表示されないこと（Squad 一元化）', () => {
      renderWithStore(<CoreDrawingToolbar markerMode="2d-only" />);
      expect(screen.queryByTestId('tool-player')).toBeNull();
      expect(screen.queryByTestId('tool-player-ring')).toBeNull();
    });

    it('CoreDrawingToolbar で markerMode 省略時にデフォルトで 2D マーカーが表示されないこと（Squad 一元化）', () => {
      renderWithStore(<CoreDrawingToolbar />);
      expect(screen.queryByTestId('tool-player')).toBeNull();
      expect(screen.queryByTestId('tool-player-ring')).toBeNull();
    });

    it('CoreDrawingToolbar で markerMode="3d-only" 時に 3D リングのみ表示されること', () => {
      renderWithStore(<CoreDrawingToolbar markerMode="3d-only" />);
      expect(screen.getByTestId('tool-player-ring')).toBeDefined();
      expect(screen.queryByTestId('tool-player')).toBeNull();
    });

    it('CoreDrawingToolbar で markerMode="all" 時に 2D マーカーと 3D リングの両方が表示されること', () => {
      renderWithStore(<CoreDrawingToolbar markerMode="all" />);
      expect(screen.getByTestId('tool-player')).toBeDefined();
      expect(screen.getByTestId('tool-player-ring')).toBeDefined();
    });

    it('CoreDrawingToolbar で capabilities.hasPitchLock に基づいて ToolbarPitchLock が制御されること', () => {
      // mode: 'screenshot-edit' では hasPitchLock = false なので非表示
      const { unmount } = renderWithStore(
        <CoreDrawingToolbar />,
        createCanvasStore({ mode: 'screenshot-edit' }),
      );
      expect(screen.queryByTitle(/Pitch Lock/i)).toBeNull();
      unmount();

      // mode: 'tactical-board' では hasPitchLock = true なので表示
      const { unmount: unmount2 } = renderWithStore(
        <CoreDrawingToolbar />,
        createCanvasStore({ mode: 'tactical-board' }),
      );
      expect(screen.getByTitle(/Pitch Lock/i)).toBeDefined();
      unmount2();

      // showPitchLock prop での上書きも可能であること
      renderWithStore(
        <CoreDrawingToolbar showPitchLock={false} />,
        createCanvasStore({ mode: 'tactical-board' }),
      );
      expect(screen.queryByTitle(/Pitch Lock/i)).toBeNull();
    });
  });

  describe('Drawing Tool Plugin Registry & Shortcuts', () => {
    it('getToolShortcutMap が規定のショートカットマッピングを返すこと', () => {
      const map = getToolShortcutMap();
      expect(map).toMatchObject({
        v: 'select',
        l: 'line',
        r: 'route_line',
        a: 'arrow_solid',
        d: 'arrow_dash',
        w: 'arrow_wavy',
        z: 'zone_circle',
        p: 'polygon_zone',
        t: 'text',
        m: 'player',
        o: 'player-ring',
        e: 'eraser',
      });
    });

    it('registerDrawingToolPlugin で新しいツールが登録され、getDrawingTools や getToolShortcutMap に反映されること', () => {
      const DummyIcon = () => null;
      registerDrawingToolPlugin({
        id: 'test_tool' as never,
        label: 'Test Tool (K)',
        icon: DummyIcon,
        shortcutKey: 'k',
        visibility: 'core',
      });

      const tools = getDrawingTools('2d-only');
      expect(tools.some((t) => (t.id as string) === 'test_tool')).toBe(true);

      const map = getToolShortcutMap();
      expect(map.k).toBe('test_tool');
    });
  });
});
