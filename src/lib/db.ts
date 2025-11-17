'use client';

import Dexie, { type Table } from 'dexie';

import type {
  ITeam,
  IPlayer,
  IMatch,
  IActionMaster,
  IEvent,
} from './types';
import { TEAM_SEED_DATA, ACTION_MASTER_SEED, PLAYER_SEED_DATA } from './seedData';

// Re-export types for backward compatibility
export type {
  ITeam,
  IPlayer,
  IMatch,
  IActionMaster,
  IEvent,
  Match,
  Player,
  TempTeam,
  TempPlayer,
  ActionMaster,
  Event,
} from './types';

// ============================================================================
// Dexie Database Class
// ============================================================================
class FooticsDB extends Dexie {
  teams!: Table<ITeam>;
  players!: Table<IPlayer>;
  matches!: Table<IMatch>;
  actions_master!: Table<IActionMaster>;
  events!: Table<IEvent>;

  // Backward compatibility aliases
  temp_teams!: Table<ITeam>;
  temp_players!: Table<IPlayer>;

  constructor() {
    super('FooticsDB');

    // バージョン3: category と opponentPosition フィールド追加
    this.version(3).stores({
      teams: '&id, name, code',
      players: '&id, teamId, number, name, position',
      matches: '++id, date, team1Id, team2Id',
      actions_master: '++id, name, category',
      events: '++id, matchId, playerId, opponentPosition, actionId, matchTime',
    });

    this.version(4)
      .stores({
        teams: '&id, name, code',
        players: '&id, teamId, number, name, position',
        matches: '++id, date, team1Id, team2Id',
        actions_master: '++id, name, category, isFavorite',
        events: '++id, matchId, playerId, opponentPosition, actionId, matchTime',
      })
      .upgrade(async transaction => {
        const table = transaction.table('actions_master');
        await table.toCollection().modify(action => {
          if (typeof action.isFavorite !== 'boolean') {
            action.isFavorite = false;
          }
        });
      });

    this.version(5)
      .stores({
        teams: '&id, name, code',
        players: '&id, teamId, number, name, position',
        matches:
          '++id, date, team1Id, team2Id, currentFormation, assignedPlayers',
        actions_master: '++id, name, category, isFavorite',
        events:
          '++id, matchId, playerId, positionName, opponentPosition, actionId, matchTime',
      })
      .upgrade(async transaction => {
        const matchesTable = transaction.table('matches');
        await matchesTable.toCollection().modify(match => {
          if (match.currentFormation === undefined) {
            match.currentFormation = null;
          } else if (match.currentFormation != null) {
            match.currentFormation = String(match.currentFormation);
          }

          if (match.assignedPlayers === undefined) {
            match.assignedPlayers = null;
          }
        });
      });

    this.version(6).stores({
      teams: '&id, name, code',
      players: '&id, teamId, number, name, position',
      matches:
        '++id, date, team1Id, team2Id, currentFormation, assignedPlayers',
      actions_master: '++id, name, category, isFavorite',
      events:
        '++id, matchId, playerId, positionName, opponentPosition, actionId, matchTime, memo',
    });

    this.version(7).stores({
      teams: '&id, name, code',
      players: '&id, teamId, number, name, position',
      matches:
        '++id, date, team1Id, team2Id, currentFormation, assignedPlayers',
      actions_master: '++id, name, category, isFavorite',
      events:
        '++id, matchId, playerId, positionName, opponentPosition, actionId, matchTime, memo',
    });

    this.version(8)
      .stores({
        teams: '&id, name, code',
        players: '&id, teamId, number, name, position',
        matches:
          '++id, date, team1Id, team2Id, currentFormation, assignedPlayers',
        actions_master: '++id, name, category, isFavorite',
        events:
          '++id, matchId, playerId, positionName, opponentPosition, actionId, matchTime, memo, tempSlotId, [matchId+playerId]',
      })
      .upgrade(async transaction => {
        const eventsTable = transaction.table('events');
        await eventsTable.toCollection().modify(event => {
          if (event.tempSlotId === undefined) {
            event.tempSlotId = null;
          }
        });
      });

    this.version(9).stores({
      teams: '&id, name, code',
      players: '&id, teamId, number, name, position',
      matches:
        '++id, date, team1Id, team2Id, currentFormation, assignedPlayers, deletedAt',
      actions_master: '++id, name, category, isFavorite',
      events:
        '++id, matchId, playerId, positionName, opponentPosition, actionId, matchTime, memo, tempSlotId, [matchId+playerId]',
    });

    this.version(10)
      .stores({
        teams: '&id, name, code',
        players: '&id, teamId, number, name, position',
        matches:
          '++id, date, team1Id, team2Id, subjectTeamId, currentFormation, assignedPlayers, deletedAt',
        actions_master: '++id, name, category, isFavorite',
        events:
          '++id, matchId, playerId, positionName, opponentPosition, actionId, matchTime, memo, tempSlotId, [matchId+playerId]',
      })
      .upgrade(async transaction => {
        const matchesTable = transaction.table('matches');
        await matchesTable.toCollection().modify(match => {
          if (typeof match.subjectTeamId !== 'number') {
            match.subjectTeamId = match.team1Id ?? null;
          }
        });
      });

    this.version(11)
      .stores({
        teams: '&id, name, code',
        players: '&id, teamId, number, name, position',
        matches:
          '++id, date, team1Id, team2Id, subjectTeamId, currentFormation, assignedPlayers, deletedAt',
        actions_master: '++id, name, category, isFavorite',
        events:
          '++id, matchId, teamId, playerId, positionName, opponentPosition, actionId, matchTime, memo, tempSlotId, [matchId+playerId]',
      })
      .upgrade(async transaction => {
        const matchesTable = transaction.table('matches');

        await matchesTable.toCollection().modify(match => {
          if (typeof match.subjectTeamId !== 'number') {
            match.subjectTeamId = match.team1Id ?? null;
          }
        });

        const matches = await matchesTable.toArray();
        const matchesById = new Map<number, (typeof matches)[number]>();

        matches.forEach(matchRecord => {
          if (typeof matchRecord.id === 'number') {
            matchesById.set(matchRecord.id, matchRecord);
          }
        });

        const eventsTable = transaction.table('events');
        await eventsTable.toCollection().modify(event => {
          if (typeof event.teamId === 'number') {
            return;
          }

          const relatedMatch = matchesById.get(event.matchId);
          if (!relatedMatch) {
            return;
          }

          const subjectTeamId =
            typeof relatedMatch.subjectTeamId === 'number'
              ? relatedMatch.subjectTeamId
              : relatedMatch.team1Id ?? null;

          if (subjectTeamId == null) {
            return;
          }

          const opponentTeamId =
            subjectTeamId === relatedMatch.team1Id
              ? relatedMatch.team2Id
              : relatedMatch.team1Id;

          const inferredTeamId = event.opponentPosition
            ? opponentTeamId ?? subjectTeamId
            : subjectTeamId;

          if (typeof inferredTeamId === 'number') {
            event.teamId = inferredTeamId;
          }
        });
      });

    // Backward compatibility: map old table names to new ones
    this.temp_teams = this.teams;
    this.temp_players = this.players;
  }
} // ============================================================================
// Export a singleton instance
// ============================================================================
export const db = new FooticsDB();

