import { onMessage, sendMessage } from 'webext-bridge/background';
import { z } from 'zod';
import { FOOTICS_APP_URLS, STORAGE_KEYS } from '../constants';

export default defineBackground(() => {
  console.log('Footics Background Script loaded');

  // Footics 本体タブを特定するヘルパー
  const findFooticsTab = async () => {
    const allTabs = await browser.tabs.query({});
    return allTabs.find((t) =>
      FOOTICS_APP_URLS.some((url) => t.url?.includes(url)),
    );
  };

  browser.commands.onCommand.addListener(async (command, tab) => {
    console.info('🚀 [Footics BG] Command received:', command);

    if (command !== 'toggle-match-memo' && command !== 'toggle-event-memo')
      return;

    const mode: 'MATCH' | 'EVENT' =
      command === 'toggle-match-memo' ? 'MATCH' : 'EVENT';

    const footicsTab = await findFooticsTab();

    // 分析対象タブ（動画視聴中など、コマンドが押されたタブ）
    const activeTab =
      tab ||
      (await browser.tabs.query({ active: true, currentWindow: true }))[0];

    const stored = await browser.storage.local.get(
      STORAGE_KEYS.LAST_ACTIVE_MATCH_ID,
    );
    let matchId = z
      .string()
      .safeParse(stored[STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]).data;

    if (!matchId && footicsTab?.id) {
      try {
        const response = await sendMessage(
          'GET_ACTIVE_MATCH_INFO',
          {},
          `content-script@${footicsTab.id}`,
        );
        matchId = response?.matchId;
      } catch (err) {
        console.warn('[Footics BG] Legacy relay fallback failed:', err);
      }
    }

    if (!matchId && !footicsTab) {
      console.warn(
        '❌ [Footics BG] Footics App tab not found and no ID in storage.',
      );
      if (activeTab?.id) {
        sendMessage(
          'OPEN_OVERLAY',
          {
            mode,
            error: 'Footics本体のタブを開いて試合を特定してください',
          },
          `content-script@${activeTab.id}`,
        );
      }
      return;
    }

    // 3. オーバレイを開く
    if (activeTab?.id) {
      sendMessage(
        'OPEN_OVERLAY',
        {
          mode,
          matchId: matchId || undefined,
        },
        `content-script@${activeTab.id}`,
      );
    }
  });

  onMessage('SAVE_MEMO_RELAY', async ({ data }) => {
    const footicsTab = await findFooticsTab();
    if (footicsTab?.id) {
      return sendMessage(
        'SAVE_MEMO_RELAY',
        data,
        `content-script@${footicsTab.id}`,
      );
    }
    return { success: false, error: 'Footics本体タブが見つかりません' };
  });

  onMessage('CLOSE_SIDEPANEL', () => {
    // 必要に応じて処理を追加
  });
});
