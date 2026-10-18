import { onMessage, sendMessage } from 'webext-bridge/background';
import { z } from 'zod';
import { FOOTICS_APP_URLS, STORAGE_KEYS } from '../constants';
import { processAndOpenCanvas } from '../features/capture/capture-pipeline';
import {
  deleteScreenshot,
  getScreenshotById,
  getScreenshotsByVideo,
} from '../features/capture/db/screenshot-db';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Main background entrypoint
export default defineBackground(() => {
  console.log('Footics Background Script loaded');

  // Action クリック時にサイドパネルではなく拡張機能アイコンのアクション（Dashboardオープン）を優先
  browser.sidePanel
    ?.setPanelBehavior?.({ openPanelOnActionClick: false })
    .catch(() => {});

  // Dashboard 画面を既存タブまたは新規タブでスマートに開く/フォーカスする
  const openOrFocusDashboard = async () => {
    const dashboardUrl = browser.runtime.getURL('/dashboard.html');
    const tabs = await browser.tabs.query({});
    const existingTab = tabs.find(
      (t) =>
        t.url &&
        (t.url === dashboardUrl ||
          t.url.startsWith(dashboardUrl) ||
          t.url.includes('/dashboard.html')),
    );
    if (existingTab?.id) {
      if (existingTab.windowId !== undefined) {
        await browser.windows
          .update(existingTab.windowId, { focused: true })
          .catch(() => {});
      }
      await browser.tabs.update(existingTab.id, { active: true });
      return existingTab;
    }
    return await browser.tabs.create({ url: dashboardUrl });
  };

  browser.action.onClicked.addListener(() => {
    void openOrFocusDashboard();
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === 'OPEN_DASHBOARD') {
      void openOrFocusDashboard();
    }
  });

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
        let captureHandledByContentScript = false;
        try {
          await sendMessage(
            'TRIGGER_CAPTURE',
            {},
            `content-script@${activeTab.id}`,
          );
          captureHandledByContentScript = true;
        } catch (err) {
          console.warn(
            '⚠️ [Footics BG] webext-bridge failed, trying native chrome.tabs.sendMessage fallback:',
            err,
          );
          try {
            await browser.tabs.sendMessage(activeTab.id, {
              type: 'TRIGGER_CAPTURE',
            });
            captureHandledByContentScript = true;
          } catch (nativeErr) {
            console.warn(
              '⚠️ [Footics BG] Content script messaging unavailable, falling back to autonomous Background Tab Capture:',
              nativeErr,
            );
          }
        }

        // ── 自律フォールバック: Content Script 未応答時でも確実にキャプチャ実行 ──
        if (!captureHandledByContentScript) {
          try {
            console.log(
              '⚡ [Footics BG] Executing direct captureVisibleTab fallback...',
            );
            const dataUrl = await browser.tabs.captureVisibleTab({
              format: 'jpeg',
              quality: 98,
            });
            if (dataUrl) {
              const res = await processAndOpenCanvas({
                imageDataUrl: dataUrl,
                videoUrl: activeTab.url,
                videoTitle: activeTab.title,
              });
              console.log(
                '✅ [Footics BG] Autonomous direct capture & Quick Canvas opened!',
                res.id,
              );
            }
          } catch (bgCaptureErr) {
            console.error(
              '❌ [Footics BG] Direct background tab capture failed:',
              bgCaptureErr,
            );
          }
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

  onMessage('CLOSE_SIDEPANEL', () => {
    // 必要に応じて処理を追加
  });

  onMessage('OPEN_DASHBOARD', async () => {
    try {
      await openOrFocusDashboard();
      return { success: true };
    } catch (err) {
      console.error('[Footics BG] OPEN_DASHBOARD error:', err);
      return { success: false };
    }
  });

  // ── 4. Quick Canvas & スクリーンショット連携 API ハンドラ ──
  onMessage('SAVE_AND_OPEN_CANVAS', async ({ data }) => {
    try {
      const result = await processAndOpenCanvas({
        imageDataUrl: data.imageDataUrl,
        videoUrl: data.videoUrl,
        videoTitle: data.videoTitle,
        videoTime: data.videoTime,
      });
      return { success: true, id: result.id, tabId: result.tabId };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Footics BG] SAVE_AND_OPEN_CANVAS error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  });

  onMessage('GET_SCREENSHOTS_BY_VIDEO', async ({ data }) => {
    try {
      const screenshots = await getScreenshotsByVideo(data.videoUrl);
      return { success: true, screenshots };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Footics BG] GET_SCREENSHOTS_BY_VIDEO error:', errorMsg);
      return { success: false, screenshots: [], error: errorMsg };
    }
  });

  onMessage('GET_SCREENSHOT_DATA', async ({ data }) => {
    try {
      const screenshot = await getScreenshotById(data.id);
      return { success: true, screenshot };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Footics BG] GET_SCREENSHOT_DATA error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  });

  onMessage('DELETE_SCREENSHOT', async ({ data }) => {
    try {
      await deleteScreenshot(data.id);
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Footics BG] DELETE_SCREENSHOT error:', errorMsg);
      return { success: false, error: errorMsg };
    }
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
