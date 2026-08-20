'use client';

import {
  Check,
  CheckSquare,
  Copy,
  FolderSync,
  Loader2,
  Square,
  Users,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useChelseaSquad } from '@/hooks/use-chelsea-squad';
import { useSeasonPlayers } from '@/hooks/use-player-master';
import { savePlayerMaster, savePlayerPhoto } from '@/lib/db/queries';
import type { PlayerMaster } from '@/lib/db/schema';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import type { Player } from '@/types';

interface CopySeasonPlayersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetSeason: string;
  availableSeasons: string[];
  currentSeasonPlayerIds: Set<number>;
  onSuccess: () => void;
}

export const CopySeasonPlayersDialog: React.FC<
  CopySeasonPlayersDialogProps
> = ({
  isOpen,
  onClose,
  targetSeason,
  availableSeasons,
  currentSeasonPlayerIds,
  onSuccess,
}) => {
  // コピー元シーズンの初期値: targetSeason 以外の最初のシーズン
  const otherSeasons = useMemo(
    () => availableSeasons.filter((s) => s !== targetSeason),
    [availableSeasons, targetSeason],
  );

  const [fromSeason, setFromSeason] = useState<string>(
    otherSeasons[0] || '25-26',
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // コピー元シーズンの選手一覧を取得
  const { chelseaPlayers: sourceSquad, isLoading: isSquadLoading } =
    useChelseaSquad(fromSeason);
  const { players: sourceMasters, isLoading: isMasterLoading } =
    useSeasonPlayers(fromSeason, 'Chelsea');

  // ソース選手の統合リスト
  const mergedSourcePlayers = useMemo(() => {
    const masterMap = new Map<number, PlayerMaster>();
    sourceMasters.forEach((pm) => {
      masterMap.set(pm.playerId, pm);
    });

    const list = sourceSquad.map((p) => {
      const pm = masterMap.get(p.playerId);
      return {
        playerId: p.playerId,
        name: pm?.name || p.name,
        shirtNo: pm?.defaultShirtNo || p.shirtNo,
        position: normalizePosition(pm?.position || p.position),
        photoBlob: pm?.photoBlob,
        photoUrl: pm?.photoUrl,
        isAlreadyInTarget: currentSeasonPlayerIds.has(p.playerId),
      };
    });

    // 背番号順にソート
    return list.sort((a, b) => (a.shirtNo || 99) - (b.shirtNo || 99));
  }, [sourceSquad, sourceMasters, currentSeasonPlayerIds]);

  // シーズン変更時に、未登録の選手をデフォルトで全選択
  useEffect(() => {
    if (isOpen && mergedSourcePlayers.length > 0) {
      const initialSelected = new Set<number>();
      mergedSourcePlayers.forEach((p) => {
        if (!p.isAlreadyInTarget) {
          initialSelected.add(p.playerId);
        }
      });
      setSelectedPlayerIds(initialSelected);
    }
  }, [isOpen, fromSeason, mergedSourcePlayers]);

  if (!isOpen) return null;

  const toggleSelectPlayer = (playerId: number) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleSelectAllUnregistered = () => {
    const next = new Set<number>();
    mergedSourcePlayers.forEach((p) => {
      if (!p.isAlreadyInTarget) next.add(p.playerId);
    });
    setSelectedPlayerIds(next);
  };

  const handleSelectAll = () => {
    const next = new Set<number>();
    mergedSourcePlayers.forEach((p) => next.add(p.playerId));
    setSelectedPlayerIds(next);
  };

  const handleClearAll = () => {
    setSelectedPlayerIds(new Set());
  };

  const handleExecuteCopy = async () => {
    if (selectedPlayerIds.size === 0) {
      toast.error('引き継ぐ選手を選択してください');
      return;
    }

    const selectedPlayers = mergedSourcePlayers.filter((p) =>
      selectedPlayerIds.has(p.playerId),
    );

    setIsSubmitting(true);
    const toastId = toast.loading(
      `${selectedPlayers.length} 名の選手を Season ${targetSeason} に引き継ぎ中...`,
    );

    try {
      for (const p of selectedPlayers) {
        // 1. PlayerMaster を targetSeason として保存
        await savePlayerMaster({
          playerId: p.playerId,
          name: p.name,
          defaultShirtNo: p.shirtNo,
          position: p.position,
          season: targetSeason,
          teamName: 'Chelsea',
          updatedAt: Date.now(),
        });

        // 2. 写真Blobがあれば引き継ぎ
        if (p.photoBlob) {
          await savePlayerPhoto(p.playerId, p.photoBlob, p.name, targetSeason);
        }
      }

      toast.success(
        `${selectedPlayers.length} 名の選手を Season ${targetSeason} に引き継ぎました！`,
        { id: toastId },
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '引き継ぎに失敗しました';
      toast.error(msg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSquadLoading || isMasterLoading;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5 text-slate-100 font-bold text-base">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FolderSync className="w-4 h-4" />
            </div>
            <div>
              <span>他シーズンから選手を引き継ぐ</span>
              <span className="text-xs text-slate-400 font-normal block">
                コピー元シーズンを選択し、引き継ぎたい選手にチェックを入れてください
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-300">
              コピー元:
            </span>
            <select
              value={fromSeason}
              onChange={(e) => setFromSeason(e.target.value)}
              className="h-8 bg-slate-900 border border-slate-700 rounded-lg px-3 text-xs font-bold text-blue-400 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {otherSeasons.map((s) => (
                <option key={s} value={s}>
                  Season {s}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400 font-medium">➔</span>
            <span className="text-xs font-bold text-slate-100 bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 rounded-md">
              Season {targetSeason} (引き継ぎ先)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllUnregistered}
              className="text-[11px] font-semibold text-slate-400 hover:text-blue-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              未登録のみ選択
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              全選択
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              解除
            </button>
          </div>
        </div>

        {/* Players Selection List */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-2">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">
                Season {fromSeason} の選手データを読み込み中...
              </span>
            </div>
          ) : mergedSourcePlayers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-medium">
              Season {fromSeason} に登録されている選手がいません。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mergedSourcePlayers.map((player) => {
                const isSelected = selectedPlayerIds.has(player.playerId);
                return (
                  <div
                    key={player.playerId}
                    onClick={() => toggleSelectPlayer(player.playerId)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/50 text-slate-100'
                        : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            #{player.shirtNo || '99'}
                          </span>
                          <span className="text-xs font-bold truncate">
                            {player.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {player.position}
                        </span>
                      </div>
                    </div>

                    {player.isAlreadyInTarget && (
                      <Badge
                        variant="outline"
                        className="bg-slate-800 text-slate-400 border-slate-700 text-[9px] px-1.5 shrink-0"
                      >
                        登録済
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <span className="text-xs font-semibold text-slate-400">
            選択中:{' '}
            <strong className="text-blue-400">{selectedPlayerIds.size}</strong>{' '}
            名
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <Button
              disabled={isSubmitting || selectedPlayerIds.size === 0}
              onClick={handleExecuteCopy}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl gap-2 shadow-lg shadow-blue-600/25"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {selectedPlayerIds.size} 名を Season {targetSeason} に引き継ぐ
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