export async function seedActionMaster({
  reset = false,
}: { reset?: boolean } = {}) {
  const executeSeed = async () => {
    if (reset) {
      await db.actions_master.clear();
    }

    if (reset || (await db.actions_master.count()) === 0) {
      await db.actions_master.bulkAdd(ACTION_MASTER_SEED);
    }
  };

  if (Dexie.currentTransaction) {
    await executeSeed();
    return;
  }

  await db.transaction('rw', db.actions_master, executeSeed);
}

export async function seedInitialData({
  reset = false,
}: { reset?: boolean } = {}) {
  const executeSeed = async () => {
    if (reset) {
      await Promise.all([db.teams.clear(), db.players.clear()]);
    }

    const [teamCount, playerCount] = await Promise.all([
      db.teams.count(),
      db.players.count(),
    ]);

    if (reset || teamCount === 0) {
      await db.teams.bulkAdd(TEAM_SEED_DATA);
    }

    if (reset || playerCount === 0) {
      await db.players.bulkAdd(PLAYER_SEED_DATA);
    }

    await seedActionMaster({ reset });
  };

  if (Dexie.currentTransaction) {
    await executeSeed();
    return;
  }

  await db.transaction(
    'rw',
    db.teams,
    db.players,
    db.actions_master,
    executeSeed
  );
}

if (typeof window !== 'undefined') {
  void (async () => {
    try {
      await seedInitialData();
    } catch (error) {
      console.error('Failed to ensure initial seed:', error);
    }
  })();
}

// ============================================================================
// 初期データ投入
// ============================================================================
db.on('populate', async () => {
  try {
    await seedInitialData();
  } catch (error) {
    console.error('初期データの投入に失敗しました:', error);
  }
});
