import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Player } from '../types';

/**
 * Team & Player Repository Hook
 *
 * 責務:
 * - Dexie.js (db.teams, db.players) へのアクセスをカプセル化
 * - チームと選手データの取得
 */
export function useTeamRepository() {

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * 全てのチームを取得する
   */
  const useAllTeams = () => {
    return useLiveQuery(() => db.teams.toArray());
  };

  /**
   * 指定されたIDのチームを取得する
   */
  const useTeamById = (teamId: number) => {
    return useLiveQuery(() => db.teams.get(teamId), [teamId]);
  };

  /**
   * 指定されたチームの選手一覧を取得する
   */
  const useTeamPlayers = (teamId: number) => {
    return useLiveQuery(async () => {
      return await db.players
        .where('teamId')
        .equals(teamId)
        .toArray();
    }, [teamId]);
  };

  /**
   * 複数のIDに対応する選手を取得する
   */
  const getPlayersByIds = async (playerIds: number[]): Promise<Player[]> => {
    return await db.players.where('id').anyOf(playerIds).toArray();
  };

  /**
   * 複数のIDに対応するチームを取得する (Hook)
   */
  const useTeamsByIds = (teamIds: number[]) => {
    return useLiveQuery(async () => {
      if (teamIds.length === 0) return [];
      return await db.teams.where('id').anyOf(teamIds).toArray();
    }, [teamIds.join(',')]);
  };

  return {
    useAllTeams,
    useTeamById,
    useTeamPlayers,
    getPlayersByIds,
    useTeamsByIds,
  };
}
