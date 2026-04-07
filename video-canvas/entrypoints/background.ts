import { browser } from 'wxt/browser';

export default defineBackground(() => {
  console.log('Video Canvas Background Script loaded');

  browser.commands.onCommand.addListener(async (command, tab) => {
    if (command === 'capture-video-canvas') {
      const activeTab = tab || (await browser.tabs.query({ active: true, currentWindow: true }))[0];
      if (activeTab?.id) {
        try {
          await browser.tabs.sendMessage(activeTab.id, { type: 'VIDEO_CANVAS_CAPTURE_TRIGGER' });
        } catch (err) {
          console.error('❌ [Video Canvas] Failed to send capture trigger. Is the content script loaded?', err);
          // 接続エラーの場合はユーザーにリロードを促す
          browser.action.setBadgeText({ text: 'ERR', tabId: activeTab.id });
          browser.action.setBadgeBackgroundColor({ color: '#ff0000', tabId: activeTab.id });
        }
      }
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'VIDEO_CANVAS_CAPTURE_RESULT':
        handleCaptureResult(message, sendResponse);
        return true;
      case 'VIDEO_CANVAS_REQUEST_TAB_CAPTURE':
        handleTabCaptureRequest(sendResponse);
        return true;
      default:
        return false;
    }
  });

  /**
   * キャプチャ結果をストレージに保存し、エディタを開く
   */
  async function handleCaptureResult(message: any, sendResponse: (r: any) => void) {
    try {
      const editorUrl = browser.runtime.getURL('/editor.html');
      await browser.tabs.create({ url: editorUrl });
      await browser.storage.session.set({ 
        lastCapturedFrame: message.dataUrl,
        cropRect: message.rect,
        isDirectCapture: message.isDirectCapture || false
      });
      sendResponse({ success: true });
    } catch (err: any) {
      console.error('[Video Canvas] Storage Error:', err);
      sendResponse({ success: false, error: err.message });
    }
  }

  /**
   * ブラウザ表示領域のキャプチャを実行する
   */
  async function handleTabCaptureRequest(sendResponse: (r: any) => void) {
    try {
      const dataUrl = await browser.tabs.captureVisibleTab({ 
        format: 'png',
        quality: 100 
      });
      
      if (!dataUrl) {
        throw new Error('Capture returned null/empty dataurl.');
      }
      sendResponse({ success: true, dataUrl });
    } catch (err: any) {
      console.error('[Video Canvas] Capture Error:', err);
      sendResponse({ success: false, error: err.message || 'captureVisibleTab failed' });
    }
  }
});
