import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import * as squadBridge from '@/lib/tactical/squad-to-tactical-bridge';
import { FormationCustomManager } from '../formation-custom-manager';
import { FormationPanel } from '../formation-panel';
import { QUICK_FORMATIONS } from '../formation-presets-data';
import { FormationTeamToggle } from '../formation-team-toggle';
import { RightPanel } from '../right-panel';

describe('FormationPanel (Step 5)', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('1. defaults formationMode to "full" pitch', () => {
    render(<FormationPanel />);
    const fullButton = screen.getByRole('button', { name: /^Full$/i });
    expect(fullButton.className).toMatch(/bg-(\[#FF8100\]|blue-600)/);
  });

  it('2. renders 3-team toggle (HOME, AWAY, BOTH) with player counts and switches activeTeam', () => {
    render(<FormationPanel />);

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
    render(<FormationPanel />);

    // Default active team is 'home'
    const emptyBtn = screen.getByRole('button', { name: /Empty/i });
    fireEvent.click(emptyBtn);

    let activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
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

    activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );

    expect(
      activeSlide?.players.every((p) => p.style.insideContent === 'photo'),
    ).toBe(true);
  });

  it('4. applies formation to both teams when activeTeam is both', () => {
    render(<FormationPanel />);

    const bothButton = screen.getByRole('button', { name: /^BOTH\s*\(/i });
    fireEvent.click(bothButton);

    const formation442 = screen.getAllByRole('button', { name: '4-4-2' })[0];
    fireEvent.click(formation442);

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
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
    useTacticalUnifiedStore.getState().setRightPanelOpen(true);
    const { container } = render(<RightPanel />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('w-[400px]');
    expect(aside?.className).toContain('min-w-[400px]');
  });

  it('7. FormationTeamToggle renders 3-team buttons without pitch visibility filter', () => {
    const { container, queryByText } = render(
      <FormationTeamToggle
        activeTeam="home"
        onTeamChange={vi.fn()}
        homeColor="#3b82f6"
        awayColor="#ef4444"
        onColorChange={vi.fn()}
        teamPlayersCount={{ home: 11, away: 11 }}
        currentInsideContent="number"
        onDisplayModeChange={vi.fn()}
        currentBottomLabel="name"
        onBottomLabelChange={vi.fn()}
        currentMarkerScale={1.0}
        onMarkerScaleChange={vi.fn()}
        currentBallScale={1.0}
        onBallScaleChange={vi.fn()}
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
    render(<FormationPanel />);

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

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );

    const homePlayers = activeSlide?.players.filter((p) => p.team === 'home');
    expect(homePlayers?.every((p) => p.style.bottomLabel === 'none')).toBe(
      true,
    );
  });

  it('9. updates marker scale and ball scale when sliders are changed', () => {
    render(<FormationPanel />);

    const markerSlider = screen.getByLabelText('Marker Size');
    fireEvent.change(markerSlider, { target: { value: '1.4' } });

    let activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );

    const homePlayers = activeSlide?.players.filter((p) => p.team === 'home');
    expect(homePlayers?.every((p) => p.style.sizeScale === 1.4)).toBe(true);

    const ballSlider = screen.getByLabelText('Ball Size');
    fireEvent.change(ballSlider, { target: { value: '1.8' } });

    activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );

    expect(activeSlide?.ball.sizeScale).toBe(1.8);
  });

  it('10. FormationCustomManager correctly passes isFirstEleven without inverting it', async () => {
    const injectSpy = vi.spyOn(squadBridge, 'injectTeamSquadToTactical');

    render(
      <FormationCustomManager
        activeTeam="home"
        activeSlideId="slide-1"
        formationMode="full"
      />,
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
      expect(injectSpy).toHaveBeenCalled();
    });

    const callArgs = injectSpy.mock.calls[0][0];
    // Find players that should be first eleven according to preset
    const firstElevenPlayers = callArgs.players.filter((p) => p.isFirstEleven);
    // Chelsea preset has 11 starters
    expect(firstElevenPlayers.length).toBe(11);

    injectSpy.mockRestore();
  });

  it('11. synchronizes selectedFormation with activeTeam when project.matchFormations is present', () => {
    useTacticalUnifiedStore.getState().loadProject({
      ...useTacticalUnifiedStore.getState().project,
      matchFormations: {
        home: '4-2-3-1',
        away: '3-4-2-1',
      },
    });

    render(<FormationPanel />);

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
});
