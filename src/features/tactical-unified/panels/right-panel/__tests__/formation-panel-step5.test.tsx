import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { FormationPanel } from '../formation-panel';

describe('FormationPanel (Step 5)', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('1. defaults formationMode to "full" pitch', () => {
    render(<FormationPanel />);
    const fullButton = screen.getByRole('button', { name: /^Full$/i });
    expect(fullButton.className).toContain('bg-blue-600');
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
    expect(homeButton.className).toContain('bg-blue-600');

    // Switch to BOTH
    fireEvent.click(bothButton);
    expect(bothButton.className).toContain('bg-purple-600');
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

  it('5. does not render old FormationBatchDisplay or FormationCustomManager in FormationPanel', () => {
    render(<FormationPanel />);

    // FormationBatchDisplay text was "Batch Player Display"
    expect(screen.queryByText(/Batch Player Display/i)).toBeNull();
    // FormationCustomManager text was "Club & Season Presets" or similar
    expect(screen.queryByText(/Club & Season Presets/i)).toBeNull();
  });
});
