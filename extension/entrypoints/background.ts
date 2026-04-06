import { browser } from 'wxt/browser';

export default defineBackground(() => {
  console.log('Footics Background Script loaded');

  browser.commands.onCommand.addListener(async (command, tab) => {
    console.info('🚀 [Footics BG] Command received:', command);

    if (command !== 'toggle-match-memo' && command !== 'toggle-event-memo') return;

    const mode: 'MATCH' | 'EVENT' = command === 'toggle-match-memo' ? 'MATCH' : 'EVENT';

    // 1. Footics 本体 (localhost / footics.com) のタブを検索
    const allTabs = await browser.tabs.query({});
    const footicsTab = allTabs.find(t => t.url?.includes('localhost') || t.url?.includes('footics.com'));

    // 分析対象タブ（動画視聴中など、コマンドが押されたタブ）
    const activeTab = tab || (await browser.tabs.query({ active: true, currentWindow: true }))[0];

    if (!footicsTab) {
      console.warn('❌ [Footics BG] Footics App tab not found.');
      if (activeTab?.id) {
        browser.tabs.sendMessage(activeTab.id, { 
          type: 'OPEN_OVERLAY', 
          mode, 
          error: 'Footics本体のタブを開いてください' 
        });
      }
      return;
    }

    // 2. 本体タブから現在の Match ID を取得
    try {
      const response = await browser.tabs.sendMessage(footicsTab.id!, { type: 'GET_ACTIVE_MATCH_INFO' });
      const matchId = response?.matchId;

      if (activeTab?.id) {
        browser.tabs.sendMessage(activeTab.id, { 
          type: 'OPEN_OVERLAY', 
          mode, 
          matchId 
        });
      }
    } catch (err) {
      console.error('❌ [Footics BG] Failed to get match info from app tab:', err);
    }
  });

  browser.runtime.onMessage.addListener(async (message) => {
    // 3. オーバーレイからの保存リクエストを本体タブへ転送（リレー）
    if (message.type === 'SAVE_MEMO_RELAY') {
      const allTabs = await browser.tabs.query({});
      const footicsTab = allTabs.find(t => t.url?.includes('localhost') || t.url?.includes('footics.com'));

      if (footicsTab?.id) {
        return browser.tabs.sendMessage(footicsTab.id, message);
      }
      return { success: false, error: 'Footics本体タブが見つかりません' };
    }
  });
});