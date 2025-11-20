import { useCallback, useMemo, useState } from 'react';
import { useMatchRepository } from '@/features/match/hooks/useMatchRepository'; // RepositoryをImport

const DEFAULT_PAGE_SIZE = 20;

export const useMatchList = (initialPageSize = DEFAULT_PAGE_SIZE) => {
  // --- Repositoryの呼び出し ---
  const { usePaginatedMatches, deleteMatch: deleteMatchRepo, useTeamsMap } = useMatchRepository();

  // --- State (UIの状態) ---
  const normalizedInitialPageSize = Number.isFinite(initialPageSize) && initialPageSize > 0
    ? Math.floor(initialPageSize)
    : DEFAULT_PAGE_SIZE;

  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(normalizedInitialPageSize);

  // --- Data Fetching (Repositoryに委譲) ---
  const queryResult = usePaginatedMatches(requestedPage, pageSize);
  const teamsMap = useTeamsMap();

  // --- Derived State (データの整形) ---
  const isLoading = queryResult === undefined || teamsMap === undefined;
  const totalPages = queryResult?.totalPages ?? 0;
  // Repository側で補正されたページ番号を採用する (データ不整合を防ぐ)
  const currentPage = queryResult?.adjustedPage ?? requestedPage;

  const matches = useMemo(() => {
    const rawMatches = queryResult?.items ?? [];
    return rawMatches.map((match) => ({
      ...match,
      homeTeamName: teamsMap?.get(match.team1Id) ?? `Team #${match.team1Id}`,
      awayTeamName: teamsMap?.get(match.team2Id) ?? `Team #${match.team2Id}`,
    }));
  }, [queryResult?.items, teamsMap]);

  // --- Action Handlers (ユーザー操作) ---

  const nextPage = useCallback(() => {
    // 現在が最終ページでなければ進む
    setRequestedPage((current) => (current < totalPages ? current + 1 : current));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setRequestedPage((current) => Math.max(1, current - 1));
  }, []);

  const setPageSize = useCallback((nextSize: number) => {
    if (!Number.isFinite(nextSize) || nextSize <= 0) return;
    setRequestedPage(1); // サイズ変更時は1ページ目に戻すのが一般的
    setPageSizeState(Math.floor(nextSize));
  }, []);

  const deleteMatch = useCallback(async (matchId: number) => {
    try {
      await deleteMatchRepo(matchId);
      // 必要ならここでToast表示などのUI処理を行う
    } catch (error) {
      console.error('Failed to delete match', error);
      // 必要ならError Stateを更新する
    }
  }, [deleteMatchRepo]);

  // --- ViewModelの構築 ---
  const pagination = useMemo(() => ({
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage,
    prevPage,
  }), [currentPage, totalPages, nextPage, prevPage]);

  return {
    matches,
    isLoading,
    pageSize,
    setPageSize,
    pagination,
    deleteMatch,
  };
};
