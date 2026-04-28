import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from 'webext-bridge/content-script';
import { putMatchMemo, saveCustomEvent } from '@/lib/db';
import { STORAGE_KEYS } from '../constants';
import { SaveQueueSchema } from '../types/schemas';
import { detectMatchId } from '../utils/match';

export default defineContentScript({
  matches: [
    '*://localhost/*',
    '*://footics.com/*',
    '*://10.255.255.254/*',
    '*://127.0.0.1/*',
    '*://footics.watool.workers.dev/*',
  ],
  async main() {
    console.log('💎 [Footics Isolated Bridge] Content Script loaded');

    // Main World (bridge) との通信を許可
    allowWindowMessaging('footics-app');

    // Match ID をストレージに同期するロジック
    const syncMatchIdToStorage = async () => {
      const matchId = detectMatchId();

      if (matchId) {
        await browser.storage.local.set({
          [STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]: matchId,
        });
        console.log('[ContentScript] Syncing matchId to storage:', matchId);
      }
    };

    // DOM の変更（dataset.matchId）を監視
    const observer = new MutationObserver(() => syncMatchIdToStorage());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-match-id'],
    });

    // 初期実行
    syncMatchIdToStorage();

    // 1. Listen for messages
    onMessage('GET_ACTIVE_MATCH_INFO', async () => {
      const matchId = detectMatchId();
      console.log('[ContentScript] Detected matchId:', matchId);
      return { matchId };
    });

    /**
     * Storage-Driven Save Queue の処理 (排他制御付き)
     * 複数タブが開いている場合でも、一つのタブだけが IndexedDB への書き込みを担当するように navigator.locks を使用する。
     */
    const processSaveQueue = async () => {
      await navigator.locks.request('footics_save_queue', async () => {
        // 最新のキューを取得
        const stored = await browser.storage.local.get(STORAGE_KEYS.SAVE_QUEUE);
        const parsed = SaveQueueSchema.safeParse(
          stored[STORAGE_KEYS.SAVE_QUEUE],
        );
        if (!parsed.success) return;

        const queue = parsed.data;
        const pendingItems = queue.filter((item) => item.status === 'pending');
        if (pendingItems.length === 0) return;

        console.log(
          `[ContentScript] Processing ${pendingItems.length} pending queue item(s) with lock`,
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
            } else if (item.mode === 'EVENT') {
              await saveCustomEvent({
                id: crypto.randomUUID(),
                match_id: item.matchId,
                minute: item.minute ?? 0,
                second: item.second ?? 0,
                labels: item.labels ?? ['分析メモ'],
                memo: item.memo,
                created_at: Date.now(),
              });
            }

            // 処理済みとしてマーク (あとで一括でクリーンアップされる)
            updatedQueue[idx] = { ...updatedQueue[idx], status: 'done' };

            console.info(
              `[ContentScript] Queue item processed: ${item.id} (${item.mode})`,
            );

            // アプリに更新通知を送信 (fire-and-forget)
            sendMessage(
              'REFRESH_APP',
              { matchId: item.matchId },
              'window',
            ).catch((e) =>
              console.warn('[ContentScript] REFRESH_APP notify failed:', e),
            );
          } catch (e) {
            console.error(`[ContentScript] Queue item failed: ${item.id}`, e);
            updatedQueue[idx] = { ...updatedQueue[idx], status: 'error' };
          }
        }

        // 完了したアイテムを削除してクリーンアップ
        const cleanedQueue = updatedQueue.filter((q) => q.status === 'pending');
        await browser.storage.local.set({
          [STORAGE_KEYS.SAVE_QUEUE]: cleanedQueue,
        });
      });
    };

    // 2. Storage-Driven Save Queue の監視
    browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local') return;
      if (!(STORAGE_KEYS.SAVE_QUEUE in changes)) return;

      const newValue = changes[STORAGE_KEYS.SAVE_QUEUE]?.newValue;
      const parsed = SaveQueueSchema.safeParse(newValue);
      if (!parsed.success) return;

      const hasPending = parsed.data.some((item) => item.status === 'pending');
      if (hasPending) {
        processSaveQueue();
      }
    });

    // 初期ロード時にも未処理のキューがあれば処理する
    processSaveQueue();

    // 3. グローバルな Esc 監視 (サイドパネル用)
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') {
          console.log(
            '[ContentScript] Escape key detected - relaying to background',
          );
          sendMessage('CLOSE_SIDEPANEL', {}, 'background');
        }
      },
      true,
    );
  },
});
