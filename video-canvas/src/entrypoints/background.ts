import { browser } from 'wxt/browser';
import {
  type CaptureResultMessage,
  type ExtensionMessage,
  MessageTypes,
} from '../lib/message-types';

export default defineBackground(() => {
  console.log('Video Canvas Background Script loaded');

  browser.commands.onCommand.addListener(async (command, tab) => {
    if (command === 'capture-video-canvas') {
      const activeTab =
        tab ||
        (await browser.tabs.query({ active: true, currentWindow: true }))[0];
      if (activeTab?.id) {
        try {
          await browser.tabs.sendMessage(activeTab.id, {
            type: MessageTypes.CAPTURE_TRIGGER,
          });
        } catch (err) {
          console.error(
            '❌ [Video Canvas] Failed to send capture trigger. Is the content script loaded?',
            err,
          );
          // 接続エラーの場合はユーザーにリロードを促す
          browser.action.setBadgeText({ text: 'ERR', tabId: activeTab.id });
          browser.action.setBadgeBackgroundColor({
            color: '#ff0000',
            tabId: activeTab.id,
          });
        }
      }
    }
  });

  browser.runtime.onMessage.addListener(
    (message: any, sender, sendResponse) => {
      switch (message.type) {
        case MessageTypes.CAPTURE_RESULT:
          handleCaptureResult(message as CaptureResultMessage, sendResponse);
          return true;
        case MessageTypes.REQUEST_TAB_CAPTURE:
          handleTabCaptureRequest(sendResponse);
          return true;
        default:
          return false;
      }
    },
  );

  /**
   * キャプチャ結果をストレージに保存し、エディタを開く
   */
  async function handleCaptureResult(
    message: CaptureResultMessage,
    sendResponse: (r: any) => void,
  ) {
    try {
      const captureId = crypto.randomUUID();
      const storageKey = `capture:${captureId}`;
      const captureData = {
        lastCapturedFrame: message.dataUrl,
        cropRect: message.rect,
        isDirectCapture: message.isDirectCapture || false,
        timestamp: Date.now(),
      };

      // session (高速・メモリ) と local (確実・永続) の両方に保存
      // session が使えない環境（一部のブラウザや設定）への対策
      await Promise.all([
        browser.storage.session
          .set({ [storageKey]: captureData })
          .catch(() => {}),
        browser.storage.local.set({ [storageKey]: captureData }),
      ]);

      const editorUrl = browser.runtime.getURL(`/editor.html?id=${captureId}`);
      await browser.tabs.create({ url: editorUrl });

      // 保存件数が増えすぎないようにクリーンアップを実行
      cleanOldCaptures();

      sendResponse({ success: true });
    } catch (err: any) {
      console.error('[Video Canvas] Storage Error:', err);
      sendResponse({ success: false, error: err.message });
    }
  }

  /**
   * 古いキャプチャデータをクリーンアップする (直近20件のみ保持)
   */
  async function cleanOldCaptures() {
    try {
      const allData = (await browser.storage.local.get(null)) as Record<
        string,
        any
      >;
      const captureKeys = Object.keys(allData)
        .filter((key) => key.startsWith('capture:'))
        .map((key) => ({ key, timestamp: allData[key]?.timestamp || 0 }))
        .sort((a, b) => b.timestamp - a.timestamp); // 降順

      if (captureKeys.length > 20) {
        const keysToRemove = captureKeys.slice(20).map((item) => item.key);
        await browser.storage.local.remove(keysToRemove);
        console.log(
          `[Video Canvas] Cleaned up ${keysToRemove.length} old captures.`,
        );
      }
    } catch (err) {
      console.warn('[Video Canvas] Cleanup failed:', err);
    }
  }

  /**
   * ブラウザ表示領域のキャプチャを実行する
   */
  async function handleTabCaptureRequest(sendResponse: (r: any) => void) {
    try {
      const dataUrl = await browser.tabs.captureVisibleTab({
        format: 'png',
        quality: 100,
      });

      if (!dataUrl) {
        throw new Error('Capture returned null/empty dataurl.');
      }
      sendResponse({ success: true, dataUrl });
    } catch (err: any) {
      console.error('[Video Canvas] Capture Error:', err);
      sendResponse({
        success: false,
        error: err.message || 'captureVisibleTab failed',
      });
    }
  }
});
