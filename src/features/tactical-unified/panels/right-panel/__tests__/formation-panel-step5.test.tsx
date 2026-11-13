import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { FormationCustomManager } from '../formation-custom-manager';
import { FormationPanel } from '../formation-panel';
import { QUICK_FORMATIONS } from '../formation-presets-data';
import { FormationTeamToggle } from '../formation-team-toggle';
import { RightPanel } from '../right-panel';

function createFormationTestStores() {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const s0 = p0.slides[0]!;
  return {
    phaseId: p0.id,
    slideId: s0.id,
    stores: {
      documentStore: createDocumentStore(project),
      sessionStore: createSessionStore({
        activePhaseId: p0.id,
        activeSlideId: s0.id,
      }),
      playbackStore: createPlaybackStore(),
    },
  };
}

describe('FormationPanel (Step 5)', () => {
  it('1. defaults formationMode to "full" pitch', () => {
    const { stores } = createFormationTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );
    const fullButton = screen.getByRole('button', { name: /^Full$/i });
    expect(fullButton.className).toMatch(/bg-(\[#FF8100\]|blue-600)/);
  });

  it('2. renders 3-team toggle (HOME, AWAY, BOTH) with player counts and switches activeTeam', () => {
    const { stores } = createFormationTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

    const homeButton = screen.getByRole('button', { name: /^HOME\s*\(/i });
    const awayButton = screen.getByRole('button', { name: /^AWAY\s*\(/i });
    const bothButton = screen.getByRole('button', { name: /^BOTH\s*\(/i });

    expect(homeButton).toBeDefined();
    expect(awayButton).toBeDefined();
    expect(bothButton).toBeDefined();

    // Default activeTeam is home
    expect(homeButton.className).toMatch(/bg-(\[#FF8100\]|blue-600)/);

    // Switch to BOTH
    fireEvent.click(bothButton);
    expect(bothButton.className).toMatch(/bg-(\[#FF8100\]|purple-600)/);
  });

  it('3. applies display mode batch change to currently active team (single team and both)', () => {
    const { stores, phaseId, slideId } = createFormationTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

    // Default active team is 'home'
    const emptyBtn = screen.getByRole('button', { name: /Empty/i });
    fireEvent.click(emptyBtn);

    let activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );

    const homePlayers = activeSlide?.players.filter((p) => p.team === 'home');
    const awayPlayers = activeSlide?.players.filter((p) => p.team === 'away');

    // Home players insideContent should be 'none'
    expect(homePlayers?.every((p) => p.style.insideContent === 'none')).toBe(
      true,
    );
    // Away players insideContent should not be 'none' (remains default number)
    expect(awayPlayers?.some((p) => p.style.insideContent === 'number')).toBe(
      true,
    );

    // Switch to BOTH and set Photo
    const bothButton = screen.getByRole('button', { name: /^BOTH\s*\(/i });
    fireEvent.click(bothButton);

    const photoBtn = screen.getByRole('button', { name: /Photo/i });
    fireEvent.click(photoBtn);

    activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );

    expect(
      activeSlide?.players.every((p) => p.style.insideContent === 'photo'),
    ).toBe(true);
  });

  it('4. applies formation to both teams when activeTeam is both', () => {
    const { stores, phaseId, slideId } = createFormationTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

    const bothButton = screen.getByRole('button', { name: /^BOTH\s*\(/i });
    fireEvent.click(bothButton);

    const formation442 = screen.getAllByRole('button', { name: '4-4-2' })[0];
    fireEvent.click(formation442);

    const activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );

    const homePitch = activeSlide?.players.filter(
      (p) => p.team === 'home' && p.area === 'pitch',
    );
    const awayPitch = activeSlide?.players.filter(
      (p) => p.team === 'away' && p.area === 'pitch',
    );

    expect(homePitch?.length).toBe(11);
    expect(awayPitch?.length).toBe(11);
  });

  it('5. QUICK_FORMATIONS contains exactly 5 types in order: 4-4-2, 4-2-3-1, 4-3-3, 4-1-4-1, 3-4-2-1', () => {
    expect(QUICK_FORMATIONS).toEqual([
      '4-4-2',
      '4-2-3-1',
      '4-3-3',
      '4-1-4-1',
      '3-4-2-1',
    ]);
  });

  it('6. expands RightPanel to 400px width (w-[400px] min-w-[400px])', () => {
    const { stores } = createFormationTestStores();
    stores.sessionStore.getState().setRightPanelOpen(true);
    const { container } = render(
      <TacticalStoreProvider stores={stores}>
        <RightPanel />
      </TacticalStoreProvider>,
    );
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('w-[400px]');
    expect(aside?.className).toContain('min-w-[400px]');
  });

  it('7. FormationTeamToggle renders 3-team buttons without pitch visibility filter', () => {
    const noop = () => {};
    const { container, queryByText } = render(
      <FormationTeamToggle
        activeTeam="home"
        onTeamChange={noop}
        homeColor="#3b82f6"
        awayColor="#ef4444"
        onColorChange={noop}
        teamPlayersCount={{ home: 11, away: 11 }}
        currentInsideContent="number"
        onDisplayModeChange={noop}
        currentBottomLabel="name"
        onBottomLabelChange={noop}
        currentMarkerScale={1.0}
        onMarkerScaleChange={noop}
        currentBallScale={1.0}
        onBallScaleChange={noop}
      />,
    );

    // The first row should contain the grid of 3 team buttons
    const firstRowGrid = container.querySelector('.grid.grid-cols-3');
    expect(firstRowGrid).toBeDefined();

    // Duplicate visibility filters (All | H | A) should NOT exist
    expect(queryByText('All')).toBeNull();
    expect(queryByText('H')).toBeNull();
    expect(queryByText('A')).toBeNull();
  });

  it('8. highlights currentInsideContent and currentBottomLabel and supports bottom label change', () => {
    const { stores, phaseId, slideId } = createFormationTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

    // Default insideContent is number -> Display Mode Num button should be highlighted
    const numInsideBtn = screen.getByRole('button', {
      name: /Display Mode Number/i,
    });
    expect(numInsideBtn.className).toContain('bg-[#FF8100]/24');

    // Default bottomLabel is name -> Bottom Label Name button should be highlighted
    const nameBottomBtn = screen.getByRole('button', {
      name: /Bottom Label Name/i,
    });
    expect(nameBottomBtn.className).toContain('bg-[#FF8100]/24');

    // Switch bottom label to 'none'
    const noneBottomBtn = screen.getByRole('button', {
      name: /Bottom Label None/i,
    });
    fireEvent.click(noneBottomBtn);

    const activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );

    const homePlayers = activeSlide?.players.filter((p) => p.team === 'home');
    expect(homePlayers?.every((p) => p.style.bottomLabel === 'none')).toBe(
      true,
    );
  });

  it('9. updates marker scale and ball scale when sliders are changed', () => {
    const { stores, phaseId, slideId } = createFormationTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

    const markerSlider = screen.getByLabelText('Marker Size');
    fireEvent.change(markerSlider, { target: { value: '1.4' } });

    let activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );

    const homePlayers = activeSlide?.players.filter((p) => p.team === 'home');
    expect(homePlayers?.every((p) => p.style.sizeScale === 1.4)).toBe(true);

    const ballSlider = screen.getByLabelText('Ball Size');
    fireEvent.change(ballSlider, { target: { value: '1.8' } });

    activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );

    expect(activeSlide?.ball.sizeScale).toBe(1.8);
  });

  it('10. FormationCustomManager applies Chelsea preset with 11 pitch starters', async () => {
    const { stores, phaseId, slideId } = createFormationTestStores();

    render(
      <TacticalStoreProvider stores={stores}>
        <FormationCustomManager
          activeTeam="home"
          activeSlideId={slideId}
          formationMode="full"
        />
      </TacticalStoreProvider>,
    );

    // Open accordion
    const toggleButton = screen.getByRole('button', {
      name: /Club & Season Presets/i,
    });
    fireEvent.click(toggleButton);

    // Click Chelsea preset
    const chelseaButton = screen.getByRole('button', { name: /^Chelsea$/i });
    fireEvent.click(chelseaButton);

    await waitFor(() => {
      const slide = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      );
      const homePitchPlayers = slide?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      );
      expect(homePitchPlayers?.length).toBe(11);
    });
  });

  it('11. synchronizes selectedFormation with activeTeam when project.matchFormations is present', () => {
    const project = createDefaultTacticalProject();
    const p0 = project.phases[0]!;
    const s0 = p0.slides[0]!;
    const stores = {
      documentStore: createDocumentStore({
        ...project,
        matchFormations: {
          home: '4-2-3-1',
          away: '3-4-2-1',
        },
      }),
      sessionStore: createSessionStore({
        activePhaseId: p0.id,
        activeSlideId: s0.id,
      }),
      playbackStore: createPlaybackStore(),
    };

    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

    // Default activeTeam is home -> 4-2-3-1 button is selected (active)
    const btn4231 = screen.getByRole('button', { name: '4-2-3-1' });
    expect(btn4231.className).toMatch(/bg-(\[#FF8100\]|blue-600)/);

    // Switch to AWAY -> 3-4-2-1 button is selected (active)
    const awayButton = screen.getByRole('button', { name: /^AWAY\s*\(/i });
    fireEvent.click(awayButton);

    const btn3421 = screen.getByRole('button', { name: '3-4-2-1' });
    expect(btn3421.className).toMatch(/bg-(\[#FF8100\]|blue-600)/);

    // Switch to BOTH -> home formation 4-2-3-1 is selected
    const bothButton = screen.getByRole('button', { name: /^BOTH\s*\(/i });
    fireEvent.click(bothButton);

    expect(btn4231.className).toMatch(/bg-(\[#FF8100\]|blue-600)/);
  });

  it('12. handleBottomLabelChange updates players atomically in a single store notification', () => {
    const { stores, phaseId, slideId } = createFormationTestStores();
    let storeNotifications = 0;
    const unsubscribe = stores.documentStore.subscribe(() => {
      storeNotifications += 1;
    });

    render(
      <TacticalStoreProvider stores={stores}>
        <FormationPanel />
      </TacticalStoreProvider>,
    );

    const noneBottomBtn = screen.getByRole('button', {
      name: /Bottom Label None/i,
    });
    fireEvent.click(noneBottomBtn);

    unsubscribe();

    expect(storeNotifications).toBe(1);
    const activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    const homePlayers = activeSlide?.players.filter((p) => p.team === 'home');
    expect(homePlayers?.length).toBeGreaterThan(0);
    expect(homePlayers?.every((p) => p.style.bottomLabel === 'none')).toBe(
      true,
    );
  });
});
