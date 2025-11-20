import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { IMatch } from '@/lib/types';

export interface PaginatedMatchesResult {
  items: IMatch[];
  totalCount: number;
  totalPages: number;
  adjustedPage: number;
}

export const useMatchRepository = () => {
  /**
   * ページネーション付きでマッチリストを取得する
   * @param page 要求ページ番号 (1-based)
   * @param pageSize 1ページあたりの件数
   */
  const usePaginatedMatches = (page: number, pageSize: number) => {
    return useLiveQuery<PaginatedMatchesResult | undefined>(
      async () => {
        const safePageSize = Math.max(1, pageSize); // 防御的プログラミング

        const baseCollection = db.matches
          .orderBy('date')
          .reverse()
          .filter((match) => !match.deletedAt);

        const totalCount = await baseCollection.count();
        const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));

        const adjustedPage = Math.min(Math.max(1, page), totalPages);

        const items = await baseCollection
          .offset((adjustedPage - 1) * safePageSize)
          .limit(safePageSize)
          .toArray();

        return {
          items,
          totalCount,
          totalPages,
          adjustedPage,
        };
      },
      [page, pageSize]
    );
  };

  /**
   * IDによる論理削除
   */
  const deleteMatch = useCallback(async (matchId: number) => {
    await db.matches.update(matchId, {
      deletedAt: new Date().toISOString(),
    });
  }, []);

  /**
   * 新規試合を作成する
   */
  const createMatch = useCallback(async (match: Omit<IMatch, 'id'>) => {
    return await db.matches.add(match as IMatch);
  }, []);

  /**
   * チームIDとチーム名のマップを取得する
   */
  const useTeamsMap = () => {
    return useLiveQuery(async () => {
      const teams = await db.teams.toArray();
      const map = new Map<number, string>();
      teams.forEach((team) => {
        if (team.id !== undefined) {
          map.set(team.id, team.name);
        }
      });
      return map;
    }, []);
  };

  return {
    usePaginatedMatches,
    deleteMatch,
    createMatch,
    useTeamsMap,
  };
};
