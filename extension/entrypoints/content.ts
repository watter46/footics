import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from 'webext-bridge/content-script';
import { putMatchMemo, saveCustomEvent } from '@/lib/db';
import { STORAGE_KEYS } from '../constants';
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

    onMessage('SAVE_MEMO_RELAY', async ({ data }) => {
      const { mode, matchId, memo } = data;
      console.log('[ContentScript] Saving via Relay:', mode, matchId);

      try {
        if (mode === 'MATCH') {
          await putMatchMemo({ matchId, memo, updatedAt: Date.now() });
        } else if (mode === 'EVENT') {
          await saveCustomEvent({
            id: crypto.randomUUID(),
            match_id: matchId,
            minute: data.minute || 0,
            second: data.second || 0,
            labels: data.labels || ['分析メモ'],
            memo: memo || '',
            created_at: Date.now(),
          });
        }
        // メインワールド（アプリ側）に通知 (webext-bridge 経由)
        // await するとバックグラウンド側で Transaction タイムアウトが発生するため fire-and-forget で送信する
        sendMessage('REFRESH_APP', { matchId }, 'window').catch((e) =>
          console.warn('[ContentScript] REFRESH_APP notify failed:', e),
        );

        return { success: true };
      } catch (e) {
        console.error('[ContentScript] Save Relay failed:', e);
        return { success: false, error: String(e) };
      }
    });

    onMessage('SAVE_CUSTOM_EVENT', async ({ data }) => {
      const { event } = data;
      try {
        await saveCustomEvent(event);
        // メインワールド（アプリ側）に通知 (webext-bridge 経由)
        await sendMessage('REFRESH_APP', { matchId: event.match_id }, 'window');

        return { success: true };
      } catch (e) {
        console.error('[ContentScript] SAVE_CUSTOM_EVENT failed:', e);
        return { success: false, error: String(e) };
      }
    });

    // 2. グローバルな Esc 監視 (サイドパネル用)
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
