/**
 * footics Unified Database Layer (Dexie.js Implementation)
 *
 * 設計意図:
 * - 旧 idb ベースの実装を Dexie.js に移行し、型安全性と操作性を向上。
 * - 各ストアのスキーマ定義を Dexie の形式で一元管理。
 * - 既存の footics_db (v11) との互換性を維持。
 */
import Dexie, { type Table } from 'dexie';
import type { EventRow, Match } from '@/types';
import type {
  CustomEvent,
  EventMemo,
  MatchMemo,
  TacticalSnapshot,
} from './schema';
import { SHORTCUT_ACTIONS } from './shortcuts';

// ──────────────────────────────────────────────
// Notification Helper
// ──────────────────────────────────────────────

/**
 * データの変更をアプリ全体に通知する。
 * Web本体の useDataSync フックがこのイベントを購読してキャッシュを無効化する。
 */
export function dispatchRefreshEvent(matchId?: string | number): void {
  if (typeof window === 'undefined') return;

  console.log('[db] Dispatching REFRESH_DATA event, matchId:', matchId);
  window.dispatchEvent(
    new CustomEvent('footics-action', {
      detail: {
        action: SHORTCUT_ACTIONS.REFRESH_DATA,
        matchId: matchId ? String(matchId) : undefined,
      },
    }),
  );
}

// ──────────────────────────────────────────────
// DB Schema Definition
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Event Memo Operations (TanStack Query 用)
// ──────────────────────────────────────────────

export async function getEventMemosByMatch(
  matchId: number,
): Promise<EventMemo[]> {
  return db.event_memos.where('matchId').equals(matchId).toArray();
}

export async function putEventMemo(memo: EventMemo): Promise<void> {
  await db.event_memos.put(memo);
  dispatchRefreshEvent(memo.matchId);
}

export async function getAllEventMemos(): Promise<EventMemo[]> {
  return db.event_memos.toArray();
}

// ──────────────────────────────────────────────
// Custom Event Operations
// ──────────────────────────────────────────────

export async function saveCustomEvent(event: CustomEvent): Promise<void> {
  await db.custom_events.put(event);
  dispatchRefreshEvent(event.match_id);
}

export async function getCustomEventsByMatch(
  matchId: string,
): Promise<CustomEvent[]> {
  return db.custom_events.where('match_id').equals(matchId).toArray();
}

export async function deleteCustomEvent(id: string): Promise<void> {
  const event = await db.custom_events.get(id);
  const matchId = event?.match_id;
  await db.custom_events.delete(id);
  if (matchId) dispatchRefreshEvent(matchId);
}

export async function getAllCustomEvents(): Promise<CustomEvent[]> {
  return db.custom_events.toArray();
}

// ──────────────────────────────────────────────
// Match Memo Operations
// ──────────────────────────────────────────────

export async function getMatchMemo(matchId: string): Promise<MatchMemo | null> {
  const data = await db.match_memos.get(matchId);
  return data ?? null;
}

export async function putMatchMemo(memo: MatchMemo): Promise<void> {
  await db.match_memos.put(memo);
  dispatchRefreshEvent(memo.matchId);
}

export async function getAllMatchMemos(): Promise<MatchMemo[]> {
  return db.match_memos.toArray();
}

// ──────────────────────────────────────────────
// Tactical Snapshots Operations
// ──────────────────────────────────────────────

export async function getTacticalSnapshot(
  matchId: string,
): Promise<TacticalSnapshot | null> {
  const data = await db.tactical_snapshots.get(matchId);
  return data ?? null;
}

export async function putTacticalSnapshot(
  snapshot: TacticalSnapshot,
): Promise<void> {
  await db.tactical_snapshots.put(snapshot);
}

export async function deleteTacticalSnapshot(matchId: string): Promise<void> {
  await db.tactical_snapshots.delete(matchId);
}

export async function getAllTacticalSnapshots(): Promise<TacticalSnapshot[]> {
  return db.tactical_snapshots.toArray();
}

export async function putTacticalSnapshotsBatch(
  snapshots: TacticalSnapshot[],
): Promise<void> {
  await db.tactical_snapshots.bulkPut(snapshots);
}

// ──────────────────────────────────────────────
// Match Registry Operations
// ──────────────────────────────────────────────

export async function getAllMatches(): Promise<Match[]> {
  return db.matches.toArray();
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const data = await db.matches.get(matchId);
  return data ?? null;
}

export async function putMatch(match: Match): Promise<void> {
  await db.matches.put(match);
}

