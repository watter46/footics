import { z } from 'zod';
import { STORAGE_KEYS } from '~/constants';
import type { BackgroundCommandContext, CommandHandler } from './types';

export type MemoCommandName = 'toggle-match-memo' | 'toggle-event-memo';

export class MemoCommand implements CommandHandler {
  readonly mode: 'MATCH' | 'EVENT';

  constructor(readonly commandName: MemoCommandName) {
    this.mode = commandName === 'toggle-match-memo' ? 'MATCH' : 'EVENT';
  }

  async execute(
    tab: Browser.tabs.Tab | undefined,
    ctx: BackgroundCommandContext,
  ): Promise<void> {
    const targetTab = ctx.activeTab ?? tab;
    const footicsTab = await ctx.findFooticsTab();

    const stored = await ctx.storage.get(STORAGE_KEYS.LAST_ACTIVE_MATCH_ID);
    let matchId = z
      .string()
      .safeParse(stored[STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]).data;

    if (!matchId && footicsTab?.id) {
      try {
        const response = await ctx.sendBridgeMessage<{ matchId?: string }>(
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
      if (targetTab?.id) {
        await ctx.sendBridgeMessage(
          'OPEN_OVERLAY',
          {
            mode: this.mode,
            error: 'Footics本体のタブを開いて試合を特定してください',
          },
          `content-script@${targetTab.id}`,
        );
      }
      return;
    }

    if (targetTab?.id) {
      let cachedMemo = '';
      if (this.mode === 'MATCH' && matchId) {
        try {
          const cacheKey = `${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}${matchId}`;
          const storedCache = await ctx.storage.get(cacheKey);
          if (typeof storedCache[cacheKey] === 'string') {
            cachedMemo = storedCache[cacheKey];
          }
        } catch (e) {
          console.warn('[Footics BG] Failed to read match memo cache:', e);
        }
      }

      await ctx.sendBridgeMessage(
        'OPEN_OVERLAY',
        {
          mode: this.mode,
          matchId: matchId || undefined,
          initialData: this.mode === 'MATCH' ? { memo: cachedMemo } : undefined,
        },
        `content-script@${targetTab.id}`,
      );
    }
  }
}

export class MatchMemoCommand extends MemoCommand {
  constructor() {
    super('toggle-match-memo');
  }
}

export class EventMemoCommand extends MemoCommand {
  constructor() {
    super('toggle-event-memo');
  }
}
