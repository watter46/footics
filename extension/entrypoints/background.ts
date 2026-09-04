import { onMessage, sendMessage } from 'webext-bridge/background';
import { z } from 'zod';
import { FOOTICS_APP_URLS, STORAGE_KEYS } from '../constants';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Main background entrypoint
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

    let activeTab = tab;
    if (!activeTab?.id) {
      const tabs = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      activeTab = tabs[0];
    }
    if (!activeTab?.id) {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      activeTab = tabs[0];
    }

    // ── 1. Tactical キャプチャコマンドの処理 ──
    if (command === 'capture-to-tactical') {
      if (activeTab?.id) {
        console.log(
          '📸 [Footics BG] Sending TRIGGER_CAPTURE to active tab:',
          activeTab.id,
          activeTab.url,
        );
        try {
          await sendMessage(
            'TRIGGER_CAPTURE',
            {},
            `content-script@${activeTab.id}`,
          );
        } catch (err) {
          console.error(
            '❌ [Footics BG] Failed to send TRIGGER_CAPTURE to content script:',
            err,
          );
        }
      } else {
        console.warn('❌ [Footics BG] No active tab found for capture');
      }
      return;
    }

    // ── 2. ミニモードトグルコマンドの処理 ──
    if (command === 'toggle-mini-mode') {
      if (activeTab?.id) {
        console.log(
          '📌 [Footics BG] Sending TOGGLE_MINI_MODE to active tab:',
          activeTab.id,
        );
        try {
          await sendMessage(
            'TOGGLE_MINI_MODE',
            {},
            `content-script@${activeTab.id}`,
          );
        } catch (err) {
          console.warn('[Footics BG] Failed to send TOGGLE_MINI_MODE:', err);
        }
      }
      return;
    }

    // ── 3. メモオーバーレイコマンドの処理 ──
    if (command !== 'toggle-match-memo' && command !== 'toggle-event-memo')
      return;

    const mode: 'MATCH' | 'EVENT' =
      command === 'toggle-match-memo' ? 'MATCH' : 'EVENT';

    const footicsTab = await findFooticsTab();

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
      let cachedMemo = '';
      if (mode === 'MATCH' && matchId) {
        try {
          const cacheKey = `${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}${matchId}`;
          const stored = await browser.storage.local.get(cacheKey);
          if (typeof stored[cacheKey] === 'string') {
            cachedMemo = stored[cacheKey];
          }
        } catch (e) {
          console.warn('[Footics BG] Failed to read match memo cache:', e);
        }
      }

      sendMessage(
        'OPEN_OVERLAY',
        {
          mode,
          matchId: matchId || undefined,
          initialData: mode === 'MATCH' ? { memo: cachedMemo } : undefined,
        },
        `content-script@${activeTab.id}`,
      );
    }
  });

  onMessage('REQUEST_TAB_CAPTURE', async () => {
    try {
      // 超高画質 JPEG (quality: 98) でエンコード速度を高速化し、データサイズを約80%削減
      const dataUrl = await browser.tabs.captureVisibleTab({
        format: 'jpeg',
        quality: 98,
      });
      if (!dataUrl) {
        return { success: false, error: 'captureVisibleTab returned empty' };
      }
      return { success: true, dataUrl };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Footics BG] Capture visible tab error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  });

  onMessage('SEND_CAPTURE_TO_TACTICAL', async ({ data }) => {
    try {
      console.log(
        '🎯 [Footics BG] Routing capture to Tactical canvas:',
        data.payload?.id,
      );

      // 二重安全: Background 側でも確実に storage.local に保存
      if (data.payload) {
        await browser.storage.local.set({
          [STORAGE_KEYS.TACTICAL_PENDING_CAPTURE]: data.payload,
        });
      }

      const allTabs = await browser.tabs.query({});

      // 1. 既存の /tactical タブを優先探索
      const tacticalTab = allTabs.find(
        (t) =>
          t.url?.includes('/tactical') &&
          FOOTICS_APP_URLS.some((url) => t.url?.includes(url)),
      );

      if (tacticalTab?.id) {
        console.log(
          '[Footics BG] Found existing /tactical tab:',
          tacticalTab.id,
        );
        // タブ切り替えとウィンドウフォーカスを並行実行
        await Promise.all([
          browser.tabs.update(tacticalTab.id, { active: true }),
          tacticalTab.windowId
            ? browser.windows.update(tacticalTab.windowId, { focused: true })
            : Promise.resolve(),
        ]);

        try {
          await sendMessage(
            'TACTICAL_CAPTURE_RECEIVED',
            data.payload,
            `content-script@${tacticalTab.id}`,
          );
        } catch (msgErr) {
          console.warn(
            '[Footics BG] Failed to send direct message to tactical tab:',
            msgErr,
          );
        }
        return { success: true, tabId: tacticalTab.id, created: false };
      }

      // 2. /tactical 以外の Footics タブがあればそのオリジンで /tactical を開く
      const footicsTab = allTabs.find((t) =>
        FOOTICS_APP_URLS.some((url) => t.url?.includes(url)),
      );

      let targetUrl = 'http://localhost:3000/tactical';
      if (footicsTab?.url) {
        try {
          const origin = new URL(footicsTab.url).origin;
          targetUrl = `${origin}/tactical`;
        } catch {}
      }

      console.log('[Footics BG] Creating new /tactical tab:', targetUrl);
      const newTab = await browser.tabs.create({
        url: targetUrl,
        active: true,
      });
      if (newTab.windowId) {
        await browser.windows.update(newTab.windowId, { focused: true });
      }

      return { success: true, tabId: newTab.id, created: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        '❌ [Footics BG] Failed to send capture to tactical:',
        errorMsg,
      );
      return { success: false, error: errorMsg, created: false };
    }
  });

  onMessage('CLOSE_SIDEPANEL', () => {
    // 必要に応じて処理を追加
  });

  // ── 3. Footics App タブ検出時のオフラインキュー同期トリガー ──
  const notifyTabForOfflineReplay = (tabId: number, url?: string) => {
    if (!url || !FOOTICS_APP_URLS.some((appUrl) => url.includes(appUrl)))
      return;
    sendMessage('REPLAY_OFFLINE_QUEUE', {}, `content-script@${tabId}`).catch(
      () => {},
    );
  };

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      notifyTabForOfflineReplay(tabId, tab.url);
    }
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (tab.url) {
        notifyTabForOfflineReplay(activeInfo.tabId, tab.url);
      }
    } catch {}
  });
});
