'use client';

import { useQuery } from '@tanstack/react-query';
import { FolderSync, Loader2, Plus, RefreshCw, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAllMatches } from '@/lib/db/queries';
import type { PlayerMaster } from '@/lib/db/schema';
import {
  CHELSEA_PRESETS_BY_SEASON,
  DEFAULT_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { extractAvailableSeasons } from '@/lib/tactical/season-utils';
import { injectTeamSquadToTactical } from '@/lib/tactical/squad-to-tactical-bridge';
import type { StandardPosition } from '@/types';
import { useSeasonPlayers } from '../hooks/use-player-master';
import { useTeamSquad } from '../hooks/use-team-squad';
import { AddPlayerDialog } from './AddPlayerDialog';
import { CopySeasonPlayersDialog } from './CopySeasonPlayersDialog';
import { type EditablePlayerData, EditPlayerDialog } from './EditPlayerDialog';
import { type IdFilterType, SquadFilterBar } from './squad-filter-bar';
import { SquadHeader } from './squad-header';
import { type MergedSquadPlayer, SquadPlayerCard } from './squad-player-card';
import {
  type PositionCategory,
  SquadStatsSummary,
} from './squad-stats-summary';

const POSITION_CATEGORIES: PositionCategory[] = [
  { key: 'GK', label: 'Goalkeepers', positions: ['GK'] },
  { key: 'DF', label: 'Defenders', positions: ['DF', 'DR', 'DC', 'DL'] },
  {
    key: 'MID',
    label: 'Midfielders',
    positions: ['MID', 'DMC', 'MC', 'AMC', 'AMR', 'AML'],
  },
  { key: 'FW', label: 'Forwards', positions: ['FW'] },
  { key: 'Other', label: 'Others', positions: ['Other', 'Sub'] },
];

export interface TeamSquadClientProps {
  teamId?: string;
}

export const TeamSquadClient: React.FC<TeamSquadClientProps> = ({
  teamId = 'chelsea',
}) => {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState<string>(DEFAULT_SEASON);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isCopySeasonOpen, setIsCopySeasonOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<EditablePlayerData | null>(
    null,
  );
  const [idFilter, setIdFilter] = useState<IdFilterType>('all');

  // 1. 全試合データから利用可能なシーズン一覧を取得
  const matchesQuery = useQuery({
    queryKey: ['all-matches-seasons'],
    queryFn: () => getAllMatches(),
    staleTime: 1000 * 60 * 5,
  });

  const availableSeasons = useMemo(() => {
    const matches = matchesQuery.data || [];
    return extractAvailableSeasons(matches, ['26-27', '25-26', '24-25']);
  }, [matchesQuery.data]);

  // 2. 該当チーム・シーズンのスカッドを取得
  const {
    teamConfig,
    teamPlayers,
    isLoading: isSquadLoading,
    refetch: refetchSquad,
  } = useTeamSquad({
    teamId,
    season: selectedSeason,
  });

  // 3. PlayerMaster 操作フック
  const {
    players: masterPlayers,
    savePlayer,
    deletePlayer,
    savePhoto,
    deletePhoto,
    isLoading: isMasterLoading,
  } = useSeasonPlayers(selectedSeason, teamConfig.shortName);

  // 4. マスタ選手情報とスカッド情報を統合したリスト (重複排除・ユニーク化)
  const mergedPlayers: MergedSquadPlayer[] = useMemo(() => {
    const masterMap = new Map<number, PlayerMaster>();
    masterPlayers.forEach((pm) => {
      masterMap.set(pm.playerId, pm);
    });

    const list: MergedSquadPlayer[] = teamPlayers.map((p) => {
      const pm = masterMap.get(p.playerId);
      return {
        ...p,
        name: pm?.name || p.name,
        shirtNo: pm?.defaultShirtNo || p.shirtNo,
        position: (pm?.position as typeof p.position) || p.position,
        photoBlob: pm?.photoBlob,
        photoUrl: pm?.photoUrl,
      };
    });

    // 名前および playerId で名寄せ・ユニーク化
    const uniqueMap = new Map<string, MergedSquadPlayer>();
    list.forEach((p) => {
      const cleanName = p.name.trim().toLowerCase();
      const existing = uniqueMap.get(cleanName);
      if (!existing) {
        uniqueMap.set(cleanName, p);
      } else {
        // 公式ID (playerId > 0) を優先。手動選手の情報(写真・背番号)を引き継ぎ
        if (existing.playerId < 0 && p.playerId > 0) {
          uniqueMap.set(cleanName, {
            ...p,
            shirtNo: existing.shirtNo || p.shirtNo,
            photoBlob: existing.photoBlob || p.photoBlob,
            photoUrl: existing.photoUrl || p.photoUrl,
            position: existing.position || p.position,
          });
        } else if (existing.playerId > 0 && p.playerId < 0) {
          uniqueMap.set(cleanName, {
            ...existing,
            photoBlob: p.photoBlob || existing.photoBlob,
            photoUrl: p.photoUrl || existing.photoUrl,
          });
        }
      }
    });

    return Array.from(uniqueMap.values());
  }, [teamPlayers, masterPlayers]);

  // フィルター適用後の選手リスト
  const filteredPlayers = useMemo(() => {
    if (idFilter === 'official') {
      return mergedPlayers.filter((p) => p.playerId > 0);
    }
    if (idFilter === 'manual') {
      return mergedPlayers.filter((p) => p.playerId < 0);
    }
    return mergedPlayers;
  }, [mergedPlayers, idFilter]);

  // 公式ID登録済み / 未登録のカウント
  const officialCount = useMemo(
    () => mergedPlayers.filter((p) => p.playerId > 0).length,
    [mergedPlayers],
  );
  const manualCount = useMemo(
    () => mergedPlayers.filter((p) => p.playerId < 0).length,
    [mergedPlayers],
  );

  // ポジションカテゴリ別の選手一覧
  const playersByCategory = useMemo(() => {
    const map: Record<string, MergedSquadPlayer[]> = {};
    POSITION_CATEGORIES.forEach((cat) => {
      map[cat.key] = [];
    });

    filteredPlayers.forEach((p) => {
      const cat = POSITION_CATEGORIES.find((c) =>
        c.positions.includes(p.position),
      );
      if (cat) {
        map[cat.key].push(p);
      } else {
        map.Other.push(p);
      }
    });

    // 背番号順にソート
    Object.keys(map).forEach((k) => {
      map[k as StandardPosition].sort(
        (a, b) => (a.shirtNo || 99) - (b.shirtNo || 99),
      );
    });

    return map;
  }, [filteredPlayers]);

  const availableOfficialPlayers = useMemo(
    () =>
      mergedPlayers
        .filter((p) => p.playerId > 0)
        .map((p) => ({
          playerId: p.playerId,
          name: p.name,
          shirtNo: p.shirtNo,
        })),
    [mergedPlayers],
  );

  const currentSeasonPlayerIds = useMemo(
    () => new Set(mergedPlayers.map((p) => p.playerId)),
    [mergedPlayers],
  );

  // プリセット・試合データから初期同期
  const handleSyncSquad = async () => {
    const toastId = toast.loading(
      `${teamConfig.shortName} (${selectedSeason}) の選手データを同期中...`,
    );
    try {
      if (teamConfig.id === 'chelsea') {
        const presetSquad =
          CHELSEA_PRESETS_BY_SEASON[selectedSeason as Season] || [];
        for (const p of presetSquad) {
          await savePlayer({
            playerId: p.playerId,
            name: p.name,
            defaultShirtNo: p.shirtNo,
            position: p.position,
            season: selectedSeason,
            teamName: teamConfig.shortName,
          });
        }
      } else {
        for (const p of teamPlayers) {
          await savePlayer({
            playerId: p.playerId,
            name: p.name,
            defaultShirtNo: p.shirtNo,
            position: p.position,
            season: selectedSeason,
            teamName: teamConfig.shortName,
          });
        }
      }

      refetchSquad();
      toast.success(
        `${teamConfig.shortName} (${selectedSeason}) の選手データを同期しました`,
        { id: toastId },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '同期に失敗しました';
      toast.error(msg, { id: toastId });
    }
  };

  const handleDeletePlayer = async (player: MergedSquadPlayer) => {
    if (!confirm(`${player.name} を選手リストから削除しますか？`)) {
      return;
    }

    try {
      await deletePlayer(player.playerId);
      refetchSquad();
      toast.success(`${player.name} を削除しました`);
    } catch {
      toast.error('選手の削除に失敗しました');
    }
  };

  const handleEditPlayer = (player: MergedSquadPlayer) => {
    setEditingPlayer({
      playerId: player.playerId,
      name: player.name,
      shirtNo: player.shirtNo,
      position: player.position,
      season: selectedSeason,
      teamName: teamConfig.shortName,
    });
  };

  const handleOpenTacticalCanvas = () => {
    injectTeamSquadToTactical({
      teamName: teamConfig.name,
      team: 'home',
      players: mergedPlayers,
      formation: '4-2-3-1',
      mode: 'half',
    });
    toast.success(
      `${teamConfig.shortName} のスカッドを Tactical Canvas に読み込みました`,
    );
    router.push('/tactical');
  };

  const isLoading = isSquadLoading || isMasterLoading;

  return (
    <div className="space-y-8">
      {/* Team Header & Control Bar */}
      <SquadHeader
        teamName={teamConfig.name}
        leagueName={teamConfig.league}
        accentColor={teamConfig.accentColor}
        selectedSeason={selectedSeason}
        availableSeasons={availableSeasons}
        onSelectSeason={setSelectedSeason}
        onSyncSquad={handleSyncSquad}
        onOpenCopySeason={() => setIsCopySeasonOpen(true)}
        onOpenTacticalCanvas={handleOpenTacticalCanvas}
        onOpenAddPlayer={() => setIsAddPlayerOpen(true)}
      />

      {/* Summary Stat Cards */}
      <SquadStatsSummary
        totalCount={mergedPlayers.length}
        positionCategories={POSITION_CATEGORIES}
        playersByCategory={playersByCategory}
      />

      {/* ID Status Filter Bar */}
      <SquadFilterBar
        idFilter={idFilter}
        onFilterChange={setIdFilter}
        totalCount={mergedPlayers.length}
        officialCount={officialCount}
        manualCount={manualCount}
      />

      {/* Players Categories & Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm font-medium">
            Loading {teamConfig.shortName} squad...
          </span>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <Card className="bg-slate-900/30 border-slate-800/60 border-dashed rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              {idFilter === 'all'
                ? `No players found for Season ${selectedSeason}`
                : '該当する選手がいません'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {idFilter === 'manual'
                ? 'このシーズンにはID未登録（手動）の選手はいません。すべての選手がWhoScored公式IDと紐付いています。'
                : idFilter === 'official'
                  ? 'WhoScored登録済みの選手が見つかりませんでした。'
                  : `Sync presets/matches or add new players to ${teamConfig.shortName}'s squad.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={handleSyncSquad}
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Squad</span>
            </Button>
            <Button
              onClick={() => setIsCopySeasonOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl text-xs border-blue-500/40 text-blue-400 hover:bg-blue-600/10"
            >
              <FolderSync className="w-3.5 h-3.5" />
              <span>他シーズンから引き継ぐ</span>
            </Button>
            <Button
              onClick={() => setIsAddPlayerOpen(true)}
              size="sm"
              className="gap-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Player</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {POSITION_CATEGORIES.map((cat) => {
            const list = playersByCategory[cat.key] || [];
            if (list.length === 0) return null;

            return (
              <div key={cat.key} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-400 tracking-wider">
                      {cat.key}
                    </span>
                    <span className="text-sm font-bold text-slate-200">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {list.length} players
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {list.map((player) => (
                    <SquadPlayerCard
                      key={player.playerId}
                      player={player}
                      selectedSeason={selectedSeason}
                      onEdit={handleEditPlayer}
                      onDelete={handleDeletePlayer}
                      onPhotoUpload={async (blob) => {
                        await savePhoto({
                          playerId: player.playerId,
                          blob,
                          name: player.name,
                        });
                        refetchSquad();
                      }}
                      onPhotoDelete={
                        player.photoBlob || player.photoUrl
                          ? async () => {
                              await deletePhoto(player.playerId);
                              refetchSquad();
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Player Dialog */}
      <AddPlayerDialog
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        defaultTeam="home"
        defaultSeason={selectedSeason}
        teamName={teamConfig.shortName}
        availableSeasons={availableSeasons}
        onPlayerAdded={() => {
          refetchSquad();
        }}
      />

      {/* Edit Player Dialog */}
      <EditPlayerDialog
        isOpen={!!editingPlayer}
        onClose={() => setEditingPlayer(null)}
        player={editingPlayer}
        availableOfficialPlayers={availableOfficialPlayers}
        onSuccess={() => {
          refetchSquad();
        }}
      />

      {/* Copy Season Players Dialog */}
      <CopySeasonPlayersDialog
        isOpen={isCopySeasonOpen}
        onClose={() => setIsCopySeasonOpen(false)}
        teamId={teamConfig.id}
        teamName={teamConfig.shortName}
        targetSeason={selectedSeason}
        availableSeasons={availableSeasons}
        currentSeasonPlayerIds={currentSeasonPlayerIds}
        onSuccess={() => {
          refetchSquad();
        }}
      />
    </div>
  );
};
