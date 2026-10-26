import type { BackgroundCommandContext, CommandHandler } from './types';

export class MiniModeCommand implements CommandHandler {
  readonly commandName = 'toggle-mini-mode';

  async execute(
    tab: Browser.tabs.Tab | undefined,
    ctx: BackgroundCommandContext,
  ): Promise<void> {
    const targetTab = ctx.activeTab ?? tab;
    if (!targetTab?.id) {
      console.warn('❌ [Footics BG] No active tab found for mini-mode toggle');
      return;
    }

    try {
      await ctx.sendBridgeMessage(
        'TOGGLE_MINI_MODE',
        {},
        `content-script@${targetTab.id}`,
      );
    } catch (err) {
      console.warn('[Footics BG] Failed to send TOGGLE_MINI_MODE:', err);
    }
  }
}
