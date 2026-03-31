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
import type { EventMemo, CustomEvent, MatchMemo, TacticalSetting } from "./schema";

// ──────────────────────────────────────────────
// DB Schema Definition
// ──────────────────────────────────────────────

const DB_NAME = "footics_db";
const DB_VERSION = 7;

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
  match_memos: {
    key: string;
    value: MatchMemo;
  };
  tactical_settings: {
    key: string; // matchId-playerId
    value: TacticalSetting;
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
      upgrade(db, oldVersion, newVersion, transaction) {
        // event_memos ストア
        if (!db.objectStoreNames.contains("event_memos")) {
          db.createObjectStore("event_memos", { keyPath: "id" });
        }
        const memoStore = transaction.objectStore("event_memos");
        if (!memoStore.indexNames.contains("by_match")) {
          memoStore.createIndex("by_match", "matchId", { unique: false });
        }
        if (!memoStore.indexNames.contains("by_updatedAt")) {
          memoStore.createIndex("by_updatedAt", "updatedAt", { unique: false });
        }

        // custom_events ストア
        if (!db.objectStoreNames.contains("custom_events")) {
          db.createObjectStore("custom_events", { keyPath: "id" });
        }
        const customStore = transaction.objectStore("custom_events");
        if (!customStore.indexNames.contains("by_match")) {
          customStore.createIndex("by_match", "match_id", { unique: false });
        }
        if (!customStore.indexNames.contains("by_created_at")) {
          customStore.createIndex("by_created_at", "created_at", { unique: false });
        }

        // match_memos ストア
        if (!db.objectStoreNames.contains("match_memos")) {
          db.createObjectStore("match_memos", { keyPath: "matchId" });
        }

        // tactical_settings ストア
        if (!db.objectStoreNames.contains("tactical_settings")) {
          db.createObjectStore("tactical_settings", { keyPath: "id" });
        }
        const tacticalStore = transaction.objectStore("tactical_settings");
        if (!tacticalStore.indexNames.contains("by_match")) {
          tacticalStore.createIndex("by_match", "matchId", { unique: false });
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

// ──────────────────────────────────────────────
// Match Memo Operations
// ──────────────────────────────────────────────

export async function getMatchMemo(matchId: string): Promise<MatchMemo | undefined> {
  const db = await getDatabase();
  return db.get("match_memos", matchId);
}

export async function putMatchMemo(memo: MatchMemo): Promise<void> {
  const db = await getDatabase();
  await db.put("match_memos", memo);
}

export async function getAllMatchMemos(): Promise<MatchMemo[]> {
  const db = await getDatabase();
  return db.getAll("match_memos");
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

/**
 * メモとカスタムイベントを一括で IndexedDB に保存する。
 * 単独のトランザクションを使用し、完結を保証する。
 */
export async function importMemosBatch(
  memos: EventMemo[],
  customEvents: CustomEvent[],
  matchMemos: MatchMemo[] = []
): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(["event_memos", "custom_events", "match_memos"], "readwrite");
  
  const memoStore = tx.objectStore("event_memos");
  const eventStore = tx.objectStore("custom_events");
  const matchMemoStore = tx.objectStore("match_memos");

  for (const m of memos) {
    memoStore.put(m);
  }
  for (const e of customEvents) {
    eventStore.put(e);
  }
  for (const mm of matchMemos) {
    matchMemoStore.put(mm);
  }

  await tx.done;
  console.log(`[footics] Batch memo import completed (${memos.length + customEvents.length + matchMemos.length} items)`);
}

// ──────────────────────────────────────────────
// Tactical Settings Operations
// ──────────────────────────────────────────────

export async function getTacticalSettingsByMatch(
  matchId: string
): Promise<TacticalSetting[]> {
  const db = await getDatabase();
  return db.getAllFromIndex("tactical_settings", "by_match", matchId);
}

export async function putTacticalSetting(setting: TacticalSetting): Promise<void> {
  const db = await getDatabase();
  await db.put("tactical_settings", setting);
}

export async function deleteTacticalSettingsByMatch(matchId: string): Promise<void> {
  const db = await getDatabase();
  const settings = await getTacticalSettingsByMatch(matchId);
  const tx = db.transaction("tactical_settings", "readwrite");
  for (const s of settings) {
    tx.store.delete(s.id);
  }
  await tx.done;
}
