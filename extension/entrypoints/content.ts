import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from 'webext-bridge/content-script';
import { STORAGE_KEYS } from '../constants';
import {
  addToSaveQueue,
  processSaveQueue,
} from '../features/storage-sync/save-queue';
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

    // ── Match ID の同期 ──
    const syncMatchIdToStorage = async () => {
      const matchId = detectMatchId();
      if (matchId) {
        await browser.storage.local.set({
          [STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]: matchId,
        });
        console.log('[ContentScript] Syncing matchId to storage:', matchId);
      }
    };

    const observer = new MutationObserver(() => syncMatchIdToStorage());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-match-id'],
    });
    syncMatchIdToStorage();

    // ── メッセージハンドラ ──

    onMessage('GET_ACTIVE_MATCH_INFO', async () => {
      const matchId = detectMatchId();
      console.log('[ContentScript] Detected matchId:', matchId);
      return { matchId };
    });

    // アプリからの保存リクエスト（Main Bridge 経由）をキューへ登録
    onMessage('SAVE_MEMO_RELAY', async ({ data: payload }) => {
      if (!payload) return;
      console.log('[ContentScript] Received relayed save request:', payload);
      await addToSaveQueue(payload as Parameters<typeof addToSaveQueue>[0]);
    });

    // ── Storage Queue の監視 ──

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

    // 初期ロード時にも未処理キューがあれば処理する
    processSaveQueue();

    // ── グローバルショートカット監視（Capture Phase） ──
    // アプリ側の stopPropagation を越えてキーを拾い、コマンドとして再配送する
    window.addEventListener(
      'keydown',
      (e) => {
        const isEscape = e.key === 'Escape';
        const isSave = e.key === 'Enter' && (e.ctrlKey || e.metaKey);

        if (!isEscape && !isSave) return;

        const action = isEscape ? 'CLOSE_OVERLAY' : 'SAVE_MEMO';

        // アプリ側へ通知 (useDataSync / useMemoOverlayEventBridge が受信)
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action },
          }),
        );

        // サイドパネルを閉じる（Escape の場合）
        if (isEscape) {
          sendMessage('CLOSE_SIDEPANEL', {}, 'background').catch(() => {});
        }

        // Ctrl+Enter はデフォルト挙動（改行）を抑制
        if (isSave) {
          e.preventDefault();
        }
      },
      true,
    );
  },
});
