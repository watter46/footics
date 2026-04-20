/**
 * footics Unified Database Layer (Dexie.js Implementation)
 *
 * 設計意図:
 * - 旧 idb ベースの実装を Dexie.js に移行し、型安全性と操作性を向上。
 * - 各ストアのスキーマ定義を Dexie の形式で一元管理。
 * - 既存の footics_db (v11) との互換性を維持。
 */
import Dexie, { type Table } from 'dexie';
import type { MatchBlobEntry, MatchSummary } from '@/types';
import type {
  CustomEvent,
  EventMemo,
  MatchMemo,
  TacticalSnapshot,
} from './schema';

// ──────────────────────────────────────────────
// DB Schema Definition
// ──────────────────────────────────────────────

export interface KeyValEntry<T = any> {
  key: string;
  value: T;
  updatedAt: number;
}

const DB_NAME = 'footics_db';
const DB_VERSION = 12;

export class FooticsDatabase extends Dexie {
  event_memos!: Table<EventMemo, number>;
  custom_events!: Table<CustomEvent, string>;
  match_memos!: Table<MatchMemo, string>;
  tactical_snapshots!: Table<TacticalSnapshot, string>;
  matches!: Table<MatchSummary, string>;
  match_blobs!: Table<MatchBlobEntry, string>;
  keyval!: Table<KeyValEntry, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      event_memos: 'id, matchId, updatedAt',
      custom_events: 'id, match_id, created_at',
      match_memos: 'matchId',
      tactical_snapshots: 'matchId',
      matches: 'id',
      match_blobs: 'matchId',
      keyval: 'key',
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
}

export async function getAllEventMemos(): Promise<EventMemo[]> {
  return db.event_memos.toArray();
}

// ──────────────────────────────────────────────
// Custom Event Operations
// ──────────────────────────────────────────────

export async function saveCustomEvent(event: CustomEvent): Promise<void> {
  await db.custom_events.put(event);
}

export async function getCustomEventsByMatch(
  matchId: string,
): Promise<CustomEvent[]> {
  return db.custom_events.where('match_id').equals(matchId).toArray();
}

export async function deleteCustomEvent(id: string): Promise<void> {
  await db.custom_events.delete(id);
}

export async function getAllCustomEvents(): Promise<CustomEvent[]> {
  return db.custom_events.toArray();
}

// ──────────────────────────────────────────────
// Match Memo Operations
// ──────────────────────────────────────────────

export async function getMatchMemo(
  matchId: string,
): Promise<MatchMemo | undefined> {
  return db.match_memos.get(matchId);
}

export async function putMatchMemo(memo: MatchMemo): Promise<void> {
  await db.match_memos.put(memo);
}

export async function getAllMatchMemos(): Promise<MatchMemo[]> {
  return db.match_memos.toArray();
}

// ──────────────────────────────────────────────
// Tactical Snapshots Operations
// ──────────────────────────────────────────────

export async function getTacticalSnapshot(
  matchId: string,
): Promise<TacticalSnapshot | undefined> {
  return db.tactical_snapshots.get(matchId);
}

export async function putTacticalSnapshot(
  snapshot: TacticalSnapshot,
): Promise<void> {
  await db.tactical_snapshots.put(snapshot);
}

export async function deleteTacticalSnapshot(matchId: string): Promise<void> {
  await db.tactical_snapshots.delete(matchId);
}

// ──────────────────────────────────────────────
// Match Registry Operations
// ──────────────────────────────────────────────

export async function getAllMatches(): Promise<MatchSummary[]> {
  return db.matches.toArray();
}

export async function getMatch(
  matchId: string,
): Promise<MatchSummary | undefined> {
  return db.matches.get(matchId);
}

export async function putMatch(match: MatchSummary): Promise<void> {
  await db.matches.put(match);
}

export async function putMatchesBatch(matches: MatchSummary[]): Promise<void> {
  await db.matches.bulkPut(matches);
}

// ──────────────────────────────────────────────
// Match Blob (Parquet) Operations
// ──────────────────────────────────────────────

export async function getMatchBlobs(
  matchId: string,
): Promise<MatchBlobEntry | undefined> {
  return db.match_blobs.get(matchId);
}

export async function getAllMatchBlobs(): Promise<MatchBlobEntry[]> {
  return db.match_blobs.toArray();
}

export async function putMatchBlobs(
  matchId: string,
  entry: MatchBlobEntry,
): Promise<void> {
  await db.match_blobs.put(entry);
}

export async function putMatchBlobsBatch(
  entries: MatchBlobEntry[],
): Promise<void> {
  await db.match_blobs.bulkPut(entries);
}

// ──────────────────────────────────────────────
// Combined/Atomic Operations
// ──────────────────────────────────────────────

/**
 * 試合情報とバイナリデータをアトミックに保存する
 */
export async function saveMatchUnified(
  match: MatchSummary,
  entry: MatchBlobEntry,
): Promise<void> {
  await db.transaction('rw', [db.matches, db.match_blobs], async () => {
    await db.matches.put(match);
    await db.match_blobs.put(entry);
  });
}

export async function deleteMatch(matchId: string): Promise<void> {
  await db.transaction('rw', [db.matches, db.match_blobs], async () => {
    await db.matches.delete(matchId);
    await db.match_blobs.delete(matchId);
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

export async function getKeyValue<T = any>(
  key: string,
): Promise<T | undefined> {
  const entry = await db.keyval.get(key);
  return entry?.value as T | undefined;
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
