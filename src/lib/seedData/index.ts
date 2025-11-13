import type { IPlayer } from '@/lib/types';

import { TEAM_SEED_DATA, ACTION_MASTER_SEED } from './masters';
import { CHELSEA_PLAYERS } from './players/chelsea';
import { MANCHESTER_CITY_PLAYERS } from './players/manchester-city';
import { LIVERPOOL_PLAYERS } from './players/liverpool';
import { ARSENAL_PLAYERS } from './players/arsenal';
import { TOTTENHAM_PLAYERS } from './players/tottenham';

export { TEAM_SEED_DATA, ACTION_MASTER_SEED };
export {
	CHELSEA_PLAYERS,
	MANCHESTER_CITY_PLAYERS,
	LIVERPOOL_PLAYERS,
	ARSENAL_PLAYERS,
	TOTTENHAM_PLAYERS,
};

export const PLAYER_SEED_DATA: IPlayer[] = [
	...CHELSEA_PLAYERS,
	...MANCHESTER_CITY_PLAYERS,
	...LIVERPOOL_PLAYERS,
	...ARSENAL_PLAYERS,
	...TOTTENHAM_PLAYERS,
];
