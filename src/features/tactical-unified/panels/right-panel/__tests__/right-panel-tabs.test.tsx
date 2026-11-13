import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { CameraControlPanel } from '../camera-control-panel';
import { FormationPanel } from '../formation-panel';
import { RightPanel } from '../right-panel';
import { SquadSubPanel } from '../squad-sub-panel';

function setupRightPanelStores(workspaceMode: 'board' | 'director' = 'board') {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const s0 = p0.slides[0]!;
  const stores = {
    documentStore: createDocumentStore(project),
    sessionStore: createSessionStore({
      workspaceMode,
      activePhaseId: p0.id,
      activeSlideId: s0.id,
    }),
    playbackStore: createPlaybackStore(),
  };
  return { stores, phaseId: p0.id, slideId: s0.id };
}

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
          prop in target ? target[prop] : () => {},
      },
    );
    HTMLCanvasElement.prototype.getContext = (() =>
      mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('renders RightPanel collapsed by default and opens tabs correctly in board mode', () => {
    const { stores } = setupRightPanelStores('board');
    render(
      <TacticalStoreProvider stores={stores}>
        <RightPanel />
      </TacticalStoreProvider>,
    );

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
    const { stores } = setupRightPanelStores('director');
    stores.sessionStore.getState().setRightPanelOpen(false);
    render(
      <TacticalStoreProvider stores={stores}>
        <RightPanel />
      </TacticalStoreProvider>,
    );

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
    const { stores, phaseId, slideId } = setupRightPanelStores('director');
    render(
      <TacticalStoreProvider stores={stores}>
        <CameraControlPanel />
      </TacticalStoreProvider>,
    );

    expect(screen.getByText('Camera Controls')).toBeDefined();

    // Check zoom and pan display
    expect(screen.getByText(/1\.0x/)).toBeDefined();

    // Presets: click shallow front preset (15° / 90°)
    const shallowFrontBtn = screen.getByRole('button', {
      name: /浅い俯瞰（正面）|shallow-front/i,
    });
    fireEvent.click(shallowFrontBtn);

    let activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.pitchTransform?.tilt).toBe(15);
    expect(activeSlide?.pitchTransform?.yaw).toBe(90);

    // Tilt slider and input change
    const tiltInput = screen.getByLabelText(/tilt/i, {
      selector: 'input[type="number"]',
    });
    fireEvent.change(tiltInput, { target: { value: '45' } });
    activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.pitchTransform?.tilt).toBe(45);

    const tiltSlider = screen.getByLabelText(/tilt/i, {
      selector: 'input[type="range"]',
    });
    fireEvent.change(tiltSlider, { target: { value: '30' } });
    activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.pitchTransform?.tilt).toBe(30);

    // Yaw slider and input change
    const yawInput = screen.getByLabelText(/yaw/i, {
      selector: 'input[type="number"]',
    });
    fireEvent.change(yawInput, { target: { value: '120' } });
    activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.pitchTransform?.yaw).toBe(120);

    const yawSlider = screen.getByLabelText(/yaw/i, {
      selector: 'input[type="range"]',
    });
    fireEvent.change(yawSlider, { target: { value: '75' } });
    activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.pitchTransform?.yaw).toBe(75);

    // Reset button
    const resetBtn = screen.getByRole('button', { name: /reset camera/i });
    fireEvent.click(resetBtn);
    activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.pitchTransform?.tilt).toBe(0);
    expect(activeSlide?.pitchTransform?.yaw).toBe(90);
    expect(activeSlide?.pitchTransform?.zoom).toBe(1);
    expect(activeSlide?.pitchTransform?.panX).toBe(0);
    expect(activeSlide?.pitchTransform?.panY).toBe(0);
  });

  it('FormationPanel allows applying formation and changing team', () => {
    const { stores, phaseId, slideId } = setupRightPanelStores('board');
    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

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

    const activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    const awayPitch = activeSlide?.players.filter(
      (p) => p.team === 'away' && p.area === 'pitch',
    );
    expect(awayPitch?.length).toBe(11);
  });

  it('SquadSubPanel renders bench player in tactical-bench-canvas sub-canvas', () => {
    const { stores, phaseId, slideId } = setupRightPanelStores('board');
    const playerId = 'bench-deploy-sub';
    const baseSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    )!;
    const templatePlayer = baseSlide.players[0]!;

    // Add custom bench player
    stores.documentStore.getState().dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId,
      slideId,
      command: {
        type: 'ADD_PLAYER',
        player: {
          ...templatePlayer,
          id: playerId,
          team: 'home',
          name: 'Deploy Sub',
          shirtNo: '12',
          position: 'GK',
          area: 'bench',
          style: {
            ...templatePlayer.style,
            color: '#3b82f6',
            insideContent: 'number',
            bottomLabel: 'name',
            sizeScale: 1,
          },
        },
      },
    });

    const { container } = render(
      <TacticalStoreProvider stores={stores}>
        <SquadSubPanel />
      </TacticalStoreProvider>,
    );

    expect(screen.getByText('Squad & Bench')).toBeDefined();

    // Sub-canvas container exists
    const canvas = container.querySelector('#tactical-bench-canvas');
    expect(canvas).not.toBeNull();

    // Old bench DOM card Remove button does not exist
    expect(screen.queryByTitle('Remove')).toBeNull();

    // Player can be removed via store action
    stores.documentStore.getState().dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId,
      slideId,
      command: {
        type: 'REMOVE_PLAYER',
        id: playerId,
      },
    });
    const activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    const removedPlayer = activeSlide?.players.find(
      (p) => p.name === 'Deploy Sub',
    );
    expect(removedPlayer).toBeUndefined();
  });
});
