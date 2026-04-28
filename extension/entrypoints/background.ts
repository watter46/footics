import { onMessage, sendMessage } from 'webext-bridge/background';
import { z } from 'zod';
import { FOOTICS_APP_URLS, STORAGE_KEYS } from '../constants';

export default defineBackground(() => {
  console.log('Footics Background Script loaded');

  // Footics 本体タブを特定するヘルパー
  const findFooticsTab = async () => {
    const allTabs = await browser.tabs.query({});
    console.log(
      '[Footics BG] Searching Footics tab among',
      allTabs.length,
      'tabs',
    );
    const tab = allTabs.find((t) =>
      FOOTICS_APP_URLS.some((url) => t.url?.includes(url)),
    );
    if (tab) {
      console.log(
        '[Footics BG] Found Footics tab:',
        tab.url,
        '(ID:',
        tab.id,
        ')',
      );
    } else {
      console.warn(
        '[Footics BG] Footics tab not found. Checked URLs:',
        FOOTICS_APP_URLS,
      );
    }
    return tab;
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
        console.warn('[Footics BG] GET_ACTIVE_MATCH_INFO relay failed:', err);
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

  onMessage('CLOSE_SIDEPANEL', () => {
    // 必要に応じて処理を追加
  });
});
