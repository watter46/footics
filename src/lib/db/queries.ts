import type { EventRow, Match } from '@/types';
import type { CustomEvent, MatchMemo } from '../schema';
import {
  dispatchRefreshEvent,
  getMatchMemo,
  putMatchMemo,
  saveCustomEvent,
} from './extension-db-queries';
import { db } from './schema';

export * from './queries-player';
export { dispatchRefreshEvent, getMatchMemo, putMatchMemo, saveCustomEvent };

// ──────────────────────────────────────────────
// Custom Event Operations
// ──────────────────────────────────────────────

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

export async function getAllMatchMemos(): Promise<MatchMemo[]> {
  return db.match_memos.toArray();
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

export async function getKeyValue<T = unknown>(key: string): Promise<T | null> {
  const entry = await db.keyval.get(key);
  return (entry?.value as T) ?? null;
}

export async function setKeyValue<T = unknown>(
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
