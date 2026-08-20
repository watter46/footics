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

export interface PlayerMaster {
  id: string; // '${season}_${playerId}' (Primary Key)
  playerId: number;
  name: string;
  season: string; // 所属シーズン (例: '26-27', '25-26', '24-25')
  defaultShirtNo?: number; // 背番号
  position?: string; // ポジション ('GK', 'DF', 'MID', 'FW', 'Other' など)
  photoBlob?: Blob; // ローカル保存された画像データ
  photoUrl?: string; // 外部URL（フォールバック用）
  teamName?: string; // チーム名 (例: 'Chelsea')
  isExcluded?: boolean; // 該当シーズンから除外（非表示）フラグ
  updatedAt: number;
}

const DB_NAME = 'footics_db';
// v19: drop players store in v18 and recreate with new primary key 'id' in v19 to avoid Dexie UpgradeError
const _DB_VERSION = 19;

export class FooticsDatabase extends Dexie {
  event_memos!: Table<EventMemo, number>;
  custom_events!: Table<CustomEvent, string>;
  match_memos!: Table<MatchMemo, string>;
  tactical_snapshots!: Table<TacticalSnapshot, string>;
  matches!: Table<Match, string>;
  // Primary key is compound [match_id, id] — queried via match_id index
  events!: Table<EventRow, [number | string, number | string]>;
  keyval!: Table<KeyValEntry, string>;
  players!: Table<PlayerMaster, string>;

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

    this.version(17).stores({
      players: 'playerId, name, updatedAt',
    });

    // Dexie does not support changing primary keys directly on the same store.
    // Drop table in v18 and recreate with new primary key 'id' in v19.
    this.version(18).stores({
      players: null,
    });

    this.version(19).stores({
      players: 'id, playerId, season, name, teamName, updatedAt',
    });
  }
}

export const db = new FooticsDatabase();
