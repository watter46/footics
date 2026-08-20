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
  type PresetPlayer,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import { getSeasonFromDate } from '@/lib/tactical/season-utils';
import type { Match, Player, SimplifiedTeam } from '@/types';

export const CHELSEA_TACTICS_MATCH_ID = 'chelsea-tactics-board';

function isChelseaTeam(name?: string): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('chelsea');
}

/**
 * チェルシーのスカッドおよび仮想Matchデータを構築・取得するカスタムフック (シーズン別対応)
 */
export function useChelseaSquad(season: string = DEFAULT_SEASON) {
  const matchesQuery = useQuery({
    queryKey: ['chelsea-squad', 'matches'],
    queryFn: () => getAllMatches(),
    staleTime: 1000 * 60 * 5,
  });

  const playersMasterQuery = useQuery({
    queryKey: ['chelsea-squad', 'players-master', season],
    queryFn: () => getPlayerMastersBySeason(season, 'Chelsea'),
    staleTime: 1000 * 60 * 5,
  });

  const excludedPlayersQuery = useQuery({
    queryKey: ['chelsea-squad', 'excluded-players', season],
    queryFn: () => getExcludedPlayerMastersBySeason(season, 'Chelsea'),
    staleTime: 1000 * 60 * 5,
  });

  const isLoading =
    matchesQuery.isLoading ||
    playersMasterQuery.isLoading ||
    excludedPlayersQuery.isLoading;

  const { chelseaPlayers, opponentPlayers, dictionary } = useMemo(() => {
    const chelseaMap = new Map<number, Player>();
    const dict: Record<string, string> = {};

    // 0. 対象シーズンで除外(isExcluded)された選手IDを抽出
    const excludedList = excludedPlayersQuery.data || [];
    const excludedIds = new Set<number>(excludedList.map((p) => p.playerId));

    // 1. 選択されたシーズンのプリセットをベースに登録 (除外選手はスキップ)
    const presetSquad =
      CHELSEA_PRESETS_BY_SEASON[season as Season] ||
      CHELSEA_PRESETS_BY_SEASON[DEFAULT_SEASON] ||
      [];

    presetSquad.forEach((p) => {
      if (excludedIds.has(p.playerId)) return;
      chelseaMap.set(p.playerId, {
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

    // 2. DB Matches から該当シーズンのチェルシー選手を抽出して上書き/追加
    const matches = matchesQuery.data || [];
    matches.forEach((m) => {
      const matchSeason = getSeasonFromDate(m.date);
      if (matchSeason !== season) return;

      let homeIsChelsea = false;
      let awayIsChelsea = false;
      if (
        isChelseaTeam(m.homeTeam?.name) ||
        isChelseaTeam(m.teams?.home?.name)
      ) {
        homeIsChelsea = true;
      }
      if (
        isChelseaTeam(m.awayTeam?.name) ||
        isChelseaTeam(m.teams?.away?.name)
      ) {
        awayIsChelsea = true;
      }

      const processTeamPlayers = (players?: Player[]) => {
        if (!players) return;
        players.forEach((p) => {
          if (!p || !p.playerId) return;
          if (excludedIds.has(p.playerId)) return;
          const existing = chelseaMap.get(p.playerId);
          chelseaMap.set(p.playerId, {
            ...p,
            name: p.name || existing?.name || `Player ${p.playerId}`,
            shirtNo: p.shirtNo || existing?.shirtNo || 99,
            position: normalizePosition(p.position || existing?.position),
            field: 'home',
          });
          dict[p.playerId] = p.name || existing?.name || `Player ${p.playerId}`;
        });
      };

      if (homeIsChelsea && m.teams?.home?.players) {
        processTeamPlayers(m.teams.home.players as Player[]);
      }
      if (awayIsChelsea && m.teams?.away?.players) {
        processTeamPlayers(m.teams.away.players as Player[]);
      }
    });

    // 3. PlayerMaster (手動追加選手 / カスタマイズ選手 / 保存済み選手) の反映
    const masters = playersMasterQuery.data || [];
    masters.forEach((pm: PlayerMaster) => {
      if (!pm.playerId) return;
      if (pm.isExcluded) {
        chelseaMap.delete(pm.playerId);
        return;
      }

      dict[pm.playerId] = pm.name;

      const existing = chelseaMap.get(pm.playerId);
      if (existing) {
        chelseaMap.set(pm.playerId, {
          ...existing,
          name: pm.name || existing.name,
          shirtNo: pm.defaultShirtNo || existing.shirtNo,
          position: normalizePosition(pm.position || existing.position),
        });
      } else {
        // 新規登録選手
        chelseaMap.set(pm.playerId, {
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

    // 4. 重複排除 (Deduplication / Unique by Normalized Name)
    // 同名選手が存在する場合、WhoScored公式ID (playerId > 0) を優先してユニーク化
    const uniqueChelseaMap = new Map<string, Player>();
    chelseaMap.forEach((player) => {
      const cleanName = player.name.trim().toLowerCase();
      const existing = uniqueChelseaMap.get(cleanName);
      if (!existing) {
        uniqueChelseaMap.set(cleanName, player);
      } else {
        // 既存が仮ID(<0)で新規が公式ID(>0)の場合は公式IDで上書き（背番号・ポジションは引き継ぐ）
        if (existing.playerId < 0 && player.playerId > 0) {
          uniqueChelseaMap.set(cleanName, {
            ...player,
            shirtNo: existing.shirtNo || player.shirtNo,
            position: existing.position || player.position,
          });
        }
      }
    });

    const chelseaList = Array.from(uniqueChelseaMap.values());
    const opponentList = Array.from(opponentMap.values());

    return {
      chelseaPlayers: chelseaList,
      opponentPlayers: opponentList,
      dictionary: dict,
    };
  }, [
    matchesQuery.data,
    playersMasterQuery.data,
    excludedPlayersQuery.data,
    season,
  ]);

  // 仮想 Match オブジェクトを構築
  const virtualMatch: Match = useMemo(() => {
    return {
      id: CHELSEA_TACTICS_MATCH_ID,
      date: new Date().toISOString(),
      score: '0 - 0',
      matchType: 'club',
      homeTeam: { id: 15, name: 'Chelsea' },
      awayTeam: { id: 9999, name: 'Opponent' },
      playerIdNameDictionary: dictionary,
      teams: {
        home: {
          teamId: 15,
          name: 'Chelsea',
          countryName: 'England',
          managerName: 'Enzo Maresca',
          field: 'home',
          averageAge: 23.5,
          players: chelseaPlayers,
          formations: [
            {
              formationId: 2,
              formationName: '4-2-3-1',
              captainPlayerId: 345003,
              startMinuteExpanded: 0,
              endMinuteExpanded: 90,
              playerIds: chelseaPlayers.slice(0, 11).map((p) => p.playerId),
              jerseyNumbers: chelseaPlayers.slice(0, 11).map((p) => p.shirtNo),
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
  }, [chelseaPlayers, opponentPlayers, dictionary]);

  return {
    virtualMatch,
    chelseaPlayers,
    opponentPlayers,
    isLoading,
    refetch: () => {
      matchesQuery.refetch();
      playersMasterQuery.refetch();
    },
  };
}
