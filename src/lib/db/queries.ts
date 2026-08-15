import type { EventRow, Match } from '@/types';
import type {
  CustomEvent,
  EventMemo,
  MatchMemo,
  TacticalSnapshot,
} from '../schema';
import { SHORTCUT_ACTIONS } from '../shortcuts';
import { db } from './schema';

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
