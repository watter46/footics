import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createCanvasStore } from '../../../store/canvas-store';
import { CanvasStoreContext } from '../../../store/canvas-store-provider';
import type { CanvasStoreApi } from '../../../types';
import {
  DraggableToolbar,
  EXTENSION_DRAWING_TOOLS,
  FixedToolbar,
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
  it('EXTENSION_DRAWING_TOOLS に 2D 選手マーカーが含まれず、3D リングが含まれること', () => {
    const toolIds = EXTENSION_DRAWING_TOOLS.map((t) => t.id);
    expect(toolIds).not.toContain('player');
    expect(toolIds).toContain('player-ring');
  });

  it('WEB_DRAWING_TOOLS に 2D 選手マーカーと 3D リングの両方が含まれること', () => {
    const toolIds = WEB_DRAWING_TOOLS.map((t) => t.id);
    expect(toolIds).toContain('player');
    expect(toolIds).toContain('player-ring');
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
});
