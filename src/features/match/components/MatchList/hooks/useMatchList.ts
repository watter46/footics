import { useState, useCallback } from 'react';
import { useMatchRepository } from '@/features/match/hooks/useMatchRepository';
import { useTeamRepository } from '@/features/match/hooks/useTeamRepository';

const DEFAULT_PAGE_SIZE = 10;

export function useMatchList() {
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  // Repository Calls
  const { usePaginatedMatches, deleteMatch } = useMatchRepository();
  const { useAllTeams } = useTeamRepository();

  // Data Fetching
  const matchData = usePaginatedMatches(page, pageSize);
  const teams = useAllTeams();

  // Derived State
  const isLoading = !matchData || !teams;
  const matches = matchData?.matches ?? [];
  const totalPages = matchData?.totalPages ?? 0;
  const totalCount = matchData?.totalCount ?? 0;

  // チームIDからチーム名を引くためのマップを作成
  const teamMap = new Map(teams?.map(t => [t.id, t]));

  // UI用にデータを整形
  const formattedMatches = matches.map(match => ({
    ...match,
    homeTeam: teamMap.get(match.team1Id),
    awayTeam: teamMap.get(match.team2Id),
  }));

  // Handlers
  const nextPage = useCallback(() => {
    if (page < totalPages) setPage(p => p + 1);
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage(p => p - 1);
  }, [page]);

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('この試合を削除してもよろしいですか？')) {
      await deleteMatch(id);
    }
  }, [deleteMatch]);

  return {
    matches: formattedMatches,
    pagination: {
      page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage,
      prevPage,
    },
    isLoading,
    handleDelete,
  };
}
