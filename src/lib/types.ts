export interface ITeam {
  id?: number;
  name: string;
  code?: string;
}

export interface IPlayer {
  id?: number;
  teamId: number;
  number: number;
  name: string;
  position: string;
}

export interface IMatch {
  id?: number;
  date: string;
  team1Id: number;
  team2Id: number;
  currentFormation?: string | null;
  assignedPlayers?: Record<number, number> | null;
  substitutedOutPlayerIds?: number[] | null;
}

export interface IActionMaster {
  id?: number;
  name: string;
  category: string;
  isFavorite?: boolean;
}

export interface IEvent {
  id?: number;
  matchId: number;
  playerId: number | null;
  tempSlotId?: string | null;
  actionId: number;
  matchTime: string;
  opponentPosition?: string;
  positionName?: string;
  memo?: string;
}

// Backward compatibility aliases
export type Match = IMatch;
export type Player = IPlayer;
export type TempTeam = ITeam;
export type TempPlayer = IPlayer;
export type ActionMaster = IActionMaster;
export type Event = IEvent;
