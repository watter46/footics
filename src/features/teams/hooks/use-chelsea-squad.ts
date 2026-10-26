'use client';

import { DEFAULT_SEASON } from '@/lib/tactical/chelsea-preset';
import { useTeamSquad } from './use-team-squad';

export const CHELSEA_TACTICS_MATCH_ID = 'chelsea-tactics-board';

/**
 * チェルシーのスカッドおよび仮想Matchデータを構築・取得するカスタムフック (後方互換ラッパー)
 */
export function useChelseaSquad(season: string = DEFAULT_SEASON) {
  const squad = useTeamSquad({
    teamId: 'chelsea',
    teamName: 'Chelsea',
    season,
  });

  return {
    virtualMatch: squad.virtualMatch,
    chelseaPlayers: squad.teamPlayers,
    opponentPlayers: squad.opponentPlayers,
    isLoading: squad.isLoading,
    refetch: squad.refetch,
  };
}
