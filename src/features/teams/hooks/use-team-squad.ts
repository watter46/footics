'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getAllMatches,
  getExcludedPlayerMastersBySeason,
  getPlayerMastersBySeason,
} from '@/lib/db/queries';
import { DEFAULT_SEASON } from '@/lib/tactical/chelsea-preset';
import { getTeamConfig } from '@/lib/tactical/teams-config';
import {
  buildUnifiedSquad,
  buildVirtualMatch,
  getTacticsMatchId,
} from '../utils/squad-builder';

export { getTacticsMatchId };

export interface UseTeamSquadOptions {
  teamId?: string; // e.g. 'chelsea', 'arsenal'
  teamName?: string; // e.g. 'Chelsea', 'Arsenal'
  season?: string;
}

/**
 * 汎用チームのスカッドおよび仮想Matchデータを構築・取得するカスタムフック (シーズン別対応)
 */
export function useTeamSquad({
  teamId = 'chelsea',
  teamName,
  season = DEFAULT_SEASON,
}: UseTeamSquadOptions = {}) {
  const teamConfig = useMemo(() => getTeamConfig(teamId), [teamId]);
  const effectiveTeamName = teamName || teamConfig.shortName;

  const matchesQuery = useQuery({
    queryKey: ['team-squad', teamConfig.id, 'matches'],
    queryFn: () => getAllMatches(),
    staleTime: 1000 * 60 * 5,
  });

  const playersMasterQuery = useQuery({
    queryKey: ['team-squad', teamConfig.id, 'players-master', season],
    queryFn: () => getPlayerMastersBySeason(season, effectiveTeamName),
    staleTime: 1000 * 60 * 5,
  });

  const excludedPlayersQuery = useQuery({
    queryKey: ['team-squad', teamConfig.id, 'excluded-players', season],
    queryFn: () => getExcludedPlayerMastersBySeason(season, effectiveTeamName),
    staleTime: 1000 * 60 * 5,
  });

  const isLoading =
    matchesQuery.isLoading ||
    playersMasterQuery.isLoading ||
    excludedPlayersQuery.isLoading;

  const { teamPlayers, opponentPlayers, dictionary } = useMemo(
    () =>
      buildUnifiedSquad({
        teamConfig,
        effectiveTeamName,
        season,
        matches: matchesQuery.data,
        masters: playersMasterQuery.data,
        excludedPlayers: excludedPlayersQuery.data,
      }),
    [
      teamConfig,
      effectiveTeamName,
      season,
      matchesQuery.data,
      playersMasterQuery.data,
      excludedPlayersQuery.data,
    ],
  );

  const virtualMatch = useMemo(
    () =>
      buildVirtualMatch(teamConfig, teamPlayers, opponentPlayers, dictionary),
    [teamConfig, teamPlayers, opponentPlayers, dictionary],
  );

  return {
    teamConfig,
    teamPlayers,
    opponentPlayers,
    virtualMatch,
    isLoading,
    refetch: () => {
      matchesQuery.refetch();
      playersMasterQuery.refetch();
      excludedPlayersQuery.refetch();
    },
  };
}
