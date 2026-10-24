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
    expect(screen.queryByText('Formation Presets')).toBeNull();

    // Clicking formation rail button expands panel and shows content
    fireEvent.click(screen.getByRole('button', { name: /formation/i }));
    expect(screen.getByText('Formation Presets')).toBeDefined();

    // Switch to Squad tab
    fireEvent.click(screen.getByRole('button', { name: /squad/i }));
    expect(screen.getByText('Squad & Bench')).toBeDefined();

    // Collapse panel with collapse button
    fireEvent.click(screen.getByRole('button', { name: /collapse panel/i }));
    expect(screen.queryByText('Squad & Bench')).toBeNull();
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

  it('SquadSubPanel renders bench player and allows removing', () => {
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

    const removeBtn = screen.getByTitle('Remove');
    expect(removeBtn).toBeDefined();

    // Remove bench player
    fireEvent.click(removeBtn);

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
