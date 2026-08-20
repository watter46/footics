'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Edit3,
  Link as LinkIcon,
  Loader2,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mergePlayerId, savePlayerMaster } from '@/lib/db/queries';
import { playerKeys } from '@/lib/query-keys';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import type { Player, StandardPosition } from '@/types';

export interface EditablePlayerData {
  playerId: number;
  name: string;
  shirtNo?: number;
  position?: Player['position'];
  season: string;
  teamName?: string;
}

export interface OfficialPlayerOption {
  playerId: number;
  name: string;
  shirtNo?: number;
}

interface EditPlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: EditablePlayerData | null;
  availableOfficialPlayers?: OfficialPlayerOption[];
  onSuccess: () => void;
}

const POSITIONS: Array<{ value: StandardPosition; label: string }> = [
  { value: 'GK', label: 'GK (Goalkeeper)' },
  { value: 'DF', label: 'DF (Defender)' },
  { value: 'MID', label: 'MID (Midfielder)' },
  { value: 'FW', label: 'FW (Forward)' },
  { value: 'Other', label: 'Other (その他 / 未設定)' },
];

export const EditPlayerDialog: React.FC<EditPlayerDialogProps> = ({
  isOpen,
  onClose,
  player,
  availableOfficialPlayers = [],
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [shirtNo, setShirtNo] = useState<number | ''>('');
  const [position, setPosition] = useState<StandardPosition>('Other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhoScored 紐付け用ステート
  const [targetOfficialId, setTargetOfficialId] = useState<number | ''>('');
  const [isMerging, setIsMerging] = useState(false);

  const isTemporaryPlayer = player ? player.playerId < 0 : false;

  useEffect(() => {
    if (player) {
      setName(player.name || '');
      setShirtNo(
        typeof player.shirtNo === 'number' && !isNaN(player.shirtNo)
          ? player.shirtNo
          : '',
      );
      setPosition(normalizePosition(player.position));
      setTargetOfficialId('');
    }
  }, [player]);

  // 名前の類似サジェスト (手動登録選手の名前と一致/部分一致するWhoScored公式選手)
  const suggestedOfficialPlayer = useMemo(() => {
    if (!isTemporaryPlayer || !player?.name) return null;
    const cleanPlayerName = player.name.trim().toLowerCase();
    return (
      availableOfficialPlayers.find((op) => {
        const opName = op.name.toLowerCase();
        return (
          opName === cleanPlayerName ||
          opName.includes(cleanPlayerName) ||
          cleanPlayerName.includes(opName)
        );
      }) || null
    );
  }, [isTemporaryPlayer, player?.name, availableOfficialPlayers]);

  if (!isOpen || !player) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('選手名を入力してください');
      return;
    }

    try {
      setIsSubmitting(true);
      const numericShirtNo =
        typeof shirtNo === 'number' && !isNaN(shirtNo) ? shirtNo : 99;

      await savePlayerMaster({
        playerId: player.playerId,
        name: name.trim(),
        defaultShirtNo: numericShirtNo,
        position,
        season: player.season,
        teamName: player.teamName || 'Chelsea',
        updatedAt: Date.now(),
      });

      await queryClient.invalidateQueries({
        queryKey: ['season-players', player.season],
      });
      await queryClient.invalidateQueries({ queryKey: playerKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['chelsea-squad'] });

      toast.success(`${name.trim()} の情報を更新しました`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新に失敗しました';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMerge = async () => {
    if (typeof targetOfficialId !== 'number' || targetOfficialId <= 0) {
      toast.error('紐付けるWhoScored選手IDを指定してください');
      return;
    }

    try {
      setIsMerging(true);
      const targetName =
        availableOfficialPlayers.find((p) => p.playerId === targetOfficialId)
          ?.name || `WhoScored ID: ${targetOfficialId}`;

      await mergePlayerId(
        player.playerId,
        targetOfficialId,
        player.season,
        player.teamName || 'Chelsea',
      );

      await queryClient.invalidateQueries({
        queryKey: ['season-players', player.season],
      });
      await queryClient.invalidateQueries({ queryKey: playerKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['chelsea-squad'] });

      toast.success(`${name} を ${targetName} に統合・紐付けました！`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '紐付けに失敗しました';
      toast.error(msg);
    } finally {
      setIsMerging(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5 text-slate-100 font-bold text-base">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>選手情報の編集</span>
                {isTemporaryPlayer ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px]"
                  >
                    手動登録 (仮ID)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-blue-600/10 border-blue-500/30 text-blue-400 text-[10px]"
                  >
                    WhoScored ID: {player.playerId}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-slate-400 font-normal block">
                Season {player.season} の登録情報を変更します
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

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Main Edit Form */}
          <form
            id="edit-player-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Player Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                選手名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: Cole Palmer"
                className="w-full h-10 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Shirt Number & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  背番号
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={shirtNo}
                  onChange={(e) =>
                    setShirtNo(
                      e.target.value === ''
                        ? ''
                        : Number.parseInt(e.target.value, 10),
                    )
                  }
                  placeholder="例: 20"
                  className="w-full h-10 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  ポジション
                </label>
                <select
                  value={position}
                  onChange={(e) =>
                    setPosition(e.target.value as StandardPosition)
                  }
                  className="w-full h-10 bg-slate-950/80 border border-slate-700 rounded-xl px-3 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  {POSITIONS.map((pos) => (
                    <option
                      key={pos.value}
                      value={pos.value}
                      className="bg-slate-900 text-slate-200"
                    >
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          {/* Link to WhoScored Section (Only for Temporary / Manual Players) */}
          {isTemporaryPlayer && (
            <div className="pt-5 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <LinkIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    WhoScored 選手ID と紐付ける
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    WhoScored公式データと紐付けると、手動登録した写真や情報を公式IDへ統合・引き継ぎます。
                  </p>
                </div>
              </div>

              {/* Suggestion Badge if Name Match Found */}
              {suggestedOfficialPlayer && (
                <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="text-xs">
                      <span className="text-slate-300 font-medium">
                        一致する選手候補:
                      </span>{' '}
                      <strong className="text-blue-300 font-bold">
                        {suggestedOfficialPlayer.name} (ID:{' '}
                        {suggestedOfficialPlayer.playerId})
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTargetOfficialId(suggestedOfficialPlayer.playerId)
                    }
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
                  >
                    選択
                  </button>
                </div>
              )}

              {/* Selection or Manual ID Input */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      WhoScored 登録選手から選択
                    </label>
                    <select
                      value={targetOfficialId}
                      onChange={(e) =>
                        setTargetOfficialId(
                          e.target.value === ''
                            ? ''
                            : Number.parseInt(e.target.value, 10),
                        )
                      }
                      className="w-full h-9 bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="">-- 選手を選択 --</option>
                      {availableOfficialPlayers.map((op) => (
                        <option key={op.playerId} value={op.playerId}>
                          #{op.shirtNo || '99'} {op.name} (ID: {op.playerId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      または WhoScored ID 直接入力
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetOfficialId}
                      onChange={(e) =>
                        setTargetOfficialId(
                          e.target.value === ''
                            ? ''
                            : Number.parseInt(e.target.value, 10),
                        )
                      }
                      placeholder="例: 345003"
                      className="w-full h-9 bg-slate-950/80 border border-slate-700 rounded-xl px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isMerging || !targetOfficialId}
                    onClick={handleMerge}
                    className="h-8 px-3 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 rounded-lg gap-1.5 transition-colors"
                  >
                    {isMerging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>WhoScored ID と統合・紐付ける</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <Button
            type="submit"
            form="edit-player-form"
            disabled={isSubmitting}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl gap-2 shadow-lg shadow-blue-600/25 flex items-center justify-center transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>保存する</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
