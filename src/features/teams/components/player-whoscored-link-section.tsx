'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Link as LinkIcon, Loader2, Sparkles } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { mergePlayerId } from '@/lib/db/queries';
import { playerKeys } from '@/lib/query-keys';

export interface OfficialPlayerOption {
  playerId: number;
  name: string;
  shirtNo?: number;
}

export interface PlayerWhoScoredLinkSectionProps {
  playerId: number;
  season: string;
  playerName: string;
  availableOfficialPlayers: OfficialPlayerOption[];
  onMergeSuccess: (targetOfficialId: number) => void;
  teamName?: string;
}

export const PlayerWhoScoredLinkSection: React.FC<
  PlayerWhoScoredLinkSectionProps
> = ({
  playerId,
  season,
  playerName,
  availableOfficialPlayers,
  onMergeSuccess,
  teamName = 'Chelsea',
}) => {
  const queryClient = useQueryClient();
  const [targetOfficialId, setTargetOfficialId] = useState<number | ''>('');
  const [isMerging, setIsMerging] = useState(false);

  const handleIdChange = (val: string) => {
    setTargetOfficialId(val === '' ? '' : Number.parseInt(val, 10));
  };

  const suggestedOfficialPlayer = useMemo(() => {
    if (!playerName.trim()) return null;
    const clean = playerName.trim().toLowerCase();
    return (
      availableOfficialPlayers.find((op) => {
        const name = op.name.toLowerCase();
        return name === clean || name.includes(clean) || clean.includes(name);
      }) || null
    );
  }, [playerName, availableOfficialPlayers]);

  const handleMerge = async () => {
    if (typeof targetOfficialId !== 'number' || targetOfficialId <= 0) {
      toast.error('紐付けるWhoScored選手IDを指定してください');
      return;
    }

    try {
      setIsMerging(true);
      const match = availableOfficialPlayers.find(
        (p) => p.playerId === targetOfficialId,
      );
      const targetName = match?.name || `WhoScored ID: ${targetOfficialId}`;

      await mergePlayerId(playerId, targetOfficialId, season, teamName);
      const keys = [
        ['season-players', season],
        playerKeys.all,
        ['chelsea-squad'],
        ['team-squad'],
      ];
      await Promise.all(
        keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );

      toast.success(`${playerName} を ${targetName} に統合・紐付けました！`);
      onMergeSuccess(targetOfficialId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '紐付けに失敗しました';
      toast.error(msg);
    } finally {
      setIsMerging(false);
    }
  };

  return (
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

      {suggestedOfficialPlayer && (
        <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              一致する選手候補:
            </span>
            <strong className="text-blue-300 font-bold truncate">
              {suggestedOfficialPlayer.name} (ID:{' '}
              {suggestedOfficialPlayer.playerId})
            </strong>
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

      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="ws-official-select"
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1"
            >
              WhoScored 登録選手から選択
            </label>
            <select
              id="ws-official-select"
              value={targetOfficialId}
              onChange={(e) => handleIdChange(e.target.value)}
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
            <label
              htmlFor="ws-manual-id"
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1"
            >
              または WhoScored ID 直接入力
            </label>
            <input
              id="ws-manual-id"
              type="number"
              min="1"
              value={targetOfficialId}
              onChange={(e) => handleIdChange(e.target.value)}
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
  );
};
