import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

/**
 * Action Repository Hook
 *
 * 責務:
 * - Dexie.js (db.actions_master) へのアクセスをカプセル化
 * - アクションマスタデータの取得
 */
export function useActionRepository() {

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * 全てのアクションを取得する
   */
  const useAllActions = () => {
    return useLiveQuery(() => db.actions_master.toArray());
  };

  /**
   * カテゴリごとにグループ化されたアクションを取得する
   * (UI側で加工する前の生データを返すのが基本だが、
   *  頻繁に使うクエリならここでフィルタリングしても良い。
   *  今回はRepository層なので、単純な取得にとどめる)
   */
  const getActionsByCategory = async (category: string) => {
    return await db.actions_master
      .where('category')
      .equals(category)
      .toArray();
  };

  /**
   * 指定されたIDのアクションを取得する
   */
  const getAction = async (id: number) => {
    return await db.actions_master.get(id);
  };

  return {
    useAllActions,
    getActionsByCategory,
    getAction,
  };
}
