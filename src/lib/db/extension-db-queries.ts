/**
 * extension-db-queries.ts
 *
 * Extension (Content Script / Sidepanel) 向けの軽量 IndexedDB アクセス層。
 * src/lib/db/index.ts 経由での不要モジュール（JSZipやTactical persistence等）の
 * 意図しないバンドル・Terser初期化エラーを防ぐため、最小限の依存関係で提供する。
 */

import type { CustomEvent, MatchMemo } from '../schema';
import { SHORTCUT_ACTIONS } from '../shortcuts';
import { db } from './schema';

/**
 * データの変更をアプリ全体に通知する。
 * Web本体の useDataSync フックがこのイベントを購読してキャッシュを無効化する。
 */
export function dispatchRefreshEvent(matchId?: string | number): void {
  if (typeof window === 'undefined') return;

  console.log('[db] Dispatching REFRESH_DATA event, matchId:', matchId);
  const detail = {
    action: SHORTCUT_ACTIONS.REFRESH_DATA,
    matchId: matchId ? String(matchId) : undefined,
  };

  // CustomEvent (for same-world listeners)
  window.dispatchEvent(new CustomEvent('footics-action', { detail }));

  // postMessage (for cross-world listeners like Content Script to Main World)
  window.postMessage({ type: 'footics-action', detail }, '*');
}

/**
 * 試合IDに紐づく試合メモを取得する
 */
export async function getMatchMemo(matchId: string): Promise<MatchMemo | null> {
  const data = await db.match_memos.get(matchId);
  return data ?? null;
}

/**
 * 試合メモを保存し、変更通知を発行する
 */
export async function putMatchMemo(memo: MatchMemo): Promise<void> {
  await db.match_memos.put(memo);
  dispatchRefreshEvent(memo.matchId);
}

/**
 * カスタムイベントを保存し、変更通知を発行する
 */
export async function saveCustomEvent(event: CustomEvent): Promise<void> {
  await db.custom_events.put(event);
  dispatchRefreshEvent(event.match_id);
}
