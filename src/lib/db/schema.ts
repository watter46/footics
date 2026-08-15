import Dexie, { type Table } from 'dexie';
import type { EventRow, Match } from '@/types';
import type {
  CustomEvent,
  EventMemo,
  MatchMemo,
  TacticalSnapshot,
} from '../schema';

export interface KeyValEntry<T = any> {
  key: string;
  value: T;
  updatedAt: number;
}

const DB_NAME = 'footics_db';
// v15: events primary key changed to compound [match_id+id] to prevent cross-match ID collisions
const _DB_VERSION = 16;

export class FooticsDatabase extends Dexie {
  event_memos!: Table<EventMemo, number>;
  custom_events!: Table<CustomEvent, string>;
  match_memos!: Table<MatchMemo, string>;
  tactical_snapshots!: Table<TacticalSnapshot, string>;
  matches!: Table<Match, string>;
  // Primary key is compound [match_id, id] — queried via match_id index
  events!: Table<EventRow, [number | string, number | string]>;
  keyval!: Table<KeyValEntry, string>;

  constructor() {
    super(DB_NAME);

    // v14 → v15: events store recreated with compound primary key
    // Existing events data will be cleared on migration (intentional: starting fresh from Whoscored JSON)
    this.version(15).stores({
      event_memos: 'id, matchId, updatedAt',
      custom_events: 'id, match_id, created_at',
      match_memos: 'matchId',
      tactical_snapshots: 'matchId',
      matches: 'id',
      events: '[match_id+id], match_id, team_id, type_value, period',
      keyval: 'key',
    });

    this.version(16)
      .stores({}) // No schema changes, just data migration
      .upgrade(async (tx) => {
        await tx
          .table('custom_events')
          .toCollection()
          .modify((event) => {
            if (event.period === undefined) {
              event.period = 1;
            }
          });
      });
  }
}

export const db = new FooticsDatabase();
