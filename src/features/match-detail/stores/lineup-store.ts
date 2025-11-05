import { create } from 'zustand';

interface MatchLineup {
  [teamId: number]: number[];
}

interface LineupState {
  starters: Record<number, MatchLineup>;
  toggleStarter: (matchId: number, teamId: number, playerId: number) => void;
  clearMatchLineup: (matchId: number) => void;
}

const togglePlayerSelection = (current: number[] = [], playerId: number) => {
  if (current.includes(playerId)) {
    return current.filter(id => id !== playerId);
  }
  return [...current, playerId];
};

export const useLineupStore = create<LineupState>(set => ({
  starters: {},
  toggleStarter(matchId, teamId, playerId) {
    set(state => {
      const matchLineup = state.starters[matchId] ?? {};
      const currentTeamStarters = matchLineup[teamId] ?? [];
      const updatedTeamStarters = togglePlayerSelection(
        currentTeamStarters,
        playerId
      );

      return {
        starters: {
          ...state.starters,
          [matchId]: {
            ...matchLineup,
            [teamId]: updatedTeamStarters,
          },
        },
      };
    });
  },
  clearMatchLineup(matchId) {
    set(state => {
      if (!(matchId in state.starters)) {
        return state;
      }
      const { [matchId]: _removed, ...rest } = state.starters;
      return { starters: rest };
    });
  },
}));
