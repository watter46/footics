import { onMessage, sendMessage } from 'webext-bridge/background';
import { FOOTICS_APP_URLS } from '../constants';
import { processAndOpenCanvas } from '../features/capture/capture-pipeline';
import {
  deleteScreenshot,
  getScreenshotById,
  getScreenshotsByVideo,
} from '../features/capture/db/screenshot-db';
import { CaptureCommand } from './background/commands/capture-command';
import {
  EventMemoCommand,
  MatchMemoCommand,
} from './background/commands/memo-command';
import { MiniModeCommand } from './background/commands/mini-mode-command';
import { CommandRegistry } from './background/commands/registry';
import type { BackgroundCommandContext } from './background/commands/types';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Main background entrypoint
export default defineBackground(() => {
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
    const tab = allTabs.find((t) =>
      FOOTICS_APP_URLS.some((url) => t.url?.includes(url)),
    );
    if (!tab) {
      console.warn(
        '[Footics BG] Footics tab not found. Checked URLs:',
        FOOTICS_APP_URLS,
      );
    }
    return tab;
  };

  const commandRegistry = new CommandRegistry();
  commandRegistry
    .register(new CaptureCommand())
    .register(new MiniModeCommand())
    .register(new MatchMemoCommand())
    .register(new EventMemoCommand());

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

    const ctx: BackgroundCommandContext = {
      activeTab,
      findFooticsTab,
      sendBridgeMessage: <T = unknown>(
        msg: string,
        data: unknown,
        dest: string,
      ): Promise<T> =>
        sendMessage(msg as any, data as any, dest as any) as Promise<T>,
      storage: browser.storage.local,
      captureTab: (options) => browser.tabs.captureVisibleTab(options),
      processCanvas: async (dataUrl, targetTab) => {
        await processAndOpenCanvas({
          imageDataUrl: dataUrl,
          videoUrl: targetTab?.url,
          videoTitle: targetTab?.title,
        });
      },
    };

    await commandRegistry.execute(command, activeTab, ctx);
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
    } catch (err) {
      console.warn('[Footics BG] Failed to get active tab info:', err);
    }
  });
});
