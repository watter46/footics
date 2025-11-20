import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { MatchEvent, EventInput } from '../types';

/**
 * Event Repository Hook
 *
 * 責務:
 * - Dexie.js (db.events) へのアクセスをカプセル化
 * - 試合イベントの記録、取得、削除
 */
export function useEventRepository() {

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * 指定された試合の全てのイベントを取得する
   * 時系列順（matchTime）でソート
   */
  const useMatchEvents = (matchId: number) => {
    return useLiveQuery(async () => {
      const events = await db.events
        .where('matchId')
        .equals(matchId)
        .toArray();

      // 時系列順にソート (文字列比較だが、フォーマットが統一されていれば機能する)
      // 必要であれば数値変換して比較
      return events.sort((a, b) => a.matchTime.localeCompare(b.matchTime));
    }, [matchId]);
  };

  // ==========================================================================
  // Write Operations
  // ==========================================================================

  /**
   * イベントを追加する
   */
  const addEvent = async (event: EventInput): Promise<number> => {
    return await db.events.add(event);
  };

  /**
   * イベントを更新する
   */
  const updateEvent = async (id: number, updates: Partial<MatchEvent>): Promise<number> => {
    return await db.events.update(id, updates);
  };

  /**
   * イベントを削除する
   */
  const deleteEvent = async (id: number): Promise<void> => {
    await db.events.delete(id);
  };

  /**
   * 指定された試合のイベントを全て削除する（試合削除時など）
   */
  const deleteEventsByMatchId = async (matchId: number): Promise<void> => {
    await db.events.where('matchId').equals(matchId).delete();
  };

  /**
   * 交代イベントを取得する
   */
  const useSubstitutionEvents = (matchId: number | undefined, teamId: number | undefined) => {
    return useLiveQuery(async () => {
      if (typeof matchId !== 'number' || typeof teamId !== 'number') {
        return [];
      }

      const outAction = await db.actions_master
        .where('name')
        .equals('交代OUT')
        .first();

      if (!outAction?.id) {
        return [];
      }

      return db.events
        .where('matchId')
        .equals(matchId)
        .filter(
          event =>
            event.actionId === outAction.id && event.teamId === teamId
        )
        .toArray();
    }, [matchId, teamId]);
  };

  return {
    useMatchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    deleteEventsByMatchId,
    useSubstitutionEvents,
  };
}
