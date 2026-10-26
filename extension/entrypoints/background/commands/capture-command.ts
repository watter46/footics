import type { BackgroundCommandContext, CommandHandler } from './types';

export class CaptureCommand implements CommandHandler {
  readonly commandName = 'capture-to-tactical';

  async execute(
    tab: Browser.tabs.Tab | undefined,
    ctx: BackgroundCommandContext,
  ): Promise<void> {
    const targetTab = ctx.activeTab ?? tab;
    if (!targetTab?.id) {
      console.warn('❌ [Footics BG] No active tab found for capture');
      return;
    }

    let captureHandledByContentScript = false;
    try {
      await ctx.sendBridgeMessage(
        'TRIGGER_CAPTURE',
        {},
        `content-script@${targetTab.id}`,
      );
      captureHandledByContentScript = true;
    } catch (err) {
      console.warn(
        '⚠️ [Footics BG] webext-bridge failed, trying native chrome.tabs.sendMessage fallback:',
        err,
      );
      try {
        if (ctx.nativeSendMessage) {
          await ctx.nativeSendMessage(targetTab.id, {
            type: 'TRIGGER_CAPTURE',
          });
        } else {
          await browser.tabs.sendMessage(targetTab.id, {
            type: 'TRIGGER_CAPTURE',
          });
        }
        captureHandledByContentScript = true;
      } catch (nativeErr) {
        console.warn(
          '⚠️ [Footics BG] Content script messaging unavailable, falling back to autonomous Background Tab Capture:',
          nativeErr,
        );
      }
    }

    // 自律フォールバック: Content Script 未応答時でも確実にキャプチャ実行
    if (!captureHandledByContentScript) {
      try {
        const dataUrl = await ctx.captureTab({
          format: 'jpeg',
          quality: 98,
        });
        if (dataUrl) {
          await ctx.processCanvas(dataUrl, targetTab);
        }
      } catch (bgCaptureErr) {
        console.error(
          '❌ [Footics BG] Direct background tab capture failed:',
          bgCaptureErr,
        );
      }
    }
  }
}
