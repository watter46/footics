import type { CustomEvent, EventMemo, MatchMemo } from '../schema';
import { dispatchRefreshEvent, getCustomEventsByMatch } from './queries';
import { db } from './schema';

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
