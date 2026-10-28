'use client';

import { ArrowRight, Link as LinkIcon, Loader2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { usePlayerMasterMutations } from '@/features/teams/hooks/use-player-master';

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

export function PlayerWhoScoredLinkSection({
  playerId,
  season,
  playerName,
  availableOfficialPlayers,
  onMergeSuccess,
  teamName = 'Chelsea',
}: PlayerWhoScoredLinkSectionProps) {
  const { mergePlayer } = usePlayerMasterMutations();
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

      await mergePlayer(playerId, targetOfficialId, season, teamName);

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
    <div className="pt-5 border-t border-white/[0.08] space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-accent-orange/10 text-accent-orange border border-accent-orange/20">
          <LinkIcon className="w-3.5 h-3.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">
            WhoScored 選手ID と紐付ける
          </h4>
          <p className="text-[11px] text-white/60">
            WhoScored公式データと紐付けると、手動登録した写真や情報を公式IDへ統合・引き継ぎます。
          </p>
        </div>
      </div>

      {suggestedOfficialPlayer && (
        <div className="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <Sparkles className="w-4 h-4 text-accent-orange shrink-0" />
            <span className="text-white/80 font-medium">一致する選手候補:</span>
            <strong className="text-white font-bold truncate">
              {suggestedOfficialPlayer.name} (ID:{' '}
              {suggestedOfficialPlayer.playerId})
            </strong>
          </div>
          <Button
            type="button"
            size="xs"
            variant="primary"
            onClick={() =>
              setTargetOfficialId(suggestedOfficialPlayer.playerId)
            }
            className="shrink-0"
          >
            選択
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="ws-official-select"
              className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1"
            >
              WhoScored 登録選手から選択
            </label>
            <NativeSelect
              id="ws-official-select"
              value={targetOfficialId}
              onChange={(e) => handleIdChange(e.target.value)}
            >
              <option value="">-- 選手を選択 --</option>
              {availableOfficialPlayers.map((op) => (
                <option key={op.playerId} value={op.playerId}>
                  #{op.shirtNo || '99'} {op.name} (ID: {op.playerId})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <label
              htmlFor="ws-manual-id"
              className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1"
            >
              または WhoScored ID 直接入力
            </label>
            <Input
              id="ws-manual-id"
              type="number"
              min="1"
              value={targetOfficialId}
              onChange={(e) => handleIdChange(e.target.value)}
              placeholder="例: 345003"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={isMerging || !targetOfficialId}
            onClick={handleMerge}
            size="sm"
            className="border-accent-orange/40 text-accent-orange hover:bg-accent-orange/10 gap-1.5"
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
}
