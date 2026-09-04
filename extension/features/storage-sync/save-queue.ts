import { putMatchMemo, saveCustomEvent } from '@/lib/db';
import { STORAGE_KEYS } from '../../constants';
import {
  type SaveQueueItem,
  SaveQueueItemSchema,
  SaveQueueSchema,
} from '../../types/schemas';
import { syncMatchMemoCacheToStorage } from './cache-sync';

export const MAX_QUEUE_RETRIES = 3;

/**
 * executeSaveItem
 *
 * 責務: 個別のキューアイテムをモードに応じて IndexedDB に書き込む。
 */
async function executeSaveItem(item: SaveQueueItem): Promise<void> {
  if (item.mode === 'MATCH') {
    await putMatchMemo({
      matchId: item.matchId,
      memo: item.memo,
      updatedAt: Date.now(),
    });
    // 共通のキャッシュ同期ロジックを呼び出す
    await syncMatchMemoCacheToStorage(item.matchId);
  } else if (item.mode === 'EVENT') {
    await saveCustomEvent({
      id: item.entityId || crypto.randomUUID(),
      match_id: item.matchId,
      period: item.period ?? 1,
      minute: item.minute ?? 0,
      second: item.second ?? 0,
      labels: item.labels ?? ['分析メモ'],
      memo: item.memo,
      created_at: Date.now(),
    });
  }
}

/**
 * handleSaveError
 *
 * 責務: エラー発生時のリトライ回数カウントアップとステータス（error / failed）更新。
 */
function handleSaveError(item: SaveQueueItem, error: unknown): SaveQueueItem {
  const nextRetryCount = (item.retryCount ?? 0) + 1;
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (nextRetryCount < MAX_QUEUE_RETRIES) {
    console.warn(
      `[save-queue] Retryable error for ${item.id} (attempt ${nextRetryCount}/${MAX_QUEUE_RETRIES}):`,
      error,
    );
    return {
      ...item,
      status: 'error',
      retryCount: nextRetryCount,
      errorMessage,
    };
  }

  console.error(
    `[save-queue] Max retries reached for ${item.id} (status: failed):`,
    error,
  );
  return {
    ...item,
    status: 'failed',
    retryCount: nextRetryCount,
    errorMessage,
  };
}

/**
 * addToSaveQueue
 *
 * 責務: Storage Queue に新しい保存アイテムを追加する。
 * MemoOverlayBridge と SAVE_MEMO_RELAY の両方から呼び出される共通ロジック。
 */
export async function addToSaveQueue(
  payload: Omit<
    SaveQueueItem,
    'id' | 'status' | 'createdAt' | 'retryCount' | 'errorMessage'
  > & {
    retryCount?: number;
    errorMessage?: string;
  },
): Promise<void> {
  const newItem: SaveQueueItem = SaveQueueItemSchema.parse({
    id: crypto.randomUUID(),
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
    ...payload,
  });

  const stored = await browser.storage.local.get(STORAGE_KEYS.SAVE_QUEUE);
  const rawQueue = stored[STORAGE_KEYS.SAVE_QUEUE];
  const parsed = SaveQueueSchema.safeParse(rawQueue);
  const currentQueue = parsed.success ? parsed.data : [];

  await browser.storage.local.set({
    [STORAGE_KEYS.SAVE_QUEUE]: [...currentQueue, newItem],
  });

  console.info('[save-queue] Queued item:', newItem.id, `(${newItem.mode})`);
}

/**
 * processSaveQueue
 *
 * 責務: navigator.locks を用いた排他制御のもと、
 * pending または リトライ対象 (error かつ retryCount < 3) のキューアイテムを順次処理し IndexedDB に書き込む。
 * 複数タブが開いている場合でも、一つのタブだけが書き込みを担当する。
 */
export async function processSaveQueue(): Promise<void> {
  await navigator.locks.request('footics_save_queue', async () => {
    // 最新のキューを取得
    const stored = await browser.storage.local.get(STORAGE_KEYS.SAVE_QUEUE);
    const parsed = SaveQueueSchema.safeParse(stored[STORAGE_KEYS.SAVE_QUEUE]);
    if (!parsed.success) return;

    const queue = parsed.data;
    const pendingItems = queue.filter(
      (item) =>
        item.status === 'pending' ||
        (item.status === 'error' && (item.retryCount ?? 0) < MAX_QUEUE_RETRIES),
    );
    if (pendingItems.length === 0) return;

    console.log(
      `[save-queue] Processing ${pendingItems.length} pending item(s) with lock`,
    );

    const updatedQueue = [...queue];

    for (const item of pendingItems) {
      const idx = updatedQueue.findIndex((q) => q.id === item.id);
      if (idx === -1) continue;

      try {
        await executeSaveItem(item);
        // 処理済みとしてマーク
        updatedQueue[idx] = { ...updatedQueue[idx], status: 'done' };
        console.info(`[save-queue] Processed: ${item.id} (${item.mode})`);
      } catch (e) {
        updatedQueue[idx] = handleSaveError(updatedQueue[idx], e);
      }
    }

    // 完了・失敗（上限到達）アイテムを除去し、未処理またはリトライ可能なアイテムのみ残す
    const cleanedQueue = updatedQueue.filter(
      (q) =>
        q.status === 'pending' ||
        (q.status === 'error' && (q.retryCount ?? 0) < MAX_QUEUE_RETRIES),
    );
    await browser.storage.local.set({
      [STORAGE_KEYS.SAVE_QUEUE]: cleanedQueue,
    });
  });
}
