import Dexie, { type Table } from 'dexie';
import type { TacticalProject } from '@/lib/types/tactical-unified';
import type { EventRow, Match } from '@/types';
import type {
  CustomEvent,
  KeyValEntry,
  MatchMemo,
  PlayerMaster,
  PlayerPhoto,
} from '../schema';

export type {
  CustomEvent,
  KeyValEntry,
  MatchMemo,
  PlayerMaster,
  PlayerPhoto,
} from '../schema';

const DB_NAME = 'footics_db';

export class FooticsDatabase extends Dexie {
  matches!: Table<Match, string>;
  // Primary key is compound [match_id, id] — queried via match_id index
  events!: Table<EventRow, [number | string, number | string]>;
  custom_events!: Table<CustomEvent, string>;
  match_memos!: Table<MatchMemo, string>;
  players!: Table<PlayerMaster, string>;
  player_photos!: Table<PlayerPhoto, number>;
  tactical_projects!: Table<TacticalProject, string>;
  keyval!: Table<KeyValEntry, string>;

  constructor() {
    super(DB_NAME);

    this.version(1)
      .stores({
        matches: 'id, date, matchType',
        events: '[match_id+id], match_id',
        custom_events: 'id, match_id, created_at',
        match_memos: 'matchId',
        players: 'id, playerId, season, [season+teamName]',
        player_photos: 'playerId, updatedAt',
        tactical_projects: 'id, matchId, updatedAt',
        keyval: 'key',
      })
      .upgrade(async () => {
        // v1 clean start: schema recreated with single version(1)
      });
  }
}

export const db = new FooticsDatabase();

/**
 * データベースが正常にオープンできることを保証する。
 * 旧スキーマ (v15〜v20) からの移行時などに VersionError が発生した場合、
 * 既存 DB を自動削除して v1 で再構築する。
 */
export async function ensureDatabaseReady(
  database: FooticsDatabase = db,
): Promise<void> {
  try {
    await database.open();
  } catch (err: unknown) {
    const isVersionError =
      typeof err === 'object' &&
      err !== null &&
      (('name' in err && err.name === 'VersionError') ||
        ('inner' in err &&
          typeof err.inner === 'object' &&
          err.inner !== null &&
          'name' in err.inner &&
          err.inner.name === 'VersionError'));

    if (isVersionError) {
      await database.delete();
      await database.open();
    } else {
      throw err;
    }
  }
}
