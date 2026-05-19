import { getMatchMemo } from '@/lib/db';
import { STORAGE_KEYS } from '../../constants';

/**
 * 試合メモを IndexedDB から取得して browser.storage.local キャッシュへ同期する。
 *
 * @param matchId 同期対象の試合ID
 */
export async function syncMatchMemoCacheToStorage(
  matchId: string,
): Promise<void> {
  try {
    const matchMemo = await getMatchMemo(matchId);
    const cacheKey = `${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}${matchId}`;

    if (matchMemo) {
      await browser.storage.local.set({
        [cacheKey]: matchMemo.memo,
      });
      console.log(
        `[cache-sync] Synced match memo for match ${matchId} to cache.`,
      );
    } else {
      // 試合メモが存在しない場合、キャッシュもクリアする
      await browser.storage.local.remove(cacheKey);
      console.log(
        `[cache-sync] Cleared match memo cache for match ${matchId} (no memo found).`,
      );
    }
  } catch (error) {
    console.error(
      `[cache-sync] Failed to sync match memo cache for match ${matchId}:`,
      error,
    );
  }
}

/**
 * アクティブでない試合の古い試合メモキャッシュをクリーンアップする。
 *
 * @param activeMatchId 現在アクティブな試合ID（このキャッシュは保持する）
 */
export async function gcExpiredMatchMemoCaches(
  activeMatchId: string,
): Promise<void> {
  try {
    const allStorage = await browser.storage.local.get(null);
    const keysToRemove: string[] = [];
    const activeCacheKey = `${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}${activeMatchId}`;

    for (const key of Object.keys(allStorage)) {
      if (
        key.startsWith(STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX) &&
        key !== activeCacheKey
      ) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await browser.storage.local.remove(keysToRemove);
      console.log(
        `[cache-sync] GC removed ${keysToRemove.length} expired match memo cache(s):`,
        keysToRemove,
      );
    }
  } catch (error) {
    console.error(
      '[cache-sync] Failed to run GC on expired match memo caches:',
      error,
    );
  }
}
