import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Match, MatchInput } from '../types';

/**
 * Match Repository Hook
 *
 * 責務:
 * - Dexie.js (db.matches) への直接アクセスをカプセル化する
 * - データの取得 (Read) と 更新 (Write) を提供する
 * - UIロジックは持たない
 */
export function useMatchRepository() {

  // ==========================================================================
  // Read Operations (Live Queries)
  // ==========================================================================

  /**
   * 全ての試合を取得し、日付の降順でソートして返す
   */
  const useAllMatches = () => {
    return useLiveQuery(async () => {
      const matches = await db.matches
        .filter(m => !m.deletedAt)
        .toArray();

      // 日付降順 (新しい順)
      return matches.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    });
  };

  /**
   * 指定されたIDの試合を取得する
   */
  const useMatchById = (id: number) => {
    return useLiveQuery(() => db.matches.get(id), [id]);
  };

  // ==========================================================================
  // Write Operations
  // ==========================================================================

  /**
   * 新しい試合を作成する
   */
  const createMatch = async (match: MatchInput): Promise<number> => {
    // Dexieの型定義(IMatch)は assignedPlayers: Record<number, number> を要求するが
    // 実行時のJSオブジェクトのキーは文字列であるため、型アサーションで対応する
    return await db.matches.add(match as unknown as Match);
  };

  /**
   * 試合情報を更新する
   */
  const updateMatch = async (id: number, updates: Partial<Match>): Promise<number> => {
    return await db.matches.update(id, updates);
  };

  /**
   * 試合を論理削除する
   */
  const deleteMatch = async (id: number): Promise<number> => {
    return await db.matches.update(id, { deletedAt: new Date().toISOString() });
  };

  /**
   * ページネーション付きで試合を取得する
   */
  const usePaginatedMatches = (page: number, pageSize: number) => {
    return useLiveQuery(async () => {
      const offset = (page - 1) * pageSize;

      // 論理削除されていないレコードを対象とする
      // Dexieでは orderBy().reverse() の後に filter() をチェーンできる
      const collection = db.matches
        .orderBy('date')
        .reverse()
        .filter(m => !m.deletedAt);

      const totalCount = await collection.count();
      const matches = await collection
        .offset(offset)
        .limit(pageSize)
        .toArray();

      return {
        matches,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      };
    }, [page, pageSize]);
  };

  /**
   * 指定されたIDの試合を取得する (Async)
   */
  const getMatch = async (id: number) => {
    return await db.matches.get(id);
  };

  return {
    useAllMatches,
    useMatchById,
    usePaginatedMatches,
    getMatch,
    createMatch,
    updateMatch,
    deleteMatch,
  };
}
