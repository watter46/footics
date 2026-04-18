import { getMatchMemo, putMatchMemo, saveCustomEvent } from '@/lib/db';
import { MatchMemoSchema } from '@/lib/schema';

export default defineContentScript({
  matches: [
    '*://localhost/*',
    '*://footics.com/*',
    '*://10.255.255.254/*',
    '*://127.0.0.1/*',
  ],
  async main() {
    console.log('Footics Bridge Content Script loaded');

    // 1. Listen for messages from Background / Sidepanel
    browser.runtime.onMessage.addListener(async (message) => {
      console.log('[ContentScript] Message received:', message.type);

      if (message.type === 'footics-action') {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: message.detail,
          }),
        );
        return;
      }

      if (message.type === 'GET_ACTIVE_MATCH_INFO') {
        const matchId =
          document.documentElement.dataset.matchId ||
          window.location.pathname
            .split('/')
            .find((p) => p.startsWith('match_'));
        return { matchId };
      }

      if (message.type === 'SAVE_MEMO_RELAY') {
        const { mode, matchId, memo, minute, second, labels } = message;
        console.log('[ContentScript] Saving via Relay:', mode, matchId);

        try {
          if (mode === 'MATCH') {
            await putMatchMemo({ matchId, memo, updatedAt: Date.now() });
          } else if (mode === 'EVENT') {
            await saveCustomEvent({
              id: crypto.randomUUID(),
              match_id: matchId,
              minute: minute || 0,
              second: second || 0,
              labels: labels || ['分析メモ'],
              memo: memo || '',
              created_at: Date.now(),
            });
          }
          window.dispatchEvent(
            new CustomEvent('footics-action', {
              detail: { type: 'REFRESH_DATA' },
            }),
          );
          return { success: true };
        } catch (e) {
          console.error('[ContentScript] Save Relay failed:', e);
          return { success: false, error: String(e) };
        }
      }

      if (message.type === 'SAVE_CUSTOM_EVENT') {
        const { event } = message;
        try {
          await saveCustomEvent(event);
          window.dispatchEvent(
            new CustomEvent('footics-action', {
              detail: { type: 'REFRESH_DATA', matchId: event.match_id },
            }),
          );
          return { success: true };
        } catch (e) {
          console.error('[ContentScript] SAVE_CUSTOM_EVENT failed:', e);
          return { success: false, error: String(e) };
        }
      }
    });

    // 2. グローバルな Esc 監視 (サイドパネルへのフォーカスがない場合をカバー)
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') {
          console.log(
            '[ContentScript] Escape key detected - relaying to background',
          );
          browser.runtime.sendMessage({ type: 'CLOSE_SIDEPANEL' });
        }
      },
      true,
    );
  },
});
