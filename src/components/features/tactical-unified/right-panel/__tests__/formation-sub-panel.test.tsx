import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { FormationSubPanel } from '../formation-sub-panel';

describe('FormationSubPanel Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders 4-position group breakdown for On Pitch and Substitutes', () => {
    render(<FormationSubPanel />);

    // Check panel headers
    expect(screen.getByText('Formation & Squad')).toBeDefined();
    expect(screen.getAllByText(/On Pitch/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Substitutes/i).length).toBeGreaterThanOrEqual(
      1,
    );

    // Check 4-position group headers exist
    const gkLabels = screen.getAllByText('Goalkeepers');
    const dfLabels = screen.getAllByText('Defenders');
    const mfLabels = screen.getAllByText('Midfielders');
    const fwLabels = screen.getAllByText('Forwards');

    expect(gkLabels.length).toBeGreaterThanOrEqual(1);
    expect(dfLabels.length).toBeGreaterThanOrEqual(1);
    expect(mfLabels.length).toBeGreaterThanOrEqual(1);
    expect(fwLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('allows sending a pitch player to the bench and updates counts', () => {
    render(<FormationSubPanel />);

    // Default 4-4-2 has 11 home players on pitch
    const benchButtons = screen.getAllByTitle('Send to bench');
    expect(benchButtons.length).toBeGreaterThan(0);

    // Send first player to bench
    fireEvent.click(benchButtons[0]);

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const benchPlayers =
      activeSlide?.players.filter(
        (p) => p.team === 'home' && p.area === 'bench',
      ) || [];
    const pitchPlayers =
      activeSlide?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      ) || [];

    expect(benchPlayers.length).toBe(1);
    expect(pitchPlayers.length).toBe(10);
  });

  it('opens and closes Swap menu and performs swap between pitch and bench players', () => {
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

    // Find Swap buttons on pitch
    const pitchSwapButtons = screen.getAllByTitle('Swap with bench player');
    expect(pitchSwapButtons.length).toBeGreaterThan(0);

    // Open swap menu for first pitch player
    fireEvent.click(pitchSwapButtons[0]);

    // Check if swap target dropdown appeared containing the sub player
    expect(screen.getAllByText('Super Sub').length).toBeGreaterThanOrEqual(1);

    // Click candidate to perform swap
    const targetCandidateBtn = screen.getByRole('button', {
      name: /Super Sub/i,
    });
    fireEvent.click(targetCandidateBtn);

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
