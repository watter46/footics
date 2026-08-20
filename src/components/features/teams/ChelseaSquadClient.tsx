'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Edit3,
  FolderSync,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AddPlayerDialog } from '@/components/features/tactical-board/add-player-dialog';
import { ChelseaTacticalBoardModal } from '@/components/features/tactical-board/chelsea-tactical-board-modal';
import { CopySeasonPlayersDialog } from '@/components/features/teams/CopySeasonPlayersDialog';
import {
  EditPlayerDialog,
  type EditablePlayerData,
} from '@/components/features/teams/EditPlayerDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useChelseaSquad } from '@/hooks/use-chelsea-squad';
import { useSeasonPlayers } from '@/hooks/use-player-master';
import { getAllMatches } from '@/lib/db/queries';
import type { PlayerMaster } from '@/lib/db/schema';
import {
  CHELSEA_PRESETS_BY_SEASON,
  DEFAULT_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { extractAvailableSeasons } from '@/lib/tactical/season-utils';
import type { Match, Player, StandardPosition } from '@/types';
import { PlayerPhoto } from './PlayerPhoto';

const POSITION_CATEGORIES: Array<{
  key: StandardPosition;
  label: string;
  positions: Array<Player['position']>;
}> = [
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

export const ChelseaSquadClient: React.FC = () => {
  const [selectedSeason, setSelectedSeason] = useState<string>(DEFAULT_SEASON);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isCopySeasonOpen, setIsCopySeasonOpen] = useState(false);
  const [isTacticalBoardOpen, setIsTacticalBoardOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<EditablePlayerData | null>(
    null,
  );
  const [idFilter, setIdFilter] = useState<'all' | 'official' | 'manual'>('all');

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

  // 2. 該当シーズンのチェルシースカッドを取得
  const {
    chelseaPlayers,
    isLoading: isSquadLoading,
    refetch: refetchSquad,
  } = useChelseaSquad(selectedSeason);

  // 3. PlayerMaster 操作フック
  const {
    players: masterPlayers,
    savePlayer,
    deletePlayer,
    savePhoto,
    deletePhoto,
    isLoading: isMasterLoading,
  } = useSeasonPlayers(selectedSeason, 'Chelsea');

  // 4. マスタ選手情報とスカッド情報を統合したリスト (重複排除・ユニーク化)
  const mergedPlayers = useMemo(() => {
    const masterMap = new Map<number, PlayerMaster>();
    masterPlayers.forEach((pm) => {
      masterMap.set(pm.playerId, pm);
    });

    const list = chelseaPlayers.map((p) => {
      const pm = masterMap.get(p.playerId);
      return {
        ...p,
        name: pm?.name || p.name,
        shirtNo: pm?.defaultShirtNo || p.shirtNo,
        position: (pm?.position as Player['position']) || p.position,
        photoBlob: pm?.photoBlob,
        photoUrl: pm?.photoUrl,
      };
    });

    // 名前および playerId で名寄せ・ユニーク化
    const uniqueMap = new Map<string, (typeof list)[0]>();
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
  }, [chelseaPlayers, masterPlayers]);

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
    const map: Record<string, typeof filteredPlayers> = {};
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
        map['Other'].push(p);
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
      `${selectedSeason} シーズンの選手データを同期中...`,
    );
    try {
      // プリセット選手を保存
      const presetSquad =
        CHELSEA_PRESETS_BY_SEASON[selectedSeason as Season] || [];
      for (const p of presetSquad) {
        await savePlayer({
          playerId: p.playerId,
          name: p.name,
          defaultShirtNo: p.shirtNo,
          position: p.position,
          season: selectedSeason,
          teamName: 'Chelsea',
        });
      }

      refetchSquad();
      toast.success(`${selectedSeason} シーズンの選手データを同期しました`, {
        id: toastId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '同期に失敗しました';
      toast.error(msg, { id: toastId });
    }
  };

  const handleDeletePlayer = async (player: (typeof mergedPlayers)[0]) => {
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

  const isLoading = isSquadLoading || isMasterLoading;

  return (
    <div className="space-y-8">
      {/* Team Header & Control Bar */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Shield className="w-8 h-8 fill-blue-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-100">
                Chelsea FC
              </h1>
              <Badge
                variant="outline"
                className="bg-blue-600/10 border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider"
              >
                Premier League
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Squad Management & Tactical Preparation
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Season Selector */}
          <div className="relative">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="h-10 bg-slate-950/80 border border-slate-700 hover:border-blue-500/60 rounded-xl px-4 text-xs font-bold text-blue-400 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-9 transition-all shadow-sm"
              title="シーズン切り替え"
            >
              {availableSeasons.map((s) => (
                <option
                  key={s}
                  value={s}
                  className="bg-slate-900 text-slate-200"
                >
                  Season {s}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sync from Presets Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncSquad}
            title="プリセット・試合データから選手を再同期"
            className="h-10 px-3.5 bg-slate-950/80 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sync Squad</span>
          </Button>

          {/* Copy Season Players Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCopySeasonOpen(true)}
            title="他のシーズンから選手を引き継ぐ"
            className="h-10 px-3.5 bg-slate-950/80 border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 text-slate-300 hover:text-blue-300 rounded-xl text-xs font-semibold gap-2 transition-colors"
          >
            <FolderSync className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">他シーズンから引き継ぐ</span>
          </Button>

          {/* Tactical Board Modal Button */}
          <Button
            size="sm"
            onClick={() => setIsTacticalBoardOpen(true)}
            className="h-10 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 hover:border-blue-400 text-blue-300 rounded-xl text-xs font-bold gap-2 transition-all shadow-sm group"
          >
            <Shield className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Tactical Board</span>
          </Button>

          {/* Add New Player Button */}
          <Button
            size="sm"
            onClick={() => setIsAddPlayerOpen(true)}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold gap-2 shadow-lg shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Player</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-900/50 border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
              Total Squad
            </span>
            <span className="text-xl font-black text-slate-100">
              {mergedPlayers.length}
            </span>
          </div>
        </Card>

        {POSITION_CATEGORIES.map((cat) => (
          <Card
            key={cat.key}
            className="bg-slate-900/50 border-slate-800/80 p-4 rounded-xl flex items-center gap-3"
          >
            <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
              <span className="text-xs font-black">{cat.key}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider truncate">
                {cat.label}
              </span>
              <span className="text-xl font-black text-slate-100">
                {playersByCategory[cat.key]?.length || 0}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* ID Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span>表示フィルター:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIdFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                idFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              すべて ({mergedPlayers.length})
            </button>
            <button
              type="button"
              onClick={() => setIdFilter('official')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                idFilter === 'official'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-blue-300 hover:text-blue-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>WhoScored 登録済 ({officialCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setIdFilter('manual')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                idFilter === 'manual'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-amber-300 hover:text-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>ID未登録 (手動) ({manualCount})</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          {idFilter === 'manual' && manualCount > 0 && (
            <span className="text-amber-400">
              ※ ID未登録の選手はカードをクリックしてWhoScored IDと紐付けできます
            </span>
          )}
        </div>
      </div>

      {/* Players Categories & Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Loading Chelsea squad...</span>
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
                  : 'Sync from presets or add new players to this season\'s squad.'}
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
              <span>Sync Preset Squad</span>
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
                    <Card
                      key={player.playerId}
                      onClick={() =>
                        setEditingPlayer({
                          playerId: player.playerId,
                          name: player.name,
                          shirtNo: player.shirtNo,
                          position: player.position,
                          season: selectedSeason,
                          teamName: 'Chelsea',
                        })
                      }
                      className="bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 hover:border-blue-500/50 rounded-2xl p-4 transition-all shadow-md group relative flex items-center justify-between gap-3.5 cursor-pointer hover:shadow-blue-500/5"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Player Photo with Upload/Delete Support */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <PlayerPhoto
                            photoBlob={player.photoBlob}
                            photoUrl={player.photoUrl}
                            name={player.name}
                            shirtNo={player.shirtNo}
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
                            size="md"
                          />
                        </div>

                        {/* Player Details */}
                        <div className="min-w-0 flex flex-col">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-black text-blue-400">
                              #{player.shirtNo || '99'}
                            </span>
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border-slate-700"
                            >
                              {player.position}
                            </Badge>
                            {player.playerId > 0 ? (
                              <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[9px] font-mono font-semibold bg-blue-600/10 text-blue-400 border-blue-500/30"
                                title={`WhoScored 登録選手 (ID: ${player.playerId})`}
                              >
                                ID: {player.playerId}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[9px] font-semibold bg-amber-500/15 text-amber-300 border-amber-500/40"
                                title="WhoScored未登録の手動追加選手です。クリックしてWhoScored IDを紐付けできます。"
                              >
                                ID未登録 (手動)
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 min-w-0">
                            <span
                              className="text-sm font-bold text-slate-100 truncate group-hover:text-blue-300 transition-colors"
                              title={player.name}
                            >
                              {player.name}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-blue-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Season {selectedSeason}
                          </span>
                        </div>
                      </div>

                      {/* Action Menu (Edit & Delete) */}
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPlayer({
                              playerId: player.playerId,
                              name: player.name,
                              shirtNo: player.shirtNo,
                              position: player.position,
                              season: selectedSeason,
                              teamName: 'Chelsea',
                            })
                          }
                          title={`${player.name} の情報を編集`}
                          className="p-2 bg-slate-800/60 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all border border-slate-700/50 hover:border-blue-500/40"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlayer(player)}
                          title={`${player.name} を削除`}
                          className="p-2 bg-slate-800/60 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-slate-700/50 hover:border-red-500/40 opacity-50 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Card>
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
        targetSeason={selectedSeason}
        availableSeasons={availableSeasons}
        currentSeasonPlayerIds={currentSeasonPlayerIds}
        onSuccess={() => {
          refetchSquad();
        }}
      />

      {/* Chelsea Tactical Board Modal */}
      {isTacticalBoardOpen && (
        <ChelseaTacticalBoardModal
          isOpen={isTacticalBoardOpen}
          onClose={() => setIsTacticalBoardOpen(false)}
        />
      )}
    </div>
  );
};
