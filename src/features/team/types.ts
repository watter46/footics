import type { ITeam, IPlayer } from '@/lib/db';

export type Team = ITeam;
export type Player = IPlayer;

export type CreateTeamInput = Omit<ITeam, 'id'>;
export type CreatePlayerInput = Omit<IPlayer, 'id'>;
