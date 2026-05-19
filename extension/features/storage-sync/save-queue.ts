import { sendMessage } from 'webext-bridge/content-script';
import { putMatchMemo, saveCustomEvent } from '@/lib/db';
import { STORAGE_KEYS } from '../../constants';
import {
  type SaveQueueItem,
  SaveQueueItemSchema,
  SaveQueueSchema,
} from '../../types/schemas';
import { syncMatchMemoCacheToStorage } from './cache-sync';

/**
 * addToSaveQueue
 *
 * 責務: Storage Queue に新しい保存アイテムを追加する。
 * MemoOverlayBridge と SAVE_MEMO_RELAY の両方から呼び出される共通ロジック。
 */
export async function addToSaveQueue(
  payload: Omit<SaveQueueItem, 'id' | 'status' | 'createdAt'>,
): Promise<void> {
  const newItem: SaveQueueItem = SaveQueueItemSchema.parse({
    id: crypto.randomUUID(),
    status: 'pending',
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
 * pending ステータスのキューアイテムを順次処理し IndexedDB に書き込む。
 * 複数タブが開いている場合でも、一つのタブだけが書き込みを担当する。
 */
export async function processSaveQueue(): Promise<void> {
  await navigator.locks.request('footics_save_queue', async () => {
    // 最新のキューを取得
    const stored = await browser.storage.local.get(STORAGE_KEYS.SAVE_QUEUE);
    const parsed = SaveQueueSchema.safeParse(stored[STORAGE_KEYS.SAVE_QUEUE]);
    if (!parsed.success) return;

    const queue = parsed.data;
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) return;

    console.log(
      `[save-queue] Processing ${pendingItems.length} pending item(s) with lock`,
    );

    const updatedQueue = [...queue];

    for (const item of pendingItems) {
      const idx = updatedQueue.findIndex((q) => q.id === item.id);
      if (idx === -1) continue;

      try {
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

        // 処理済みとしてマーク
        updatedQueue[idx] = { ...updatedQueue[idx], status: 'done' };

        console.info(`[save-queue] Processed: ${item.id} (${item.mode})`);
      } catch (e) {
        console.error(`[save-queue] Failed: ${item.id}`, e);
        updatedQueue[idx] = { ...updatedQueue[idx], status: 'error' };
      }
    }

    // 完了・エラーアイテムを削除してクリーンアップ
    const cleanedQueue = updatedQueue.filter((q) => q.status === 'pending');
    await browser.storage.local.set({
      [STORAGE_KEYS.SAVE_QUEUE]: cleanedQueue,
    });
  });
}
