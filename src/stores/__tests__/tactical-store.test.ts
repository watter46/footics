import { beforeEach, describe, expect, it } from 'vitest';
import { type PlayerState, useTacticalStore } from '../tactical-store';

describe('useTacticalStore', () => {
  beforeEach(() => {
    useTacticalStore.setState({
      isFlipped: false,
      benchTeam: 'home',
      savedSettings: {},
      ballPos: { x: 50, y: 50 },
      homeColor: '#3b82f6',
      awayColor: '#ef4444',
      activeId: null,
    });
  });

  it('initializes with expected default state', () => {
    const state = useTacticalStore.getState();
    expect(state.isFlipped).toBe(false);
    expect(state.benchTeam).toBe('home');
    expect(state.savedSettings).toEqual({});
    expect(state.ballPos).toEqual({ x: 50, y: 50 });
    expect(state.homeColor).toBe('#3b82f6');
    expect(state.awayColor).toBe('#ef4444');
    expect(state.activeId).toBeNull();
  });

  it('updates isFlipped via setIsFlipped and toggleFlipped', () => {
    const { setIsFlipped, toggleFlipped } = useTacticalStore.getState();

    setIsFlipped(true);
    expect(useTacticalStore.getState().isFlipped).toBe(true);

    toggleFlipped();
    expect(useTacticalStore.getState().isFlipped).toBe(false);

    toggleFlipped();
    expect(useTacticalStore.getState().isFlipped).toBe(true);
  });

  it('updates benchTeam via setBenchTeam', () => {
    const { setBenchTeam } = useTacticalStore.getState();

    setBenchTeam('away');
    expect(useTacticalStore.getState().benchTeam).toBe('away');

    setBenchTeam('home');
    expect(useTacticalStore.getState().benchTeam).toBe('home');
  });

  it('updates savedSettings and updates individual player via updatePlayer', () => {
    const { setSavedSettings, updatePlayer } = useTacticalStore.getState();

    const player1: PlayerState = {
      playerId: 7,
      shirtNo: '7',
      x: 30,
      y: 40,
      team: 'home',
      area: 'pitch',
    };

    setSavedSettings({ 7: player1 });
    expect(useTacticalStore.getState().savedSettings[7]).toEqual(player1);

    // Update partial player data
    updatePlayer(7, { x: 35, y: 45 });
    expect(useTacticalStore.getState().savedSettings[7]).toEqual({
      ...player1,
      x: 35,
      y: 45,
    });

    // Add new player via updatePlayer
    updatePlayer(9, {
      playerId: 9,
      shirtNo: '9',
      x: 50,
      y: 80,
      team: 'away',
      area: 'bench',
    });
    expect(useTacticalStore.getState().savedSettings[9]).toEqual({
      playerId: 9,
      shirtNo: '9',
      x: 50,
      y: 80,
      team: 'away',
      area: 'bench',
    });
  });

  it('updates ball position via setBallPos', () => {
    const { setBallPos } = useTacticalStore.getState();

    setBallPos({ x: 25, y: 75 });
    expect(useTacticalStore.getState().ballPos).toEqual({ x: 25, y: 75 });
  });

  it('updates home and away colors', () => {
    const { setHomeColor, setAwayColor } = useTacticalStore.getState();

    setHomeColor('#ff0000');
    setAwayColor('#0000ff');

    expect(useTacticalStore.getState().homeColor).toBe('#ff0000');
    expect(useTacticalStore.getState().awayColor).toBe('#0000ff');
  });

  it('updates activeId via setActiveId', () => {
    const { setActiveId } = useTacticalStore.getState();

    setActiveId('player-7');
    expect(useTacticalStore.getState().activeId).toBe('player-7');

    setActiveId(null);
    expect(useTacticalStore.getState().activeId).toBeNull();
  });

  it('resets tactical state via resetTactical', () => {
    const { setIsFlipped, setBallPos, resetTactical } =
      useTacticalStore.getState();

    setIsFlipped(true);
    setBallPos({ x: 10, y: 20 });

    resetTactical();

    const state = useTacticalStore.getState();
    expect(state.isFlipped).toBe(false);
    expect(state.ballPos).toEqual({ x: 50, y: 50 });
  });
});
