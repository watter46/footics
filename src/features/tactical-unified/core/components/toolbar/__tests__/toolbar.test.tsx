import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createDocumentStore } from '../../../../stores/document-store';
import { selectDomainActiveSlide } from '../../../../stores/domain-selectors';
import { createSessionStore } from '../../../../stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '../../../../stores/tactical-store-provider';
import { CoreDrawingToolbar } from '../../CoreDrawingToolbar';
import {
  DraggableToolbar,
  EXTENSION_DRAWING_TOOLS,
  FixedToolbar,
  getDrawingTools,
  getToolShortcutMap,
  registerDrawingToolPlugin,
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
  initialProject = createDefaultTacticalProject(),
) {
  const phase = initialProject.phases[0];
  const slide = phase?.slides[0];
  if (!phase || !slide) {
    throw new Error('Default project must have at least one phase and slide');
  }
  const documentStore = createDocumentStore(initialProject);
  const sessionStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide.id,
  });
  const utils = render(
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      {ui}
    </TacticalStoreProvider>,
  );
  return {
    documentStore,
    sessionStore,
    phaseId: phase.id,
    slideId: slide.id,
    ...utils,
  };
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
    const project = createDefaultTacticalProject();
    const initialSlide = project.phases[0]?.slides[0];
    if (initialSlide) {
      initialSlide.arrows.push({
        id: 'test-arr',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: 0 as never, y: 0 as never },
          { x: 10 as never, y: 10 as never },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        startMarker: 'none',
        endMarker: 'arrow',
      });
    }

    const { documentStore, sessionStore, phaseId, slideId } = renderWithStore(
      <DraggableToolbar>
        <ToolbarToolsGroup tools={EXTENSION_DRAWING_TOOLS} />
        <ToolbarDivider />
        <ToolbarContinuousLock />
        <ToolbarEraser />
        <ToolbarDivider />
        <ToolbarResetButton />
      </DraggableToolbar>,
      project,
    );

    // Initial tool is select
    expect(sessionStore.getState().activeTool).toBe('select');

    // Click line tool
    const lineBtn = screen.getByTitle('Straight Line (L)');
    fireEvent.click(lineBtn);
    expect(sessionStore.getState().activeTool).toBe('line');
    expect(documentStore.getState().past).toHaveLength(0);

    // Continuous lock
    const continuousBtn = screen.getByTitle(/Continuous Draw/i);
    fireEvent.click(continuousBtn);
    expect(sessionStore.getState().continuousDrawing).toBe(true);
    expect(documentStore.getState().past).toHaveLength(0);

    // Eraser
    const eraserBtn = screen.getByTitle(/Eraser/i);
    fireEvent.click(eraserBtn);
    expect(sessionStore.getState().activeTool).toBe('eraser');
    expect(documentStore.getState().past).toHaveLength(0);

    // Reset button
    const beforeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(beforeSlide?.arrows).toHaveLength(1);
    const initialPlayerCount = beforeSlide?.players.length ?? 0;
    expect(initialPlayerCount).toBeGreaterThan(0);

    window.confirm = vi.fn(() => true);
    const resetBtn = screen.getByTitle('Reset all annotations');
    fireEvent.click(resetBtn);
    expect(window.confirm).toHaveBeenCalled();

    const afterSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(afterSlide?.arrows).toHaveLength(0);
    expect(afterSlide?.players).toHaveLength(initialPlayerCount);
  });

  it('ToolbarPitchLock が単体で動作し documentStore の pitchTransform.isLocked を反転すること', () => {
    const { documentStore, phaseId, slideId } = renderWithStore(
      <div>
        <ToolbarPitchLock />
      </div>,
    );

    const initialSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(initialSlide?.pitchTransform?.isLocked ?? true).toBe(true);

    const pitchBtn = screen.getByTitle(/Pitch Lock/i);
    fireEvent.click(pitchBtn);

    const unlockedSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(unlockedSlide?.pitchTransform?.isLocked).toBe(false);

    fireEvent.click(pitchBtn);
    const relockedSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(relockedSlide?.pitchTransform?.isLocked).toBe(true);
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

    it('CoreDrawingToolbar で showPitchLock Props に基づいて ToolbarPitchLock が制御されること', () => {
      // showPitchLock={false} では非表示
      const { unmount } = renderWithStore(
        <CoreDrawingToolbar showPitchLock={false} />,
      );
      expect(screen.queryByTitle(/Pitch Lock/i)).toBeNull();
      unmount();

      // showPitchLock={true} では表示
      const { unmount: unmount2 } = renderWithStore(
        <CoreDrawingToolbar showPitchLock={true} />,
      );
      expect(screen.getByTitle(/Pitch Lock/i)).toBeDefined();
      unmount2();

      // showPitchLock 省略時はデフォルト true で表示
      renderWithStore(<CoreDrawingToolbar />);
      expect(screen.getByTitle(/Pitch Lock/i)).toBeDefined();
    });
  });

  describe('Drawing Tool Plugin Registry & Shortcuts', () => {
    it('getToolShortcutMap が規定のショートカットマッピングを返すこと (select のみ)', () => {
      const map = getToolShortcutMap();
      expect(map).toEqual({
        v: 'select',
      });
      expect(map.d).toBeUndefined();
      expect(map.r).toBeUndefined();
      expect(map.w).toBeUndefined();
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
