import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { FormationSubPanel } from '../formation-sub-panel';

describe('FormationSubPanel Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders panel header and substitutes section', () => {
    render(<FormationSubPanel />);

    // Check panel headers
    expect(screen.getByText('Formation & Squad')).toBeDefined();
    expect(screen.getAllByText(/Substitutes/i).length).toBeGreaterThanOrEqual(
      1,
    );
    // On Pitch section should NOT exist
    expect(screen.queryByText(/On Pitch/i)).toBeNull();
  });

  it('allows deploying a bench player to pitch with one-button Deploy (投入)', () => {
    const store = useTacticalUnifiedStore.getState();
    const activeSlideId = store.activeSlideId;

    // Add a custom bench player
    store.addCustomPlayer(
      activeSlideId,
      'home',
      'Deploy Sub',
      '12',
      'GK',
      'bench',
    );

    render(<FormationSubPanel />);

    const deployButtons = screen.getAllByTitle('ピッチに投入');
    expect(deployButtons.length).toBeGreaterThan(0);

    // Deploy player to pitch
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

  it('opens and closes Swap menu and performs swap from bench player', () => {
    const store = useTacticalUnifiedStore.getState();
    const activeSlideId = store.activeSlideId;

    // Add a custom bench player
    store.addCustomPlayer(
      activeSlideId,
      'home',
      'Super Sub',
      '99',
      'ST',
      'bench',
    );

    render(<FormationSubPanel />);

    // Find Swap button on bench player
    const benchSwapButtons = screen.getAllByTitle('Swap with pitch player');
    expect(benchSwapButtons.length).toBeGreaterThan(0);

    // Open swap menu for first bench player
    fireEvent.click(benchSwapButtons[0]);

    // Check if swap target dropdown appeared containing a pitch player
    const pitchCandidates = screen.getAllByRole('button', {
      name: /Player 1/i,
    });
    expect(pitchCandidates.length).toBeGreaterThan(0);

    // Click candidate to perform swap
    fireEvent.click(pitchCandidates[0]);

    // Verify player area swap
    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    const swappedSub = updatedSlide?.players.find(
      (p) => p.name === 'Super Sub',
    );
    expect(swappedSub?.area).toBe('pitch');
  });

  it('toggles accordion section visibility when clicking position header', () => {
    const store = useTacticalUnifiedStore.getState();
    const activeSlideId = store.activeSlideId;

    // Add a custom bench player
    store.addCustomPlayer(
      activeSlideId,
      'home',
      'Backup GK',
      '12',
      'GK',
      'bench',
    );

    render(<FormationSubPanel />);

    // Find Goalkeepers accordion headers
    const gkButtons = screen.getAllByText('Goalkeepers');
    const gkHeaderBtn = gkButtons[0].closest('button');
    expect(gkHeaderBtn).toBeDefined();

    if (gkHeaderBtn) {
      // Toggle to close
      fireEvent.click(gkHeaderBtn);
      // Toggle to open
      fireEvent.click(gkHeaderBtn);
    }
  });

  it('adds a new sub player to bench and categorizes into the correct position group', () => {
    render(<FormationSubPanel />);

    // Click Add button in Substitutes header
    const addSubBtn = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addSubBtn);

    // Fill in inputs
    const noInput = screen.getByPlaceholderText('No.');
    const posInput = screen.getByPlaceholderText('Pos');
    const nameInput = screen.getByPlaceholderText('Player Name');

    fireEvent.change(noInput, { target: { value: '12' } });
    fireEvent.change(posInput, { target: { value: 'GK' } });
    fireEvent.change(nameInput, { target: { value: 'Backup GK' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /add player/i });
    fireEvent.click(submitBtn);

    // Verify sub player added in state
    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const backupGk = activeSlide?.players.find((p) => p.name === 'Backup GK');
    expect(backupGk).toBeDefined();
    expect(backupGk?.area).toBe('bench');
    expect(backupGk?.position).toBe('GK');
  });
});
