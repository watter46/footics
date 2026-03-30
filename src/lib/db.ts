/**
 * footics Unified Database Layer
 *
 * 設計意図:
 * - 旧 custom-events/store.ts を統合し、単一のDBモジュールとして管理
 * - event_memos: WhoScoredイベントへのメモ・タグ（TanStack Query経由）
 * - custom_events: 手動追加のカスタムイベント（既存機能の移植）
 * - シングルトンパターンでDB接続を管理
 */
import { openDB, type IDBPDatabase } from "idb";
import type { EventMemo, CustomEvent } from "./schema";

// ──────────────────────────────────────────────
// DB Schema Definition
// ──────────────────────────────────────────────

const DB_NAME = "footics_db";
const DB_VERSION = 1;

interface FooticsDBSchema {
  event_memos: {
    key: number;
    value: EventMemo;
    indexes: {
      by_match: number;
    };
  };
  custom_events: {
    key: string;
    value: CustomEvent;
    indexes: {
      by_match: string;
    };
  };
}

// ──────────────────────────────────────────────
// Singleton DB Connection
// ──────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<FooticsDBSchema>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<FooticsDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FooticsDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // event_memos ストア
        if (!db.objectStoreNames.contains("event_memos")) {
          const memoStore = db.createObjectStore("event_memos", {
            keyPath: "id",
          });
          memoStore.createIndex("by_match", "matchId", { unique: false });
        }

        // custom_events ストア（旧 footlog_custom_events_db から統合）
        if (!db.objectStoreNames.contains("custom_events")) {
          const customStore = db.createObjectStore("custom_events", {
            keyPath: "id",
          });
          customStore.createIndex("by_match", "match_id", { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

// ──────────────────────────────────────────────
// Event Memo Operations (NEW: TanStack Query 用)
// ──────────────────────────────────────────────

export async function getEventMemosByMatch(
  matchId: number
): Promise<EventMemo[]> {
  const db = await getDatabase();
  return db.getAllFromIndex("event_memos", "by_match", matchId);
}

export async function putEventMemo(memo: EventMemo): Promise<void> {
  const db = await getDatabase();
  await db.put("event_memos", memo);
}

// ──────────────────────────────────────────────
// Custom Event Operations (旧 custom-events/store.ts から移植)
// ──────────────────────────────────────────────

export async function saveCustomEvent(event: CustomEvent): Promise<void> {
  const db = await getDatabase();
  await db.put("custom_events", event);
}

export async function getCustomEventsByMatch(
  matchId: string
): Promise<CustomEvent[]> {
  const db = await getDatabase();
  return db.getAllFromIndex("custom_events", "by_match", matchId);
}

export async function deleteCustomEvent(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete("custom_events", id);
}

export async function exportMemosAsJson(matchId: string): Promise<void> {
  const memos = await getCustomEventsByMatch(matchId);
  const blob = new Blob([JSON.stringify(memos, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `memos_${matchId}_${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importMemosFromJson(
  file: File,
  currentMatchId: string
): Promise<number> {
  const text = await file.text();
  const memos = JSON.parse(text) as CustomEvent[];

  if (!Array.isArray(memos)) {
    throw new Error("Invalid format: expected an array of memos");
  }

  let count = 0;
  const db = await getDatabase();
  const transaction = db.transaction("custom_events", "readwrite");

  for (const memo of memos) {
    if (String(memo.match_id) !== String(currentMatchId)) {
      throw new Error(
        `Match ID mismatch. Expected ${currentMatchId}, found ${memo.match_id}`
      );
    }
    if (!memo.id || memo.minute === undefined || memo.second === undefined) {
      throw new Error("Invalid memo format");
    }
    await transaction.store.put(memo);
    count++;
  }

  await transaction.done;
  return count;
}

export async function getAllEventMemos(): Promise<EventMemo[]> {
  const db = await getDatabase();
  return db.getAll("event_memos");
}

export async function getAllCustomEvents(): Promise<CustomEvent[]> {
  const db = await getDatabase();
  return db.getAll("custom_events");
}
