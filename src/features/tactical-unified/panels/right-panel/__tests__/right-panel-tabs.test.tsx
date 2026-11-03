import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { CameraControlPanel } from '../camera-control-panel';
import { FormationPanel } from '../formation-panel';
import { RightPanel } from '../right-panel';
import { SquadSubPanel } from '../squad-sub-panel';

describe('RightPanel Tab & Sub-components Architecture', () => {
  beforeEach(() => {
    const mockCtx = new Proxy(
      {
        getImageData: () => ({ data: new Array(4) }),
        createImageData: () => [],
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        measureText: () => ({ width: 0 }),
        getLineDash: () => [],
        isPointInPath: () => true,
      } as Record<string, unknown>,
      {
        get: (target, prop: string) =>
          prop in target ? target[prop] : vi.fn(),
      },
    );
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setWorkspaceMode('board');
  });

  it('renders RightPanel collapsed by default and opens tabs correctly in board mode', () => {
    render(<RightPanel />);

    // Initially collapsed: board tabs exist, director tabs do not
    expect(screen.getByRole('button', { name: /formation/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /squad/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /pitch/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /camera/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /screen/i })).toBeNull();
    expect(screen.queryByText('Formation Presets')).toBeNull();

    // Clicking formation rail button expands panel and shows content
    fireEvent.click(screen.getByRole('button', { name: /formation/i }));
    expect(screen.getByText('Formation Presets')).toBeDefined();

    // Switch to Squad tab
    fireEvent.click(screen.getByRole('radio', { name: /squad/i }));
    expect(screen.getByText('Squad & Bench')).toBeDefined();

    // Collapse panel with collapse button
    fireEvent.click(screen.getByRole('button', { name: /collapse panel/i }));
    expect(screen.queryByText('Squad & Bench')).toBeNull();
  });

  it('switches tabs to Camera and Screen in director mode', () => {
    useTacticalUnifiedStore.getState().setWorkspaceMode('director');
    useTacticalUnifiedStore.getState().setRightPanelOpen(false);
    render(<RightPanel />);

    // Collapsed state: director tabs exist, board tabs do not
    expect(screen.queryByRole('button', { name: /formation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /squad/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /pitch/i })).toBeNull();
    expect(screen.getByRole('button', { name: /camera/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /screen/i })).toBeDefined();

    // Open Camera tab
    fireEvent.click(screen.getByRole('button', { name: /camera/i }));
    expect(screen.getByText('Camera Controls')).toBeDefined();

    // Segmented control should only have Camera and Screen
    expect(screen.getByRole('radio', { name: /camera/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /screen/i })).toBeDefined();
    expect(screen.queryByRole('radio', { name: /formation/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /pitch/i })).toBeNull();
  });

  it('CameraControlPanel updates pitch transform via presets, sliders, number inputs, and reset', () => {
    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    render(<CameraControlPanel />);

    expect(screen.getByText('Camera Controls')).toBeDefined();

    // Check zoom and pan display
    expect(screen.getByText(/1\.0x/)).toBeDefined();

    // Presets: click shallow front preset (15° / 90°)
    const shallowFrontBtn = screen.getByRole('button', {
      name: /浅い俯瞰（正面）|shallow-front/i,
    });
    fireEvent.click(shallowFrontBtn);

    let activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(activeSlide?.pitchTransform?.tilt).toBe(15);
    expect(activeSlide?.pitchTransform?.yaw).toBe(90);

    // Tilt slider and input change
    const tiltInput = screen.getByLabelText(/tilt/i, {
      selector: 'input[type="number"]',
    });
    fireEvent.change(tiltInput, { target: { value: '45' } });
    activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(activeSlide?.pitchTransform?.tilt).toBe(45);

    const tiltSlider = screen.getByLabelText(/tilt/i, {
      selector: 'input[type="range"]',
    });
    fireEvent.change(tiltSlider, { target: { value: '30' } });
    activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(activeSlide?.pitchTransform?.tilt).toBe(30);

    // Yaw slider and input change
    const yawInput = screen.getByLabelText(/yaw/i, {
      selector: 'input[type="number"]',
    });
    fireEvent.change(yawInput, { target: { value: '120' } });
    activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(activeSlide?.pitchTransform?.yaw).toBe(120);

    const yawSlider = screen.getByLabelText(/yaw/i, {
      selector: 'input[type="range"]',
    });
    fireEvent.change(yawSlider, { target: { value: '75' } });
    activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(activeSlide?.pitchTransform?.yaw).toBe(75);

    // Reset button
    const resetBtn = screen.getByRole('button', { name: /reset camera/i });
    fireEvent.click(resetBtn);
    activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(activeSlide?.pitchTransform?.tilt).toBe(0);
    expect(activeSlide?.pitchTransform?.yaw).toBe(90);
    expect(activeSlide?.pitchTransform?.zoom).toBe(1);
    expect(activeSlide?.pitchTransform?.panX).toBe(0);
    expect(activeSlide?.pitchTransform?.panY).toBe(0);
  });

  it('FormationPanel allows applying formation and changing team', () => {
    render(<FormationPanel />);

    expect(screen.getByText('Formation Presets')).toBeDefined();
    // Open More Formations accordion
    const moreBtn = screen.getByText(/More Formations/i);
    fireEvent.click(moreBtn);
    expect(screen.getByPlaceholderText('Search formations...')).toBeDefined();

    // Switch team to AWAY using text match
    const awayBtn = screen.getByText('AWAY').closest('button');
    expect(awayBtn).toBeDefined();
    if (awayBtn) fireEvent.click(awayBtn);

    // Apply a formation like 4-4-2
    const formation442 = screen.getAllByRole('button', { name: '4-4-2' })[0];
    fireEvent.click(formation442);

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const awayPitch = activeSlide?.players.filter(
      (p) => p.team === 'away' && p.area === 'pitch',
    );
    expect(awayPitch?.length).toBe(11);
  });

  it('SquadSubPanel renders bench player in tactical-bench-canvas sub-canvas', () => {
    const store = useTacticalUnifiedStore.getState();
    const activeSlideId = store.activeSlideId;

    // Add custom bench player
    const playerId = store.addCustomPlayer(
      activeSlideId,
      'home',
      'Deploy Sub',
      '12',
      'GK',
      'bench',
    );

    const { container } = render(<SquadSubPanel />);

    expect(screen.getByText('Squad & Bench')).toBeDefined();

    // Sub-canvas container exists
    const canvas = container.querySelector('#tactical-bench-canvas');
    expect(canvas).not.toBeNull();

    // Old bench DOM card Remove button does not exist
    expect(screen.queryByTitle('Remove')).toBeNull();

    // Player can be removed via store action
    store.removePlayer(activeSlideId, playerId);
    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const removedPlayer = activeSlide?.players.find(
      (p) => p.name === 'Deploy Sub',
    );
    expect(removedPlayer).toBeUndefined();
  });
});
