import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import {
  createDefaultSlide,
  type TacticalPhase,
} from '@/lib/types/tactical-unified';
import { LeftPanel } from '../left-panel';
import { SceneCanvasThumbnail } from '../scene-canvas-thumbnail';

vi.mock('@/lib/tactical/export/tactical-frame-renderer', () => ({
  renderTacticalFrameToCanvas: vi.fn(),
}));

describe('LeftPanel (Phase Structuring & PowerPoint-style nested panel)', () => {
  const dummyPhases: TacticalPhase[] = [
    {
      id: 'phase-1',
      name: 'Build-up Phase',
      slides: [
        {
          ...createDefaultSlide(0, 'slide-1-1'),
          label: 'Initial Formation',
          pauseMs: 500,
        },
        {
          ...createDefaultSlide(1, 'slide-1-2'),
          label: 'Progression',
          pauseMs: 1000,
        },
      ],
    },
    {
      id: 'phase-2',
      name: 'Finishing Phase',
      slides: [
        {
          ...createDefaultSlide(0, 'slide-2-1'),
          label: 'Final Pass',
          pauseMs: 800,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all phases with scene counts and active phase expanded', () => {
    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
      />,
    );

    // Header title
    expect(screen.getByText('Tactical Phases')).toBeDefined();

    // Phase names
    expect(screen.getByText('Build-up Phase')).toBeDefined();
    expect(screen.getByText('Finishing Phase')).toBeDefined();

    // Scene count badges
    expect(screen.getByText('2 scenes')).toBeDefined();
    expect(screen.getByText('1 scene')).toBeDefined();

    // Active phase slides should be visible
    expect(screen.getByText('Initial Formation')).toBeDefined();
    expect(screen.getByText('Progression')).toBeDefined();

    // Collapsed phase slides should not be visible
    expect(screen.queryByText('Final Pass')).toBeNull();
  });

  it('toggles phase expansion when clicking accordion header', () => {
    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
      />,
    );

    // Initially phase-2 is collapsed
    expect(screen.queryByText('Final Pass')).toBeNull();

    // Click to expand phase-2
    const phase2Header = screen.getByText('Finishing Phase');
    fireEvent.click(phase2Header);

    // Now phase-2 slide is visible
    expect(screen.getByText('Final Pass')).toBeDefined();
  });

  it('calls onSelectScene when a scene card is clicked', () => {
    const onSelectSceneSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onSelectScene={onSelectSceneSpy}
      />,
    );

    const scene2 = screen.getByText('Progression');
    fireEvent.click(scene2);

    expect(onSelectSceneSpy).toHaveBeenCalledWith('phase-1', 'slide-1-2');
  });

  it('supports selecting a scene with Enter key on scene card', () => {
    const onSelectSceneSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onSelectScene={onSelectSceneSpy}
      />,
    );

    const scene2Card = screen
      .getByText('Progression')
      .closest('[role="button"]')!;
    fireEvent.keyDown(scene2Card, { key: 'Enter', code: 'Enter' });

    expect(onSelectSceneSpy).toHaveBeenCalledWith('phase-1', 'slide-1-2');
  });

  it('calls onAddPhase when clicking "＋ 新規フェーズ" button', () => {
    const onAddPhaseSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onAddPhase={onAddPhaseSpy}
      />,
    );

    const addPhaseBtn = screen.getByRole('button', { name: /新規フェーズ/i });
    fireEvent.click(addPhaseBtn);

    expect(onAddPhaseSpy).toHaveBeenCalled();
  });

  it('calls onAddSlideToPhase when clicking plus button in phase section', () => {
    const onAddSlideToPhaseSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onAddSlideToPhase={onAddSlideToPhaseSpy}
      />,
    );

    const addSlideBtn = screen.getByLabelText('Add scene to Build-up Phase');
    fireEvent.click(addSlideBtn);

    expect(onAddSlideToPhaseSpy).toHaveBeenCalledWith('phase-1');
  });

  it('allows inline renaming of a phase', () => {
    const onRenamePhaseSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onRenamePhase={onRenamePhaseSpy}
      />,
    );

    const renameBtn = screen.getByLabelText('Rename Build-up Phase');
    fireEvent.click(renameBtn);

    const input = screen.getByDisplayValue('Build-up Phase');
    fireEvent.change(input, { target: { value: 'High Press Phase' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onRenamePhaseSpy).toHaveBeenCalledWith(
      'phase-1',
      'High Press Phase',
    );
  });

  it('cancels inline renaming on Escape key', () => {
    const onRenamePhaseSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onRenamePhase={onRenamePhaseSpy}
      />,
    );

    const renameBtn = screen.getByLabelText('Rename Build-up Phase');
    fireEvent.click(renameBtn);

    const input = screen.getByDisplayValue('Build-up Phase');
    fireEvent.change(input, { target: { value: 'High Press Phase' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(onRenamePhaseSpy).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('High Press Phase')).toBeNull();
  });

  it('shows confirmation dialog when deleting a phase and confirms deletion', () => {
    const onDeletePhaseSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onDeletePhase={onDeletePhaseSpy}
      />,
    );

    const deleteBtn = screen.getByLabelText('Delete Build-up Phase');
    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    expect(screen.getByText(/フェーズを削除しますか/i)).toBeDefined();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /削除する/i });
    fireEvent.click(confirmBtn);

    expect(onDeletePhaseSpy).toHaveBeenCalledWith('phase-1');
  });

  it('cancels deletion when clicking cancel in confirmation dialog', () => {
    const onDeletePhaseSpy = vi.fn();

    render(
      <LeftPanel
        phases={dummyPhases}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
        onDeletePhase={onDeletePhaseSpy}
      />,
    );

    const deleteBtn = screen.getByLabelText('Delete Build-up Phase');
    fireEvent.click(deleteBtn);

    const cancelBtn = screen.getByRole('button', { name: /キャンセル/i });
    fireEvent.click(cancelBtn);

    expect(onDeletePhaseSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/フェーズを削除しますか/i)).toBeNull();
  });

  it('disables delete button when only one phase exists', () => {
    render(
      <LeftPanel
        phases={[dummyPhases[0]!]}
        activePhaseId="phase-1"
        activeSlideId="slide-1-1"
      />,
    );

    const deleteBtn = screen.getByLabelText('Delete Build-up Phase');
    expect(deleteBtn.hasAttribute('disabled')).toBe(true);
  });

  it('handles empty phases list gracefully', () => {
    const onAddPhaseSpy = vi.fn();
    render(<LeftPanel phases={[]} onAddPhase={onAddPhaseSpy} />);

    expect(screen.getByText('フェーズが登録されていません')).toBeDefined();
    const addBtn = screen.getByRole('button', { name: /フェーズを追加/i });
    fireEvent.click(addBtn);

    expect(onAddPhaseSpy).toHaveBeenCalled();
  });

  describe('SceneCanvasThumbnail', () => {
    it('renders SceneCanvasThumbnail and calls renderTacticalFrameToCanvas with valid options', () => {
      // Setup HTMLCanvasElement mock for getContext in JSDOM
      const mockCtx = {
        save: vi.fn(),
        scale: vi.fn(),
        restore: vi.fn(),
      };
      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

      const slide = dummyPhases[0]!.slides[0]!;
      const { container } = render(
        <SceneCanvasThumbnail
          slide={slide}
          width={100}
          height={60}
          aspectRatio="16:9"
        />,
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
      expect(renderTacticalFrameToCanvas).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          slides: [slide],
          timeMs: 0,
          width: 100,
          height: 60,
          aspectRatio: '16:9',
        }),
      );

      getContextSpy.mockRestore();
    });

    it('calculates aspect ratios correctly for 9:16, 4:5, and 1:1', () => {
      const mockCtx = {
        save: vi.fn(),
        scale: vi.fn(),
        restore: vi.fn(),
      };
      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

      const slide = dummyPhases[0]!.slides[0]!;
      const { rerender } = render(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="9:16" />,
      );
      expect(renderTacticalFrameToCanvas).toHaveBeenLastCalledWith(
        mockCtx,
        expect.objectContaining({
          width: 100,
          height: 178, // round(100 * 16 / 9)
          aspectRatio: '9:16',
        }),
      );

      rerender(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="4:5" />,
      );
      expect(renderTacticalFrameToCanvas).toHaveBeenLastCalledWith(
        mockCtx,
        expect.objectContaining({
          width: 100,
          height: 125, // round(100 * 5 / 4)
          aspectRatio: '4:5',
        }),
      );

      rerender(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="1:1" />,
      );
      expect(renderTacticalFrameToCanvas).toHaveBeenLastCalledWith(
        mockCtx,
        expect.objectContaining({
          width: 100,
          height: 100,
          aspectRatio: '1:1',
        }),
      );

      getContextSpy.mockRestore();
    });
  });
});