export async function putMatchesBatch(matches: Match[]): Promise<void> {
  await db.matches.bulkPut(matches);
}

// ──────────────────────────────────────────────
// Events Operations
// ──────────────────────────────────────────────

export async function getEventsByMatch(
  matchId: string | number,
): Promise<EventRow[]> {
  return db.events.where('match_id').equals(matchId).toArray();
}

export async function putMatchEventsBatch(events: EventRow[]): Promise<void> {
  await db.events.bulkPut(events);
}

export async function getAllEvents(): Promise<EventRow[]> {
  return db.events.toArray();
}

// ──────────────────────────────────────────────
// Combined/Atomic Operations
// ──────────────────────────────────────────────

/**
 * 試合情報とイベントデータをアトミックに保存する。
 * 既存の同 matchId に紐づくイベントを削除してから再挿入（delete-then-insert パターン）。
 * 複合主キー [match_id+id] を使用しているため、match_id インデックスで絞り込んで削除する。
 */
export async function saveMatchUnified(
  match: Match,
  events: EventRow[],
): Promise<void> {
  await db.transaction('rw', [db.matches, db.events], async () => {
    // Step 1: Upsert match metadata
    await db.matches.put(match);
    // Step 2: Delete old events for this match before reinserting
    await db.events.where('match_id').equals(match.id).delete();
    // Step 3: Bulk insert new events
    if (events.length > 0) {
      await db.events.bulkPut(events);
    }
  });
  dispatchRefreshEvent(match.id);
}

export async function deleteMatch(matchId: string): Promise<void> {
  await db.transaction('rw', [db.matches, db.events], async () => {
    await db.matches.delete(matchId);
    await db.events.where('match_id').equals(matchId).delete();
  });
}

/**
 * メモとカスタムイベントを一括で IndexedDB に保存する。
 */
export async function importMemosBatch(
  memos: EventMemo[],
  customEvents: CustomEvent[],
  matchMemos: MatchMemo[] = [],
): Promise<void> {
  // 影響を受ける matchId を収集
  const matchIds = new Set<string | number>();
  memos.forEach((m) => {
    matchIds.add(m.matchId);
  });
  customEvents.forEach((c) => {
    matchIds.add(c.match_id);
  });
  matchMemos.forEach((m) => {
    matchIds.add(m.matchId);
  });

  await db.transaction(
    'rw',
    [db.event_memos, db.custom_events, db.match_memos],
    async () => {
      if (memos.length > 0) await db.event_memos.bulkPut(memos);
      if (customEvents.length > 0) await db.custom_events.bulkPut(customEvents);
      if (matchMemos.length > 0) await db.match_memos.bulkPut(matchMemos);
    },
  );
  console.log(
    `[footics] Batch memo import completed (${
      memos.length + customEvents.length + matchMemos.length
    } items)`,
  );

  // 通知
  if (matchIds.size > 0) {
    matchIds.forEach((id) => {
      dispatchRefreshEvent(id);
    });
  } else {
    dispatchRefreshEvent();
  }
}

/**
 * ファイルからメモをインポートする
 */
export async function importMemosFromJson(
  file: File,
  currentMatchId: string,
): Promise<number> {
  const text = await file.text();
  const memos = JSON.parse(text) as CustomEvent[];

  if (!Array.isArray(memos)) {
    throw new Error('Invalid format: expected an array of memos');
  }

  return db.transaction('rw', db.custom_events, async () => {
    let count = 0;
    for (const memo of memos) {
      if (String(memo.match_id) !== String(currentMatchId)) {
        throw new Error(
          `Match ID mismatch. Expected ${currentMatchId}, found ${memo.match_id}`,
        );
      }
      if (!memo.id || memo.minute === undefined || memo.second === undefined) {
        throw new Error('Invalid memo format');
      }
      await db.custom_events.put(memo);
      count++;
    }
    return count;
  });
}

/**
 * メモを JSON としてエクスポートする
 */
export async function exportMemosAsJson(matchId: string): Promise<void> {
  const memos = await getCustomEventsByMatch(matchId);
  const blob = new Blob([JSON.stringify(memos, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `memos_${matchId}_${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// Key-Value Store Operations
// ──────────────────────────────────────────────

export async function getKeyValue<T = any>(key: string): Promise<T | null> {
  const entry = await db.keyval.get(key);
  return (entry?.value as T) ?? null;
}

export async function setKeyValue<T = any>(
  key: string,
  value: T,
): Promise<void> {
  await db.keyval.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}

export async function deleteKeyValue(key: string): Promise<void> {
  await db.keyval.delete(key);
}
