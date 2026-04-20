import { onMessage, sendMessage } from 'webext-bridge/content-script';
import { putMatchMemo, saveCustomEvent } from '@/lib/db';
import { STORAGE_KEYS } from '../constants';

export default defineContentScript({
  matches: [
    '*://localhost/*',
    '*://footics.com/*',
    '*://10.255.255.254/*',
    '*://127.0.0.1/*',
    '*://footics.watool.workers.dev/*',
  ],
  async main() {
    console.log('Footics Bridge Content Script loaded');

    // 3. メインワールド（本体アプリ）へイベントを飛ばすためのブリッジ
    const dispatchMainWorldEvent = (
      type: string,
      detail: Record<string, unknown>,
    ) => {
      const script = document.createElement('script');
      script.textContent = `
        window.dispatchEvent(new CustomEvent('footics-action', {
          detail: ${JSON.stringify({ ...detail, type })}
        }));
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    };

    // 4. Match ID をストレージに同期するロジック
    const syncMatchIdToStorage = async () => {
      const pathParts = window.location.pathname.split('/');
      const matchIdx = pathParts.indexOf('match');
      const matchIdFromUrl =
        matchIdx !== -1 ? pathParts[matchIdx + 1] : undefined;

      const matchId =
        document.documentElement.dataset.matchId ||
        document.body.dataset.matchId ||
        matchIdFromUrl ||
        pathParts.find((p) => p.startsWith('match_'));

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

    // 1. Listen for messages from Background / Sidepanel
    onMessage('GET_ACTIVE_MATCH_INFO', async () => {
      const pathParts = window.location.pathname.split('/');
      const matchIdx = pathParts.indexOf('match');
      const matchIdFromUrl =
        matchIdx !== -1 ? pathParts[matchIdx + 1] : undefined;

      const matchId =
        document.documentElement.dataset.matchId ||
        document.body.dataset.matchId ||
        matchIdFromUrl ||
        pathParts.find((p) => p.startsWith('match_'));

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
        // メインワールド（アプリ側）に通知
        dispatchMainWorldEvent('REFRESH_DATA', { matchId });
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
        // メインワールド（アプリ側）に通知
        dispatchMainWorldEvent('REFRESH_DATA', { matchId: event.match_id });
        return { success: true };
      } catch (e) {
        console.error('[ContentScript] SAVE_CUSTOM_EVENT failed:', e);
        return { success: false, error: String(e) };
      }
    });

    // 2. グローバルな Esc 監視
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
