import { browser } from 'wxt/browser';
import type { ExtensionMessage } from '../types/messaging';

export default defineBackground(() => {
  console.log('Footics Background Script loaded');

  // Footics 本体タブを特定するヘルパー
  const findFooticsTab = async () => {
    const allTabs = await browser.tabs.query({});
    return allTabs.find(
      (t) =>
        t.url?.includes('localhost') ||
        t.url?.includes('footics.com') ||
        t.url?.includes('footics.watool.workers.dev'),
    );
  };

  browser.commands.onCommand.addListener(async (command, tab) => {
    console.info('🚀 [Footics BG] Command received:', command);

    if (command !== 'toggle-match-memo' && command !== 'toggle-event-memo')
      return;

    const mode: 'MATCH' | 'EVENT' =
      command === 'toggle-match-memo' ? 'MATCH' : 'EVENT';

    // 1. Footics 本体タブを検索
    const footicsTab = await findFooticsTab();

    // 分析対象タブ（動画視聴中など、コマンドが押されたタブ）
    const activeTab =
      tab ||
      (await browser.tabs.query({ active: true, currentWindow: true }))[0];

    if (!footicsTab) {
      console.warn('❌ [Footics BG] Footics App tab not found.');
      if (activeTab?.id) {
        const message: ExtensionMessage = {
          type: 'OPEN_OVERLAY',
          mode,
          error: 'Footics本体のタブを開いてください',
        };
        browser.tabs.sendMessage(activeTab.id, message);
      }
      return;
    }

    // 2. 本体タブから現在の Match ID を取得
    try {
      const response = await browser.tabs.sendMessage(footicsTab.id!, {
        type: 'GET_ACTIVE_MATCH_INFO',
      });
      const matchId = response?.matchId;

      if (activeTab?.id) {
        const message: ExtensionMessage = {
          type: 'OPEN_OVERLAY',
          mode,
          matchId,
        };
        browser.tabs.sendMessage(activeTab.id, message);
      }
    } catch (err) {
      console.error(
        '❌ [Footics BG] Failed to get match info from app tab:',
        err,
      );
    }
  });

  browser.runtime.onMessage.addListener(async (message: any) => {
    // 3. オーバーレイからの保存リクエストを本体タブへ転送（リレー）
    if (message.type === 'SAVE_MEMO_RELAY') {
      const footicsTab = await findFooticsTab();

      if (footicsTab?.id) {
        return browser.tabs.sendMessage(footicsTab.id, message);
      }
      return { success: false, error: 'Footics本体タブが見つかりません' };
    }
  });
});
