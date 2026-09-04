import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { FormationPanel } from '../formation-panel';
import { RightPanel } from '../right-panel';
import { SquadSubPanel } from '../squad-sub-panel';

describe('RightPanel Tab & Sub-components Architecture', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders RightPanel collapsed by default and opens tabs correctly', () => {
    render(<RightPanel />);

    // Initially collapsed: rail icons exist
    expect(screen.getByRole('button', { name: /formation/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /squad/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /properties/i })).toBeDefined();
    expect(screen.queryByText('Formation Presets')).toBeNull();

    // Clicking formation rail button expands panel and shows content
    fireEvent.click(screen.getByRole('button', { name: /formation/i }));
    expect(screen.getByText('Formation Presets')).toBeDefined();

    // Switch to Squad tab
    fireEvent.click(screen.getByRole('button', { name: /squad/i }));
    expect(screen.getByText('Squad & Bench')).toBeDefined();

    // Switch to Properties tab
    fireEvent.click(screen.getByRole('button', { name: /properties/i }));
    expect(screen.getByText(/Properties — Slide Settings/i)).toBeDefined();

    // Collapse panel with collapse button
    fireEvent.click(screen.getByRole('button', { name: /collapse panel/i }));
    expect(screen.queryByText(/Properties — Slide Settings/i)).toBeNull();
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

  it('SquadSubPanel allows deploying bench player and adding new player', () => {
    const store = useTacticalUnifiedStore.getState();
    const activeSlideId = store.activeSlideId;

    // Add custom bench player
    store.addCustomPlayer(
      activeSlideId,
      'home',
      'Deploy Sub',
      '12',
      'GK',
      'bench',
    );

    render(<SquadSubPanel />);

    expect(screen.getByText('Squad & Bench')).toBeDefined();

    const deployButtons = screen.getAllByTitle('ピッチに投入');
    expect(deployButtons.length).toBeGreaterThan(0);

    // Deploy to pitch
    fireEvent.click(deployButtons[0]);

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const deployedPlayer = activeSlide?.players.find(
      (p) => p.name === 'Deploy Sub',
    );
    expect(deployedPlayer?.area).toBe('pitch');
  });
});
