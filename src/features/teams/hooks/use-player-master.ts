'use client';

import {
  QueryClientContext,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useContext } from 'react';
import {
  deletePlayerMaster,
  deletePlayerPhoto,
  getPlayerMaster,
  getPlayerMastersBySeason,
  getPlayersMasterBatch,
  mergePlayerId,
  savePlayerMaster,
  savePlayerPhoto,
} from '@/lib/db/queries';
import type { PlayerMaster } from '@/lib/db/schema';
import { playerKeys } from '@/lib/query-keys';

export interface PlayerMasterMutations {
  savePlayer: (
    master: Partial<PlayerMaster> & { playerId: number; name: string },
    photoBlob?: Blob | null,
  ) => Promise<void>;
  updatePlayer: (
    master: Partial<PlayerMaster> & { playerId: number; name: string },
  ) => Promise<void>;
  mergePlayer: (
    sourceId: number,
    targetId: number,
    season?: string,
    teamName?: string,
  ) => Promise<void>;
}

/**
 * 選手マスターの作成・更新・統合ミューテーションを提供するカスタムフック
 * QueryClientProvider のスコープ外でも安全に動作可能
 */
export function usePlayerMasterMutations(): PlayerMasterMutations {
  const queryClient = useContext(QueryClientContext);

  const invalidate = async (season?: string) => {
    if (!queryClient) return;
    const keys: (readonly unknown[])[] = [
      playerKeys.all,
      ['chelsea-squad'],
      ['team-squad'],
    ];
    if (season) {
      keys.push(['season-players', season]);
    }
    await Promise.all(
      keys.map((queryKey) => queryClient?.invalidateQueries({ queryKey })),
    );
  };

  const savePlayer = async (
    master: Partial<PlayerMaster> & { playerId: number; name: string },
    photoBlob?: Blob | null,
  ) => {
    await savePlayerMaster(master);
    if (photoBlob) {
      await savePlayerPhoto(master.playerId, photoBlob);
    }
    await invalidate(master.season);
  };

  const updatePlayer = async (
    master: Partial<PlayerMaster> & { playerId: number; name: string },
  ) => {
    await savePlayerMaster(master);
    await invalidate(master.season);
  };

  const mergePlayer = async (
    sourceId: number,
    targetId: number,
    season?: string,
    teamName?: string,
  ) => {
    await mergePlayerId(sourceId, targetId, season, teamName);
    await invalidate(season);
  };

  return {
    savePlayer,
    updatePlayer,
    mergePlayer,
  };
}

/**
 * 単一選手のマスター情報を取得・操作するカスタムフック
 */
export function usePlayerMaster(playerId?: number, season?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: playerId
      ? [...playerKeys.detail(playerId), season ?? 'all']
      : [...playerKeys.all, 'none'],
    queryFn: () =>
      playerId ? getPlayerMaster(playerId, season) : Promise.resolve(undefined),
    enabled:
      typeof playerId === 'number' && !Number.isNaN(playerId) && playerId !== 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const savePhotoMutation = useMutation({
    mutationFn: async ({ blob }: { blob: Blob; name?: string }) => {
      if (!playerId) throw new Error('playerId is required');
      await savePlayerPhoto(playerId, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      if (!playerId) throw new Error('playerId is required');
      await deletePlayerPhoto(playerId, season);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
    },
  });

  const saveMasterMutation = useMutation({
    mutationFn: async (
      player: Partial<PlayerMaster> & { playerId: number; name: string },
    ) => {
      await savePlayerMaster({
        ...player,
        season: season || player.season,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
    },
  });

  const deleteMasterMutation = useMutation({
    mutationFn: async () => {
      if (!playerId) throw new Error('playerId is required');
      await deletePlayerMaster(playerId, season);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
    },
  });

  return {
    player: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    savePhoto: savePhotoMutation.mutateAsync,
    isSavingPhoto: savePhotoMutation.isPending,
    deletePhoto: deletePhotoMutation.mutateAsync,
    isDeletingPhoto: deletePhotoMutation.isPending,
    saveMaster: saveMasterMutation.mutateAsync,
    isSavingMaster: saveMasterMutation.isPending,
    deleteMaster: deleteMasterMutation.mutateAsync,
    isDeletingMaster: deleteMasterMutation.isPending,
  };
}

/**
 * 複数選手のマスター情報を一括取得するカスタムフック
 */
export function usePlayersMasterBatch(playerIds: number[], season?: string) {
  const validIds = Array.from(new Set(playerIds)).filter(
    (id) => typeof id === 'number' && !Number.isNaN(id) && id !== 0,
  );

  return useQuery({
    queryKey: [...playerKeys.batch(validIds), season ?? 'all'],
    queryFn: () => getPlayersMasterBatch(validIds, season),
    enabled: validIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * シーズン別の全選手マスター一覧を取得・管理するカスタムフック
 */
export function useSeasonPlayers(season: string, teamName: string = 'Chelsea') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['season-players', season, teamName],
    queryFn: () => getPlayerMastersBySeason(season, teamName),
    staleTime: 1000 * 60 * 5,
  });

  const invalidateSeason = () => {
    queryClient.invalidateQueries({
      queryKey: ['season-players', season, teamName],
    });
    queryClient.invalidateQueries({ queryKey: playerKeys.all });
    queryClient.invalidateQueries({ queryKey: ['chelsea-squad'] });
  };

  const savePlayerMutation = useMutation({
    mutationFn: async (
      player: Partial<PlayerMaster> & { playerId: number; name: string },
    ) => {
      await savePlayerMaster({
        ...player,
        season,
        teamName,
      });
    },
    onSuccess: invalidateSeason,
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: number) => {
      await deletePlayerMaster(playerId, season);
    },
    onSuccess: invalidateSeason,
  });

  const savePhotoMutation = useMutation({
    mutationFn: async ({
      playerId,
      blob,
    }: {
      playerId: number;
      blob: Blob;
      name?: string;
    }) => {
      await savePlayerPhoto(playerId, blob);
    },
    onSuccess: invalidateSeason,
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (playerId: number) => {
      await deletePlayerPhoto(playerId, season);
    },
    onSuccess: invalidateSeason,
  });

  const mergePlayerMutation = useMutation({
    mutationFn: async ({
      tempPlayerId,
      officialPlayerId,
    }: {
      tempPlayerId: number;
      officialPlayerId: number;
    }) => {
      await mergePlayerId(tempPlayerId, officialPlayerId, season, teamName);
    },
    onSuccess: invalidateSeason,
  });

  return {
    players: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    savePlayer: savePlayerMutation.mutateAsync,
    isSavingPlayer: savePlayerMutation.isPending,
    deletePlayer: deletePlayerMutation.mutateAsync,
    isDeletingPlayer: deletePlayerMutation.isPending,
    savePhoto: savePhotoMutation.mutateAsync,
    isSavingPhoto: savePhotoMutation.isPending,
    deletePhoto: deletePhotoMutation.mutateAsync,
    isDeletingPhoto: deletePhotoMutation.isPending,
    mergePlayer: mergePlayerMutation.mutateAsync,
    isMergingPlayer: mergePlayerMutation.isPending,
  };
}
