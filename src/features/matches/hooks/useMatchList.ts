'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/lib/db';
import type { IMatch } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 20;

interface MatchListQueryResult {
  matches: IMatch[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export const useMatchList = (initialPageSize = DEFAULT_PAGE_SIZE) => {
  const normalizedInitialPageSize =
    Number.isFinite(initialPageSize) && initialPageSize > 0
      ? Math.floor(initialPageSize)
      : DEFAULT_PAGE_SIZE;
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(normalizedInitialPageSize);

  const liveQueryResult = useLiveQuery<MatchListQueryResult | undefined>(
    async () => {
      const safePageSize = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
      const baseCollection = db.matches
        .orderBy('date')
        .reverse()
        .filter(match => !match.deletedAt);

      const totalCount = await baseCollection.count();
      const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
      const currentPage = Math.min(requestedPage, totalPages);

      const paginatedMatches = await baseCollection
        .offset((currentPage - 1) * safePageSize)
        .limit(safePageSize)
        .toArray();

      return {
        matches: paginatedMatches,
        totalCount,
        currentPage,
        totalPages,
      };
    },
    [requestedPage, pageSize]
  );

  const matches = liveQueryResult?.matches ?? [];
  const totalCount = liveQueryResult?.totalCount ?? 0;
  const safePageSize = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const totalPages =
    liveQueryResult?.totalPages ?? Math.max(1, Math.ceil(totalCount / safePageSize));
  const page = liveQueryResult?.currentPage ?? Math.min(requestedPage, totalPages);
  const isLoading = liveQueryResult === undefined;

  const deleteMatch = useCallback(async (matchId: number) => {
    try {
      await db.matches.update(matchId, {
        deletedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to soft delete match', error);
      throw error;
    }
  }, []);

  const nextPage = useCallback(() => {
    setRequestedPage(current => Math.min(current + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setRequestedPage(current => Math.max(1, current - 1));
  }, []);

  const updatePageSize = useCallback((nextSize: number) => {
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }
    setRequestedPage(1);
    setPageSizeState(Math.floor(nextSize));
  }, []);

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage,
      prevPage,
    }),
    [page, totalPages, nextPage, prevPage]
  );

  return {
    matches,
    isLoading,
    pageSize,
    setPageSize: updatePageSize,
    pagination,
    deleteMatch,
  };
};
