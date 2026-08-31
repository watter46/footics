'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getAllMatches,
  getExcludedPlayerMastersBySeason,
  getPlayerMastersBySeason,
} from '@/lib/db/queries';
import type { PlayerMaster } from '@/lib/db/schema';
import {
  CHELSEA_PRESETS_BY_SEASON,
  DEFAULT_OPPONENT_SQUAD,
  DEFAULT_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import { getSeasonFromDate } from '@/lib/tactical/season-utils';
import { getTeamConfig } from '@/lib/tactical/teams-config';
import type { Match, Player } from '@/types';

export function getTacticsMatchId(teamSlug: string): string {
  return `${teamSlug}-tactics-board`;
}

function matchTeamName(targetTeamName: string, name?: string): boolean {
  if (!name) return false;
  const t = targetTeamName.toLowerCase().trim();
  const n = name.toLowerCase().trim();
  return n.includes(t) || t.includes(n);
}

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

  const { teamPlayers, opponentPlayers, dictionary } = useMemo(() => {
    const playerMap = new Map<number, Player>();
    const dict: Record<string, string> = {};

    // 0. 対象シーズンで除外(isExcluded)された選手IDを抽出
    const excludedList = excludedPlayersQuery.data || [];
    const excludedIds = new Set<number>(excludedList.map((p) => p.playerId));

    // 1. プリセットが存在する場合は初期登録 (現時点ではチェルシー等のプリセットを活用)
    if (teamConfig.id === 'chelsea') {
      const presetSquad =
        CHELSEA_PRESETS_BY_SEASON[season as Season] ||
        CHELSEA_PRESETS_BY_SEASON[DEFAULT_SEASON] ||
        [];

      presetSquad.forEach((p) => {
        if (excludedIds.has(p.playerId)) return;
        playerMap.set(p.playerId, {
          playerId: p.playerId,
          name: p.name,
          shirtNo: p.shirtNo,
          position: normalizePosition(p.position),
          isFirstEleven: !!p.isFirstEleven,
          height: 180,
          weight: 75,
          age: 24,
          isManOfTheMatch: false,
          field: 'home',
          stats: {},
        });
        dict[p.playerId] = p.name;
      });
    }

    // 2. DB Matches から該当シーズンのチーム選手を抽出して上書き/追加
    const matches = matchesQuery.data || [];
    matches.forEach((m) => {
      const matchSeason = getSeasonFromDate(m.date);
      if (matchSeason !== season) return;

      let homeMatches = false;
      let awayMatches = false;

      if (
        matchTeamName(effectiveTeamName, m.homeTeam?.name) ||
        matchTeamName(effectiveTeamName, m.teams?.home?.name)
      ) {
        homeMatches = true;
      }
      if (
        matchTeamName(effectiveTeamName, m.awayTeam?.name) ||
        matchTeamName(effectiveTeamName, m.teams?.away?.name)
      ) {
        awayMatches = true;
      }

      const processTeamPlayers = (players?: Player[]) => {
        if (!players) return;
        players.forEach((p) => {
          if (!p?.playerId) return;
          if (excludedIds.has(p.playerId)) return;
          const existing = playerMap.get(p.playerId);
          playerMap.set(p.playerId, {
            ...p,
            name: p.name || existing?.name || `Player ${p.playerId}`,
            shirtNo: p.shirtNo || existing?.shirtNo || 99,
            position: normalizePosition(p.position || existing?.position),
            field: 'home',
          });
          dict[p.playerId] = p.name || existing?.name || `Player ${p.playerId}`;
        });
      };

      if (homeMatches && m.teams?.home?.players) {
        processTeamPlayers(m.teams.home.players as Player[]);
      }
      if (awayMatches && m.teams?.away?.players) {
        processTeamPlayers(m.teams.away.players as Player[]);
      }
    });

    // 3. PlayerMaster (手動追加選手 / カスタマイズ選手 / 保存済み選手) の反映
    const masters = playersMasterQuery.data || [];
    masters.forEach((pm: PlayerMaster) => {
      if (!pm.playerId) return;
      if (pm.isExcluded) {
        playerMap.delete(pm.playerId);
        return;
      }

      dict[pm.playerId] = pm.name;

      const existing = playerMap.get(pm.playerId);
      if (existing) {
        playerMap.set(pm.playerId, {
          ...existing,
          name: pm.name || existing.name,
          shirtNo: pm.defaultShirtNo || existing.shirtNo,
          position: normalizePosition(pm.position || existing.position),
        });
      } else {
        // 新規登録選手
        playerMap.set(pm.playerId, {
          playerId: pm.playerId,
          name: pm.name,
          shirtNo: pm.defaultShirtNo || 99,
          position: normalizePosition(pm.position),
          isFirstEleven: false,
          height: 180,
          weight: 75,
          age: 24,
          isManOfTheMatch: false,
          field: 'home',
          stats: {},
        });
      }
    });

    // 4. 対戦相手（Away）スカッドの構築
    const opponentMap = new Map<number, Player>();
    DEFAULT_OPPONENT_SQUAD.forEach((p) => {
      opponentMap.set(p.playerId, {
        playerId: p.playerId,
        name: p.name,
        shirtNo: p.shirtNo,
        position: p.position,
        isFirstEleven: !!p.isFirstEleven,
        height: 180,
        weight: 75,
        age: 24,
        isManOfTheMatch: false,
        field: 'away',
        stats: {},
      });
      dict[p.playerId] = p.name;
    });

    // 5. 重複排除 (Deduplication / Unique by Normalized Name)
    // 同名選手が存在する場合、WhoScored公式ID (playerId > 0) を優先してユニーク化
    const uniqueMap = new Map<string, Player>();
    playerMap.forEach((player) => {
      const cleanName = player.name.trim().toLowerCase();
      const existing = uniqueMap.get(cleanName);
      if (!existing) {
        uniqueMap.set(cleanName, player);
      } else {
        // 既存が仮ID(<0)で新規が公式ID(>0)の場合は公式IDで上書き（背番号・ポジションは引き継ぐ）
        if (existing.playerId < 0 && player.playerId > 0) {
          uniqueMap.set(cleanName, {
            ...player,
            shirtNo: existing.shirtNo || player.shirtNo,
            position: existing.position || player.position,
          });
        }
      }
    });

    const teamList = Array.from(uniqueMap.values());
    const opponentList = Array.from(opponentMap.values());

    return {
      teamPlayers: teamList,
      opponentPlayers: opponentList,
      dictionary: dict,
    };
  }, [
    matchesQuery.data,
    playersMasterQuery.data,
    excludedPlayersQuery.data,
    season,
    teamConfig.id,
    effectiveTeamName,
  ]);

  // 仮想 Match オブジェクトを構築
  const virtualMatch: Match = useMemo(() => {
    return {
      id: getTacticsMatchId(teamConfig.id),
      date: new Date().toISOString(),
      score: '0 - 0',
      matchType: 'club',
      homeTeam: {
        id: teamConfig.officialTeamId || 15,
        name: teamConfig.shortName,
      },
      awayTeam: { id: 9999, name: 'Opponent' },
      playerIdNameDictionary: dictionary,
      teams: {
        home: {
          teamId: teamConfig.officialTeamId || 15,
          name: teamConfig.shortName,
          countryName: 'England',
          managerName: 'Manager',
          field: 'home',
          averageAge: 24.0,
          players: teamPlayers,
          formations: [
            {
              formationId: 2,
              formationName: '4-2-3-1',
              captainPlayerId: teamPlayers[0]?.playerId || 0,
              startMinuteExpanded: 0,
              endMinuteExpanded: 90,
              playerIds: teamPlayers.slice(0, 11).map((p) => p.playerId),
              jerseyNumbers: teamPlayers.slice(0, 11).map((p) => p.shirtNo),
            },
          ],
          stats: {},
        },
        away: {
          teamId: 9999,
          name: 'Opponent',
          countryName: 'Opponent',
          managerName: 'Manager',
          field: 'away',
          averageAge: 25.0,
          players: opponentPlayers,
          formations: [
            {
              formationId: 2,
              formationName: '4-2-3-1',
              captainPlayerId: 999001,
              startMinuteExpanded: 0,
              endMinuteExpanded: 90,
              playerIds: opponentPlayers.slice(0, 11).map((p) => p.playerId),
              jerseyNumbers: opponentPlayers.slice(0, 11).map((p) => p.shirtNo),
            },
          ],
          stats: {},
        },
      },
    };
  }, [teamConfig, dictionary, teamPlayers, opponentPlayers]);

  return {
    teamConfig,
    teamPlayers,
    opponentPlayers,
    virtualMatch,
    isLoading,
    refetch: () => {
      matchesQuery.refetch();
      playersMasterQuery.refetch();
    },
  };
}
