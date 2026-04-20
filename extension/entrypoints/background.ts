import { z } from 'zod';
import { FOOTICS_APP_URLS, STORAGE_KEYS } from '../constants';
import type { ExtensionMessage } from '../types/messaging';
import {
  ExtensionMessageSchema,
  MatchInfoResponseSchema,
} from '../types/schemas';

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

    // ストレージに無い場合のみ、本体タブに直接聞きに行く
    if (!matchId && footicsTab?.id) {
      try {
        const rawResponse = await browser.tabs.sendMessage(footicsTab.id, {
          type: 'GET_ACTIVE_MATCH_INFO',
        });
        const response = MatchInfoResponseSchema.safeParse(rawResponse).data;
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
        const message: ExtensionMessage = {
          type: 'OPEN_OVERLAY',
          mode,
          error: 'Footics本体のタブを開いて試合を特定してください',
        };
        browser.tabs.sendMessage(activeTab.id, message);
      }
      return;
    }

    // 3. オーバレイを開く
    if (activeTab?.id) {
      const message: ExtensionMessage = {
        type: 'OPEN_OVERLAY',
        mode,
        matchId: matchId || undefined,
      };
      browser.tabs.sendMessage(activeTab.id, message);
    }
  });

  browser.runtime.onMessage.addListener(async (rawMessage) => {
    const result = ExtensionMessageSchema.safeParse(rawMessage);
    if (!result.success) {
      console.warn('[Footics BG] Invalid message received:', result.error);
      return;
    }

    const message = result.data;

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
